import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// POST /api/contracts/milestones/[id]/deliver
// Freelancer entrega uma etapa do contrato. O upload do arquivo já foi feito no
// Storage pelo cliente; aqui só registramos o path + nota e marcamos 'delivered'.
// (contract_milestones não tem policy de UPDATE -> precisa do admin client.)
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
    .from('profiles').select('id, role, name').eq('user_id', user.id).single()
  if (!profile || profile.role !== 'freelancer')
    return NextResponse.json({ error: 'Apenas freelancers entregam etapas.' }, { status: 403 })

  let body: any = {}
  try { body = await req.json() } catch {}
  const deliveryUrl  = typeof body.deliveryUrl === 'string' ? body.deliveryUrl.trim() : ''
  const deliveryNote = typeof body.deliveryNote === 'string' ? body.deliveryNote.trim().slice(0, 2000) : null
  if (!deliveryUrl)
    return NextResponse.json({ error: 'Arquivo da entrega ausente.' }, { status: 400 })

  // Carrega a etapa + job.
  const { data: ms } = await admin
    .from('contract_milestones')
    .select('id, job_id, title, status')
    .eq('id', milestoneId).single()
  if (!ms) return NextResponse.json({ error: 'Etapa não encontrada.' }, { status: 404 })

  const { data: job } = await admin
    .from('jobs')
    .select('id, company_id, freelancer_id, mode, status, title')
    .eq('id', ms.job_id).single()
  if (!job) return NextResponse.json({ error: 'Contrato não encontrado.' }, { status: 404 })

  if (job.freelancer_id !== profile.id)
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
  if (job.mode !== 'contract' || job.status !== 'in_progress')
    return NextResponse.json({ error: 'Contrato não está em andamento.' }, { status: 400 })
  if (ms.status !== 'in_progress')
    return NextResponse.json({ error: 'Esta etapa não está ativa para entrega.' }, { status: 400 })

  const { error: updErr } = await admin
    .from('contract_milestones')
    .update({
      status:        'delivered',
      delivery_url:  deliveryUrl,
      delivery_note: deliveryNote,
      delivered_at:  new Date().toISOString(),
      updated_at:    new Date().toISOString(),
    })
    .eq('id', ms.id)
    .eq('status', 'in_progress')  // idempotência contra duplo-clique

  if (updErr) {
    console.error('[milestones/deliver] update error:', updErr)
    return NextResponse.json({ error: 'Erro ao registrar entrega.' }, { status: 500 })
  }

  // Notifica a empresa.
  try {
    await admin.from('notifications').insert({
      profile_id: job.company_id,
      title:      'Etapa entregue',
      body:       `${profile.name} entregou a etapa "${ms.title}" do contrato "${job.title}". Revise e aprove para liberar o pagamento.`,
      metadata:   { job_id: job.id, milestone_id: ms.id },
    })
  } catch (err) {
    console.error('[milestones/deliver] notif error:', err)
  }

  return NextResponse.json({ ok: true })
}
