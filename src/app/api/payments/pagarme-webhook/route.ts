import { createAdminClient } from '@/lib/supabase/admin'
import { secureCompare } from '@/lib/security'
import { parsePagarmeWebhook } from '@/lib/payments/pagarme'
import { settleConfirmedPayment } from '@/lib/payments/escrow'
import { NextResponse } from 'next/server'

// POST /api/payments/pagarme-webhook?token=XXX
// Confirma pagamentos de cartão que voltaram 'processing' (ou reprocessa).
// Protegido por token na URL (PAGARME_WEBHOOK_TOKEN), igual ao webhook Efí.
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url)
  const expected = process.env.PAGARME_WEBHOOK_TOKEN
  if (expected) {
    if (!secureCompare(searchParams.get('token') ?? '', expected)) {
      console.warn('[pagarme-webhook] token inválido')
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }
  }

  try {
    const admin = createAdminClient()
    const event = parsePagarmeWebhook(await req.json())

    // Só nos interessa cobrança paga.
    if (!event || event.status !== 'paid') {
      return NextResponse.json({ ok: true })
    }

    // Casamos pelo nosso `code` (gravado como txid no registro de pagamento).
    const ref = event.chargeCode
    if (!ref) return NextResponse.json({ ok: true })

    const { data: payment } = await admin
      .from('payments').select('id, job_id, status').eq('txid', ref).maybeSingle()
    if (!payment) {
      console.warn(`[pagarme-webhook] code desconhecido: ${ref}`)
      return NextResponse.json({ ok: true })
    }
    if (payment.status !== 'pending') {
      return NextResponse.json({ ok: true }) // já processado
    }

    const { data: job } = await admin
      .from('jobs').select('id, status').eq('id', payment.job_id).single()
    if (!job) return NextResponse.json({ ok: true })

    await settleConfirmedPayment({ paymentId: payment.id, jobId: job.id, jobStatus: job.status })
    console.log(`[pagarme-webhook] cartão confirmado. ref=${ref} job=${job.id}`)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[pagarme-webhook] erro:', err)
    return NextResponse.json({ ok: false })
  }
}

// Pagar.me pode fazer GET para validar o endpoint.
export async function GET() {
  return NextResponse.json({ ok: true })
}
