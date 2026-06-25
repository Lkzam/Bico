import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// POST /api/jobs/[id]/deliver
// Freelancer entrega um job (rápido/proposta). O upload do arquivo já foi feito
// no Storage pelo client; aqui registramos o path + nota e marcamos 'delivered'.
// Movido pra cá (era update direto no client) para travar o update de jobs por
// coluna — assim ninguém adultera value/freelancer_id/status via PostgREST.
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
  if (!profile || profile.role !== 'freelancer')
    return NextResponse.json({ error: 'Apenas freelancers entregam trabalhos.' }, { status: 403 })

  let body: { deliveryUrl?: unknown; deliveryNote?: unknown } = {}
  try { body = await req.json() } catch {}
  const deliveryUrl  = typeof body.deliveryUrl === 'string' ? body.deliveryUrl.trim() : ''
  const deliveryNote = typeof body.deliveryNote === 'string' ? body.deliveryNote.trim().slice(0, 2000) : null
  if (!deliveryUrl)
    return NextResponse.json({ error: 'Arquivo da entrega ausente.' }, { status: 400 })

  const { data: job } = await admin
    .from('jobs').select('id, freelancer_id, status, mode').eq('id', jobId).single()
  if (!job) return NextResponse.json({ error: 'Trabalho não encontrado.' }, { status: 404 })
  if (job.freelancer_id !== profile.id)
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
  if (job.mode === 'contract')
    return NextResponse.json({ error: 'Contrato é entregue por etapa.' }, { status: 400 })
  if (job.status !== 'in_progress')
    return NextResponse.json({ error: 'Este trabalho não está em andamento.' }, { status: 400 })

  const { error: updErr } = await admin
    .from('jobs')
    .update({
      status:        'delivered',
      delivery_url:  deliveryUrl,
      delivery_note: deliveryNote,
      delivered_at:  new Date().toISOString(),
    })
    .eq('id', job.id)
    .eq('status', 'in_progress')  // idempotência contra duplo-clique

  if (updErr) {
    console.error('[jobs/deliver] update error:', updErr)
    return NextResponse.json({ error: 'Erro ao registrar entrega.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
