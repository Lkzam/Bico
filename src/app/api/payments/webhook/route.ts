import { createAdminClient } from '@/lib/supabase/admin'
import { calcFreelancerReceives } from '@/lib/efi'
import { NextResponse } from 'next/server'

// A Efí Bank envia um POST neste endpoint quando o PIX é pago
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const admin = createAdminClient()

    // Payload da Efí: { pix: [{ txid, valor, horario, ... }] }
    const pixList: any[] = body?.pix ?? []

    for (const pix of pixList) {
      const txid: string = pix.txid
      if (!txid) continue

      const { data: payment } = await admin
        .from('payments')
        .select('id, job_id, job_value, status')
        .eq('txid', txid)
        .single()

      if (!payment || payment.status === 'paid') continue

      const { data: job } = await admin
        .from('jobs')
        .select('id, freelancer_id, status')
        .eq('id', payment.job_id)
        .single()

      if (!job || job.status !== 'delivered') continue

      const freelancerAmount = calcFreelancerReceives(payment.job_value)

      // Busca saldo atual do freelancer
      const { data: freelancer } = await admin
        .from('profiles')
        .select('balance')
        .eq('id', job.freelancer_id)
        .single()

      const newBalance = (freelancer?.balance ?? 0) + freelancerAmount

      // Atualiza tudo atomicamente
      await Promise.all([
        admin.from('payments').update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          pix_end_to_end: pix.endToEndId ?? null,
        }).eq('id', payment.id),

        admin.from('jobs').update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        }).eq('id', job.id),

        admin.from('profiles').update({
          balance: newBalance,
        }).eq('id', job.freelancer_id),
      ])
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Webhook Efí erro:', err)
    // Retorna 200 para a Efí não retentar infinitamente
    return NextResponse.json({ ok: false })
  }
}

// A Efí também faz GET para validar o endpoint
export async function GET() {
  return NextResponse.json({ ok: true })
}
