import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyAdminNewDispute } from '@/lib/email'
import { buildDisputeBundle } from '@/lib/disputeBundle'
import { NextResponse } from 'next/server'

export async function POST(
  req: Request,
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
    return NextResponse.json({ error: 'Apenas empresas podem contestar entregas.' }, { status: 403 })

  const { data: job } = await admin
    .from('jobs')
    .select(`
      id, company_id, freelancer_id, status, title, value,
      company:profiles!jobs_company_id_fkey(name),
      freelancer:profiles!jobs_freelancer_id_fkey(name)
    `)
    .eq('id', jobId)
    .single()

  if (!job) return NextResponse.json({ error: 'Trabalho não encontrado.' }, { status: 404 })
  if (job.company_id !== profile.id) return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
  if (job.status !== 'payment_received')
    return NextResponse.json({ error: 'Este trabalho não está aguardando aprovação.' }, { status: 400 })

  // Busca motivo da contestação (opcional)
  let reason = ''
  try {
    const body = await req.json()
    reason = body?.reason ?? ''
  } catch (_) {}

  await Promise.all([
    admin.from('payments').update({
      status: 'disputed',
    }).eq('job_id', jobId).eq('status', 'paid_pending_approval'),

    admin.from('jobs').update({
      status: 'disputed',
      dispute_reason: reason || null,
      disputed_at: new Date().toISOString(),
    }).eq('id', jobId),
  ])

  // Notifica admin por email (best-effort; falha não bloqueia a disputa).
  // Anexa um ZIP com o log do chat + arquivos trocados, e inclui nome + ID
  // de empresa e freelancer.
  const company    = job.company    as { name?: string } | null
  const freelancer = job.freelancer as { name?: string } | null
  try {
    let bundle = null
    try {
      const b = await buildDisputeBundle(job.id)
      if (b.zip) bundle = { zip: b.zip, messageCount: b.messageCount, fileCount: b.fileCount }
    } catch (bundleErr) {
      console.error('[dispute] Falha ao montar ZIP do chat:', bundleErr)
    }

    await notifyAdminNewDispute({
      jobId:          job.id,
      jobTitle:       job.title,
      jobValue:       Number(job.value),
      companyName:    company?.name ?? 'Empresa',
      companyId:      job.company_id,
      freelancerName: freelancer?.name ?? 'Freelancer',
      freelancerId:   job.freelancer_id ?? '—',
      reason:         reason || null,
      bundle,
    })
  } catch (err) {
    console.error('[dispute] Falha ao notificar admin por email:', err)
  }

  return NextResponse.json({ ok: true })
}
