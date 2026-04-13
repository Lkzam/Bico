import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

  const { data: freelancer } = await supabase
    .from('profiles').select('id, role').eq('user_id', user.id).single()
  if (!freelancer || freelancer.role !== 'freelancer')
    return NextResponse.json({ error: 'Somente freelancers podem aceitar trabalhos.' }, { status: 403 })

  // Fetch job
  const { data: job, error: jobError } = await admin
    .from('jobs').select('*').eq('id', jobId).single()

  if (jobError || !job)
    return NextResponse.json({ error: 'Trabalho não encontrado.' }, { status: 404 })

  if (job.status !== 'open' || job.freelancer_id !== null)
    return NextResponse.json({ error: 'Este trabalho já foi aceito por outro freelancer.' }, { status: 409 })

  // Lock the job (atomic update with conditions)
  const { error: updateError, count } = await admin
    .from('jobs')
    .update({ status: 'in_progress', freelancer_id: freelancer.id })
    .eq('id', jobId)
    .eq('status', 'open')
    .is('freelancer_id', null)

  if (updateError)
    return NextResponse.json({ error: 'Erro ao aceitar trabalho: ' + updateError.message }, { status: 500 })

  // Check if a chat already exists for this job (e.g. retry after partial failure)
  const { data: existingChat } = await admin
    .from('chats').select('id').eq('job_id', jobId).maybeSingle()

  if (existingChat) {
    return NextResponse.json({ success: true, chatId: existingChat.id })
  }

  // Create chat
  const { data: chat, error: chatError } = await admin
    .from('chats')
    .insert({
      job_id: jobId,
      company_id: job.company_id,
      freelancer_id: freelancer.id,
    })
    .select()
    .single()

  if (chatError)
    return NextResponse.json({ error: 'Erro ao criar chat: ' + chatError.message }, { status: 500 })

  return NextResponse.json({ success: true, chatId: chat.id })
}
