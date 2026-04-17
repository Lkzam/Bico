import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// A Efí Bank envia um POST neste endpoint quando o PIX é pago
export async function POST(req: Request) {
  // ── Validação de segurança ──────────────────────────────────────────────
  // O token é enviado como ?token=XXX na URL do webhook cadastrado na Efí Bank
  const { searchParams } = new URL(req.url)
  const webhookToken = process.env.EFIBANK_WEBHOOK_TOKEN

  if (webhookToken) {
    const receivedToken = searchParams.get('token')
    if (receivedToken !== webhookToken) {
      console.warn('[webhook] Token inválido recebido:', receivedToken)
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }
  }

  try {
    const body  = await req.json()
    const admin = createAdminClient()

    // Payload da Efí: { pix: [{ txid, valor, horario, endToEndId, ... }] }
    const pixList: any[] = body?.pix ?? []

    for (const pix of pixList) {
      const txid: string = pix.txid
      if (!txid) continue

      const { data: payment } = await admin
        .from('payments')
        .select('id, job_id, job_value, status')
        .eq('txid', txid)
        .single()

      if (!payment || payment.status !== 'pending') continue

      const { data: job } = await admin
        .from('jobs')
        .select('id, freelancer_id, status')
        .eq('id', payment.job_id)
        .single()

      if (!job || job.status !== 'delivered') continue

      // ✅ ESCROW: dinheiro fica retido — freelancer recebe apenas após aprovação da empresa
      const now = new Date().toISOString()
      await Promise.all([
        admin.from('payments').update({
          status:          'paid_pending_approval',
          paid_at:         now,
          pix_end_to_end:  pix.endToEndId ?? null,
        }).eq('id', payment.id),

        admin.from('jobs').update({
          status:               'payment_received',
          payment_received_at:  now,
        }).eq('id', job.id),
      ])

      console.log(`[webhook] PIX recebido. txid=${txid} job=${job.id}`)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[webhook] Erro:', err)
    // Retorna 200 para a Efí não retentar indefinidamente
    return NextResponse.json({ ok: false })
  }
}

// A Efí Bank faz GET para validar o endpoint antes de cadastrar
export async function GET() {
  return NextResponse.json({ ok: true })
}
