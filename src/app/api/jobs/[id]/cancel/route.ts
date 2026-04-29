import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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
    .from('profiles').select('id, role, name').eq('user_id', user.id).single()
  if (!profile || !['company', 'freelancer'].includes(profile.role))
    return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 403 })

  // Lê o motivo do cancelamento
  let cancelReason = ''
  try {
    const body = await req.json()
    cancelReason = (body.reason ?? '').trim()
  } catch { /* body vazio, sem motivo */ }

  // Busca o job
  const { data: job } = await admin
    .from('jobs')
    .select('id, title, status, company_id, freelancer_id, value')
    .eq('id', jobId)
    .single()

  if (!job) return NextResponse.json({ error: 'Trabalho não encontrado.' }, { status: 404 })

  // Verifica permissão
  if (profile.role === 'company' && job.company_id !== profile.id)
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
  if (profile.role === 'freelancer' && job.freelancer_id !== profile.id)
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })

  if (!['open', 'in_progress'].includes(job.status))
    return NextResponse.json({ error: 'Não é possível cancelar um trabalho já entregue ou concluído.' }, { status: 400 })

  // Quem cancela e quem será notificado
  const cancellerLabel  = profile.role === 'company' ? 'empresa' : 'freelancer'
  const notifyProfileId = profile.role === 'company' ? job.freelancer_id : job.company_id

  // Arquiva mensagens do chat (se existir)
  const { data: chat } = await admin
    .from('chats').select('id').eq('job_id', jobId).maybeSingle()

  let archivedMessages: any[] = []
  if (chat) {
    const { data: msgs } = await admin
      .from('messages')
      .select('id, sender_id, content, created_at')
      .eq('chat_id', chat.id)
      .order('created_at')
    archivedMessages = msgs ?? []
  }

  // Salva log do cancelamento com a conversa arquivada e o motivo
  await admin.from('cancelled_job_logs').insert({
    original_job_id:   jobId,
    job_title:         job.title,
    job_value:         job.value,
    company_id:        job.company_id,
    freelancer_id:     job.freelancer_id,
    cancelled_by:      profile.role,
    cancelled_by_name: profile.name,
    cancel_reason:     cancelReason || null,
    messages:          archivedMessages,
  })

  // Notifica o outro lado em tempo real
  if (notifyProfileId) {
    const notifBody = cancelReason
      ? `O trabalho "${job.title}" foi cancelado pelo ${cancellerLabel} ${profile.name}.`
      : `O trabalho "${job.title}" foi cancelado pelo ${cancellerLabel} ${profile.name}.`

    await admin.from('notifications').insert({
      profile_id: notifyProfileId,
      title:      'Trabalho cancelado',
      body:       notifBody,
      metadata:   {
        cancel_reason:      cancelReason || null,
        cancelled_by:       profile.role,
        cancelled_by_name:  profile.name,
        job_title:          job.title,
      },
    })
  }

  // Deleta o job — cascata remove job_tags, chats e messages automaticamente
  await admin.from('jobs').delete().eq('id', jobId)

  return NextResponse.json({ ok: true })
}
