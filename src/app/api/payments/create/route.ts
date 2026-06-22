import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPaymentGateway } from '@/lib/payments'
import { calcCompanyTotal } from '@/lib/fees'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { jobId } = await req.json()
  if (!jobId) return NextResponse.json({ error: 'jobId obrigatório.' }, { status: 400 })

  const { data: profile } = await supabase
    .from('profiles').select('id, role, name').eq('user_id', user.id).single()
  if (!profile || profile.role !== 'company')
    return NextResponse.json({ error: 'Apenas empresas podem pagar.' }, { status: 403 })

  const { data: job } = await admin
    .from('jobs').select('id, value, status, company_id, title, mode').eq('id', jobId).single()

  if (!job) return NextResponse.json({ error: 'Trabalho não encontrado.' }, { status: 404 })
  if (job.company_id !== profile.id)
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })

  // Dois momentos de pagamento permitidos:
  //  - job comum/proposal: status 'delivered' (paga depois da entrega)
  //  - contrato: status 'awaiting_payment' (paga o total upfront, libera por etapa)
  const isContractUpfront = job.mode === 'contract' && job.status === 'awaiting_payment'
  if (job.status !== 'delivered' && !isContractUpfront)
    return NextResponse.json({ error: 'Pagamento não disponível para este trabalho agora.' }, { status: 400 })

  // Verifica se já existe cobrança pendente e AINDA VÁLIDA para esse job.
  // A cobrança Efí expira em 1h (expiracao: 3600). Servir um QR já expirado faz
  // o banco do cliente recusar com "QR code falhou". Por isso só reutilizamos se
  // ainda estiver dentro da validade; caso contrário, geramos uma nova.
  const { data: existingPayment } = await admin
    .from('payments')
    .select('id, txid, qrcode, qrcode_image, total_value, created_at')
    .eq('job_id', jobId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const CHARGE_TTL_MS    = 3600 * 1000     // expiração da cobrança = 1h
  const SAFETY_BUFFER_MS = 5 * 60 * 1000   // margem de 5 min antes de expirar
  const isStillValid =
    !!existingPayment?.created_at &&
    Date.now() - new Date(existingPayment.created_at).getTime() < CHARGE_TTL_MS - SAFETY_BUFFER_MS

  if (existingPayment && isStillValid) {
    return NextResponse.json({
      txid: existingPayment.txid,
      qrcode: existingPayment.qrcode,
      imagemQrcode: existingPayment.qrcode_image,
      valor: existingPayment.total_value,
    })
  }

  // Cobrança antiga expirada: marca como expirada para não ser reutilizada
  // (ignora erro caso o status 'expired' não exista no CHECK — o fluxo segue)
  if (existingPayment && !isStillValid) {
    await admin.from('payments').update({ status: 'expired' }).eq('id', existingPayment.id)
  }

  try {
    // Gera txid único: base do jobId + sufixo aleatório (máx 35 chars, alfanumérico)
    const base = job.id.replace(/-/g, '').substring(0, 26)
    const suffix = Math.random().toString(36).substring(2, 10)
    const txid = (base + suffix).substring(0, 35)

    // Regra de negócio (taxa) é responsabilidade desta camada — gateway só cobra.
    const totalValue = calcCompanyTotal(job.value)

    const gateway = getPaymentGateway({ method: 'pix' })
    const charge = await gateway.createPixCharge({
      txid,
      amount: totalValue,
      metadata: { jobId: job.id, companyName: profile.name },
    })

    // Salva a cobrança no banco
    const { error: insertError } = await admin.from('payments').insert({
      job_id: job.id,
      txid: charge.txid,
      status: 'pending',
      job_value: job.value,
      total_value: charge.amount,
      qrcode: charge.qrcode,
      qrcode_image: charge.qrcodeImage,
      amount: charge.amount,
      fee: 0,
      freelancer_amount: 0,
    })

    if (insertError) {
      console.error('[payments/create] Erro ao salvar payment:', insertError)
      return NextResponse.json(
        { error: 'Erro ao salvar cobrança no banco.' },
        { status: 500 }
      )
    }

    // Resposta compatível com o cliente atual (qrcode/imagemQrcode/valor)
    return NextResponse.json({
      txid: charge.txid,
      qrcode: charge.qrcode,
      imagemQrcode: charge.qrcodeImage,
      valor: charge.amount,
    })
  } catch (err: any) {
    console.error('[payments/create] Erro ao criar cobrança:', err?.response?.data ?? err.message)
    return NextResponse.json(
      { error: 'Erro ao gerar cobrança PIX. Tente novamente.' },
      { status: 500 }
    )
  }
}
