import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { getAccessToken, getHttpsAgent } from '@/lib/efi'
import axios from 'axios'

const SANDBOX  = process.env.EFIBANK_SANDBOX === 'true'
const BASE_URL = SANDBOX ? 'https://pix-h.api.efipay.com.br' : 'https://pix.api.efipay.com.br'

export async function POST(req: Request) {
  const supabase = await createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('id, role, balance, pix_key').eq('user_id', user.id).single()

  if (!profile || profile.role !== 'freelancer')
    return NextResponse.json({ error: 'Apenas freelancers podem sacar.' }, { status: 403 })

  const body = await req.json()
  const { amount, pixKey } = body

  if (!amount || isNaN(amount) || amount <= 0)
    return NextResponse.json({ error: 'Valor inválido.' }, { status: 400 })
  if (!pixKey?.trim())
    return NextResponse.json({ error: 'Chave PIX obrigatória.' }, { status: 400 })

  const balance = profile.balance ?? 0
  if (amount > balance)
    return NextResponse.json({ error: 'Saldo insuficiente.' }, { status: 400 })

  // Salva chave PIX no perfil se informada
  if (pixKey !== profile.pix_key) {
    await admin.from('profiles').update({ pix_key: pixKey }).eq('id', profile.id)
  }

  // Deduz saldo do freelancer ANTES de enviar (previne duplo saque)
  const { error: balanceError } = await admin
    .from('profiles')
    .update({ balance: balance - amount })
    .eq('id', profile.id)
    .eq('balance', balance) // optimistic lock

  if (balanceError) {
    return NextResponse.json({ error: 'Erro ao atualizar saldo. Tente novamente.' }, { status: 500 })
  }

  // Cria registro de saque como processing
  const { data: withdrawal, error: wError } = await admin
    .from('withdrawals')
    .insert({
      freelancer_id: profile.id,
      amount,
      pix_key: pixKey,
      status: 'processing',
    })
    .select('id')
    .single()

  if (wError || !withdrawal) {
    // Reverte saldo se não conseguiu criar o registro
    await admin.from('profiles').update({ balance: balance }).eq('id', profile.id)
    return NextResponse.json({ error: 'Erro ao registrar saque.' }, { status: 500 })
  }

  // Envia PIX via Efí Bank
  try {
    const token = await getAccessToken()
    const agent = getHttpsAgent()

    // txid único para o saque (máx 35 chars, apenas alfanumérico)
    const txid = withdrawal.id.replace(/-/g, '').substring(0, 35)

    // Normaliza chave PIX de telefone: adiciona +55 se necessário
    let chave = pixKey.trim()
    const isPhone = /^(\+?55)?(\d{10,11})$/.test(chave.replace(/\D/g, ''))
    if (isPhone) {
      const digits = chave.replace(/\D/g, '')
      chave = digits.startsWith('55') ? `+${digits}` : `+55${digits}`
    }

    const pixBody = {
      valor:          parseFloat(Number(amount).toFixed(2)),
      chave,
      infoAdicionais: [] as any[],
    }

    console.log('[withdraw] Enviando PIX:', JSON.stringify(pixBody))

    const { data: pixRes } = await axios.put(
      `${BASE_URL}/v2/gn/pix/${txid}`,
      pixBody,
      {
        headers: {
          Authorization:  `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        httpsAgent: agent,
      }
    )

    console.log('[withdraw] PIX enviado:', pixRes)

    // Atualiza saque como concluído
    await admin.from('withdrawals').update({
      status:       'completed',
      processed_at: new Date().toISOString(),
    }).eq('id', withdrawal.id)

    return NextResponse.json({ ok: true, message: 'Saque enviado com sucesso!' })

  } catch (err: any) {
    const efiError = err?.response?.data
    console.error('[withdraw] Erro ao enviar PIX:', efiError ?? err.message)

    // Reverte tudo: saldo e status do saque
    await Promise.all([
      admin.from('profiles').update({ balance }).eq('id', profile.id),
      admin.from('withdrawals').update({
        status:        'failed',
        error_message: JSON.stringify(efiError ?? err.message),
      }).eq('id', withdrawal.id),
    ])

    const msg = efiError?.mensagem ?? efiError?.message ?? 'Erro ao enviar PIX. Tente novamente.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
