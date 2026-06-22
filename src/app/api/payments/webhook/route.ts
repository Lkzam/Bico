import { createAdminClient } from '@/lib/supabase/admin'
import { secureCompare } from '@/lib/security'
import { getPaymentGateway } from '@/lib/payments'
import { NextResponse } from 'next/server'

// O PSP envia um POST neste endpoint quando o PIX é pago.
export async function POST(req: Request) {
  // ── Validação de segurança ──────────────────────────────────────────────
  // O token é enviado como ?token=XXX na URL do webhook cadastrado no PSP.
  const { searchParams } = new URL(req.url)
  const webhookToken = process.env.EFIBANK_WEBHOOK_TOKEN

  if (webhookToken) {
    const receivedToken = searchParams.get('token') ?? ''
    if (!secureCompare(receivedToken, webhookToken)) {
      // Não loga o token recebido — pode vazar tokens parcialmente válidos em logs
      console.warn('[webhook] Token inválido recebido')
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }
  }

  try {
    const body    = await req.json()
    const admin   = createAdminClient()
    const gateway = getPaymentGateway({ method: 'pix' })

    // Cada PSP tem seu próprio formato — o gateway normaliza.
    const events = gateway.parseWebhookEvents(body)

    for (const event of events) {
      const { data: payment } = await admin
        .from('payments')
        .select('id, job_id, job_value, status')
        .eq('txid', event.txid)
        .single()

      if (!payment) {
        console.warn(`[webhook] PIX recebido para txid desconhecido: ${event.txid}`)
        continue
      }
      if (payment.status !== 'pending') {
        console.warn(`[webhook] txid=${event.txid} já processado (status=${payment.status}) — ignorando duplicata`)
        continue
      }

      const { data: job } = await admin
        .from('jobs')
        .select('id, freelancer_id, status')
        .eq('id', payment.job_id)
        .single()

      // Dois fluxos pagam via PIX:
      //  - 'delivered'        → job comum/proposal (pago após a entrega)
      //  - 'awaiting_payment' → contrato (total upfront, libera por etapa)
      if (!job || (job.status !== 'delivered' && job.status !== 'awaiting_payment')) {
        console.warn(`[webhook] txid=${event.txid}: job ${payment.job_id} em estado inesperado (${job?.status ?? 'inexistente'})`)
        continue
      }

      // ✅ ESCROW: dinheiro fica retido — freelancer recebe apenas após aprovação.
      const now = new Date().toISOString()
      // Update condicionado ao status atual → idempotente contra retries do PSP.
      await admin.from('payments').update({
        status:          'paid_pending_approval',
        paid_at:         now,
        pix_end_to_end:  event.endToEndId,
      }).eq('id', payment.id).eq('status', 'pending')

      if (job.status === 'delivered') {
        await admin.from('jobs').update({
          status:               'payment_received',
          payment_received_at:  now,
        }).eq('id', job.id).eq('status', 'delivered')
      } else {
        // Contrato: avança para in_progress, cria chat e inicia a 1ª etapa (atômico).
        await admin.rpc('fund_contract', { p_job_id: job.id })
      }

      console.log(`[webhook] PIX recebido. txid=${event.txid} job=${job.id} (${job.status})`)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[webhook] Erro:', err)
    // Retorna 200 para o PSP não retentar indefinidamente
    return NextResponse.json({ ok: false })
  }
}

// O PSP faz GET para validar o endpoint antes de cadastrar
export async function GET() {
  return NextResponse.json({ ok: true })
}
