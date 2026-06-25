import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calcCompanyTotal } from '@/lib/fees'
import { isPagarmeConfigured, chargeCard } from '@/lib/payments/pagarme'
import { settleConfirmedPayment } from '@/lib/payments/escrow'
import { NextResponse } from 'next/server'

// POST /api/payments/card
// body: { jobId, cardToken, installments? }
// Cartão é ENTRADA. Em sucesso, aplica o MESMO efeito de escrow do PIX confirmado.
export async function POST(req: Request) {
  const supabase = await createClient()
  const admin = createAdminClient()

  if (!isPagarmeConfigured())
    return NextResponse.json({ error: 'Pagamento por cartão indisponível no momento.' }, { status: 503 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  let body: { jobId?: unknown; cardToken?: unknown; installments?: unknown } = {}
  try { body = await req.json() } catch {}
  const jobId     = typeof body.jobId === 'string' ? body.jobId : ''
  const cardToken = typeof body.cardToken === 'string' ? body.cardToken : ''
  // Teto de parcelas (L2): entre 1 e 12, evita valor absurdo vindo do client.
  const installments = Math.min(12, Math.max(1, Math.floor(Number(body.installments) || 1)))
  if (!jobId)     return NextResponse.json({ error: 'jobId obrigatório.' }, { status: 400 })
  if (!cardToken) return NextResponse.json({ error: 'Cartão inválido.' }, { status: 400 })

  const { data: profile } = await supabase
    .from('profiles').select('id, role, name').eq('user_id', user.id).single()
  if (!profile || profile.role !== 'company')
    return NextResponse.json({ error: 'Apenas empresas podem pagar.' }, { status: 403 })

  const { data: job } = await admin
    .from('jobs').select('id, value, status, company_id, title, mode').eq('id', jobId).single()
  if (!job) return NextResponse.json({ error: 'Trabalho não encontrado.' }, { status: 404 })
  if (job.company_id !== profile.id)
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })

  const isContractUpfront = job.mode === 'contract' && job.status === 'awaiting_payment'
  if (job.status !== 'delivered' && !isContractUpfront)
    return NextResponse.json({ error: 'Pagamento não disponível para este trabalho agora.' }, { status: 400 })

  // Documento da empresa (obrigatório no cadastro) — exigido pela Pagar.me.
  const { data: priv } = await admin
    .from('account_private').select('cpf, cnpj').eq('profile_id', profile.id).single()
  const cnpj = priv?.cnpj?.replace(/\D/g, '')
  const cpf  = priv?.cpf?.replace(/\D/g, '')
  const document = cnpj || cpf
  if (!document)
    return NextResponse.json({ error: 'Cadastre seu CPF/CNPJ antes de pagar com cartão.', needsDocument: true }, { status: 403 })

  const totalValue = calcCompanyTotal(job.value)

  // Referência única (também serve de txid no nosso registro).
  const base = job.id.replace(/-/g, '').substring(0, 26)
  const reference = (base + Math.random().toString(36).substring(2, 10)).substring(0, 40)

  // Registra a tentativa como pending (settle confirma; falha remove).
  const { data: payment, error: insErr } = await admin
    .from('payments')
    .insert({
      job_id: job.id, txid: reference, status: 'pending',
      job_value: job.value, total_value: totalValue, amount: totalValue,
      fee: 0, freelancer_amount: 0,
    })
    .select('id').single()
  if (insErr || !payment) {
    console.error('[payments/card] insert error:', insErr)
    return NextResponse.json({ error: 'Erro ao registrar pagamento.' }, { status: 500 })
  }

  const charge = await chargeCard({
    amount:    totalValue,
    cardToken,
    reference,
    installments,
    customer: {
      name:         profile.name ?? 'Empresa',
      email:        user.email ?? 'sem-email@bico.app',
      document,
      documentType: cnpj ? 'cnpj' : 'cpf',
    },
    metadata: { job_id: job.id },
  })

  if (charge.status === 'failed') {
    // Não capturou — remove a tentativa para não ficar pendente fantasma.
    await admin.from('payments').delete().eq('id', payment.id).eq('status', 'pending')
    return NextResponse.json(
      { error: charge.message ?? 'Cartão recusado. Tente outro cartão.' },
      { status: 402 }
    )
  }

  if (charge.status === 'paid') {
    await settleConfirmedPayment({ paymentId: payment.id, jobId: job.id, jobStatus: job.status })
    return NextResponse.json({ ok: true, status: 'paid', contract: isContractUpfront })
  }

  // processing — confirmação assíncrona chega pelo webhook do Pagar.me.
  return NextResponse.json({ ok: true, status: 'processing' })
}
