import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { getPaymentGateway } from '@/lib/payments'
import { isValidPixKey } from '@/lib/security'
import { notifyAdminAlert } from '@/lib/email'

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

  // Débito ATÔMICO (função no Postgres: decrementa só se balance >= valor).
  // Previne duplo-saque e saldo negativo sem read-modify-write.
  const { data: debited, error: debitError } = await admin
    .rpc('withdraw_debit', { p_profile_id: profile.id, p_amount: parsedAmount })

  if (debitError) {
    return NextResponse.json({ error: 'Erro ao atualizar saldo. Tente novamente.' }, { status: 500 })
  }
  if (!debited) {
    return NextResponse.json({ error: 'Saldo insuficiente.' }, { status: 400 })
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
    // Reverte saldo se não conseguiu criar o registro (incremento atômico)
    await admin.rpc('credit_balance', { p_profile_id: profile.id, p_amount: parsedAmount })
    return NextResponse.json({ error: 'Erro ao registrar saque.' }, { status: 500 })
  }

  // Envia PIX via gateway (hoje Efí; amanhã, qualquer PSP que implementar a interface)
  const idEnvio = withdrawal.id.replace(/-/g, '').substring(0, 35)
  const gateway = getPaymentGateway({ method: 'pix' })
  const result = await gateway.sendPix({
    idEnvio,
    amount: parsedAmount,
    destinationKey: pixKey.trim(),
    description: 'Saque Bico',
  })

  if (result.ok) {
    await admin.from('withdrawals').update({
      status:       'completed',
      processed_at: new Date().toISOString(),
    }).eq('id', withdrawal.id)
    return NextResponse.json({ ok: true, message: 'Saque enviado com sucesso!' })
  }

  // Reverte tudo: saldo (RPC atômica) e marca saque como failed
  console.error('[withdraw] Erro ao enviar PIX:', result.error)
  await Promise.all([
    admin.rpc('credit_balance', { p_profile_id: profile.id, p_amount: parsedAmount }),
    admin.from('withdrawals').update({
      status:        'failed',
      error_message: result.error,
    }).eq('id', withdrawal.id),
  ])
  // Alerta operacional: payout falhando pode ser problema no PSP/saldo Efí.
  await notifyAdminAlert({
    event:   'withdraw_failed',
    message: `Saque PIX falhou e foi revertido. O freelancer pode estar sem conseguir sacar.`,
    context: { withdrawalId: withdrawal.id, profileId: profile.id, amount: parsedAmount, error: result.error },
  })
  return NextResponse.json({ error: result.error }, { status: 500 })
}
