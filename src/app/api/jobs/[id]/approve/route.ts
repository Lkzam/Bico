import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calcFreelancerReceives } from '@/lib/fees'
import { archiveAndCleanJob } from '@/lib/archiveJob'
import { NextResponse } from 'next/server'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('id, role').eq('user_id', user.id).single()
  if (!profile || profile.role !== 'company')
    return NextResponse.json({ error: 'Apenas empresas podem aprovar entregas.' }, { status: 403 })

  const { data: job } = await admin
    .from('jobs')
    .select('id, company_id, freelancer_id, value, status')
    .eq('id', jobId)
    .single()

  if (!job) return NextResponse.json({ error: 'Trabalho não encontrado.' }, { status: 404 })
  if (job.company_id !== profile.id) return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
  if (job.status !== 'payment_received')
    return NextResponse.json({ error: 'Este trabalho não está aguardando aprovação.' }, { status: 400 })

  const { data: payment } = await admin
    .from('payments')
    .select('id, job_value, status')
    .eq('job_id', jobId)
    .eq('status', 'paid_pending_approval')
    .single()

  if (!payment)
    return NextResponse.json({ error: 'Pagamento não encontrado ou já processado.' }, { status: 404 })

  const freelancerAmount = calcFreelancerReceives(payment.job_value)

  const { data: freelancer } = await admin
    .from('profiles').select('balance').eq('id', job.freelancer_id).single()

  const newBalance = (freelancer?.balance ?? 0) + freelancerAmount
  const now = new Date().toISOString()

  // ── 1. Credita freelancer + atualiza status ──────────────────────────────
  await Promise.all([
    admin.from('payments').update({
      status: 'paid',
      approved_at: now,
    }).eq('id', payment.id),

    admin.from('jobs').update({
      status: 'completed',
      completed_at: now,
    }).eq('id', jobId),

    admin.from('profiles').update({
      balance: newBalance,
    }).eq('id', job.freelancer_id),
  ])

  // ── 2. Arquiva + limpa, retorna archiveId para exibir review imediatamente ─
  let archiveId: string | null = null
  try {
    archiveId = await archiveAndCleanJob(jobId)
  } catch (err) {
    console.error(`[approve] Falha ao arquivar job ${jobId}:`, err)
  }

  return NextResponse.json({ ok: true, archiveId })
}
