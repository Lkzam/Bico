import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyAdminNewDispute } from '@/lib/email'
import { NextResponse } from 'next/server'

// POST /api/contracts/milestones/[id]/dispute
// Empresa contesta uma etapa ENTREGUE de um contrato. A etapa vai para
// arbitragem (admin) — o dinheiro dela continua retido em escrow.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: milestoneId } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('id, role').eq('user_id', user.id).single()
  if (!profile || profile.role !== 'company')
    return NextResponse.json({ error: 'Apenas empresas podem contestar etapas.' }, { status: 403 })

  let reason = ''
  try { const body = await req.json(); reason = (body?.reason ?? '').toString().trim().slice(0, 2000) } catch {}

  const { data: ms } = await admin
    .from('contract_milestones')
    .select('id, job_id, title, value, status')
    .eq('id', milestoneId).single()
  if (!ms) return NextResponse.json({ error: 'Etapa não encontrada.' }, { status: 404 })

  const { data: job } = await admin
    .from('jobs')
    .select('id, company_id, freelancer_id, title, company:profiles!jobs_company_id_fkey(name), freelancer:profiles!jobs_freelancer_id_fkey(name)')
    .eq('id', ms.job_id).single()
  if (!job) return NextResponse.json({ error: 'Contrato não encontrado.' }, { status: 404 })

  if (job.company_id !== profile.id)
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
  if (ms.status !== 'delivered')
    return NextResponse.json({ error: 'Só é possível contestar uma etapa entregue.' }, { status: 400 })

  const { error: updErr } = await admin
    .from('contract_milestones')
    .update({
      status:         'disputed',
      dispute_reason: reason || null,
      disputed_at:    new Date().toISOString(),
      updated_at:     new Date().toISOString(),
    })
    .eq('id', ms.id)
    .eq('status', 'delivered')

  if (updErr) {
    console.error('[milestones/dispute] update error:', updErr)
    return NextResponse.json({ error: 'Erro ao abrir contestação.' }, { status: 500 })
  }

  // Notifica admin por email (best-effort) e o freelancer (in-app).
  const company    = job.company    as { name?: string } | null
  const freelancer = job.freelancer as { name?: string } | null
  try {
    await notifyAdminNewDispute({
      jobId:          job.id,
      jobTitle:       `${job.title} — etapa: ${ms.title}`,
      jobValue:       Number(ms.value),
      companyName:    company?.name ?? 'Empresa',
      freelancerName: freelancer?.name ?? 'Freelancer',
      reason:         reason || null,
    })
  } catch (err) {
    console.error('[milestones/dispute] Falha ao notificar admin:', err)
  }

  try {
    await admin.from('notifications').insert({
      profile_id: job.freelancer_id,
      title:      'Etapa contestada',
      body:       `A empresa contestou a etapa "${ms.title}" do contrato "${job.title}". Nossa equipe vai analisar.`,
      metadata:   { job_id: job.id, milestone_id: ms.id },
    })
  } catch (err) {
    console.error('[milestones/dispute] notif error:', err)
  }

  return NextResponse.json({ ok: true })
}
