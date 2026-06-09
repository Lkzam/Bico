import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { getAccessToken, getHttpsAgent } from '@/lib/efi'
import { isValidPixKey } from '@/lib/security'
import axios from 'axios'

const SANDBOX  = process.env.EFIBANK_SANDBOX === 'true'
const BASE_URL = SANDBOX ? 'https://pix-h.api.efipay.com.br' : 'https://pix.api.efipay.com.br'

export async function POST(req: Request) {
  const supabase = await createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('id, role').eq('user_id', user.id).single()

  if (!profile || profile.role !== 'freelancer')
    return NextResponse.json({ error: 'Apenas freelancers podem sacar.' }, { status: 403 })

  // Saldo e chave PIX agora vivem em account_private (dados sensíveis, RLS owner-only)
  const { data: priv } = await admin
    .from('account_private').select('balance, pix_key').eq('profile_id', profile.id).single()

  const body = await req.json()
  const { amount, pixKey } = body

  const parsedAmount = parseFloat(amount)
  if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0)
    return NextResponse.json({ error: 'Valor inválido.' }, { status: 400 })
  if (!pixKey?.trim())
    return NextResponse.json({ error: 'Chave PIX obrigatória.' }, { status: 400 })
  if (!isValidPixKey(pixKey))
    return NextResponse.json({ error: 'Chave PIX inválida. Informe CPF, CNPJ, telefone, e-mail ou chave aleatória.' }, { status: 400 })

  const balance = priv?.balance ?? 0
  if (parsedAmount > balance)
    return NextResponse.json({ error: 'Saldo insuficiente.' }, { status: 400 })

  // Salva chave PIX se informada (em account_private)
  if (pixKey !== priv?.pix_key) {
    await admin.from('account_private').update({ pix_key: pixKey }).eq('profile_id', profile.id)
  }

  // Deduz saldo do freelancer ANTES de enviar (previne duplo saque)
  const { error: balanceError } = await admin
    .from('account_private')
    .update({ balance: balance - parsedAmount })
    .eq('profile_id', profile.id)
    .eq('balance', balance) // optimistic lock

  if (balanceError) {
    return NextResponse.json({ error: 'Erro ao atualizar saldo. Tente novamente.' }, { status: 500 })
  }

  // Cria registro de saque como processing
  const { data: withdrawal, error: wError } = await admin
    .from('withdrawals')
    .insert({
      freelancer_id: profile.id,
      amount: parsedAmount,
      pix_key: pixKey,
      status: 'processing',
    })
    .select('id')
    .single()

  if (wError || !withdrawal) {
    // Reverte saldo se não conseguiu criar o registro
    await admin.from('account_private').update({ balance: balance }).eq('profile_id', profile.id)
    return NextResponse.json({ error: 'Erro ao registrar saque.' }, { status: 500 })
  }

  // Envia PIX via Efí Bank
  try {
    const token = await getAccessToken()
    const agent = getHttpsAgent()

    // txid único para o saque (máx 35 chars, apenas alfanumérico)
    const txid = withdrawal.id.replace(/-/g, '').substring(0, 35)

    // Usa a chave PIX exatamente como o usuário informou
    const chave = pixKey.trim()

    // Efí Bank v3: valor como string, pagador = sua chave PIX, favorecido = chave do freelancer
    const pixBody = {
      valor:    parsedAmount.toFixed(2),
      pagador:  {
        chave:        process.env.EFIBANK_PIX_KEY!,
        infoPagador:  'Saque Bico',
      },
      favorecido: {
        chave,
      },
    }

    // Não loga pixBody — contém a chave PIX da plataforma (dado sensível)
    const { data: pixRes } = await axios.put(
      `${BASE_URL}/v3/gn/pix/${txid}`,
      pixBody,
      {
        headers: {
          Authorization:  `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        httpsAgent: agent,
      }
    )

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
      admin.from('account_private').update({ balance }).eq('profile_id', profile.id), // reverte para balance original
      admin.from('withdrawals').update({
        status:        'failed',
        error_message: JSON.stringify(efiError ?? err.message),
      }).eq('id', withdrawal.id),
    ])

    const msg = efiError?.mensagem ?? efiError?.message ?? 'Erro ao enviar PIX. Tente novamente.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
