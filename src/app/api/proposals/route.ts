import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// POST /api/proposals
// body: { jobId, value, deadlineHours?, message? }
export async function POST(req: Request) {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { data: freelancer } = await supabase
    .from('profiles').select('id, role, name').eq('user_id', user.id).single()
  if (!freelancer || freelancer.role !== 'freelancer')
    return NextResponse.json({ error: 'Somente freelancers podem enviar propostas.' }, { status: 403 })

  // Exige CPF cadastrado (mesma trava do accept)
  const { data: priv } = await admin
    .from('account_private').select('cpf').eq('profile_id', freelancer.id).single()
  if (!priv?.cpf)
    return NextResponse.json(
      { error: 'Cadastre seu CPF para enviar propostas.', needsDocument: true },
      { status: 403 }
    )

  let body: any = {}
  try { body = await req.json() } catch {}
  const { jobId, value, deadlineHours, message } = body

  if (!jobId)  return NextResponse.json({ error: 'jobId obrigatório.' }, { status: 400 })

  const parsedValue = Number(value)
  if (!Number.isFinite(parsedValue) || parsedValue <= 0)
    return NextResponse.json({ error: 'Valor inválido.' }, { status: 400 })

  const parsedDeadline = deadlineHours == null || deadlineHours === ''
    ? null
    : Math.max(1, Math.floor(Number(deadlineHours)))
  if (parsedDeadline !== null && !Number.isFinite(parsedDeadline))
    return NextResponse.json({ error: 'Prazo inválido.' }, { status: 400 })

  const trimmedMsg = typeof message === 'string' ? message.trim().slice(0, 2000) : null

  // Carrega o job e valida (regras de negócio antes do RLS)
  const { data: job } = await admin
    .from('jobs')
    .select('id, company_id, freelancer_id, mode, status, title')
    .eq('id', jobId).single()

  if (!job)                                return NextResponse.json({ error: 'Trabalho não encontrado.' }, { status: 404 })
  if (job.mode !== 'proposal')             return NextResponse.json({ error: 'Este trabalho não aceita propostas.' }, { status: 400 })
  if (job.status !== 'open')               return NextResponse.json({ error: 'Este trabalho não está mais aberto.' }, { status: 409 })
  if (job.freelancer_id)                   return NextResponse.json({ error: 'Este trabalho já tem freelancer.' }, { status: 409 })
  if (job.company_id === freelancer.id)    return NextResponse.json({ error: 'Você não pode propor para o próprio trabalho.' }, { status: 400 })

  // Insere a proposta — o índice único parcial impede 2 pendentes
  const { error: insertError, data: created } = await admin
    .from('proposals')
    .insert({
      job_id:         job.id,
      freelancer_id:  freelancer.id,
      value:          parsedValue,
      deadline_hours: parsedDeadline,
      message:        trimmedMsg,
      status:         'pending',
    })
    .select('id').single()

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json(
        { error: 'Você já tem uma proposta pendente para este trabalho.' },
        { status: 409 }
      )
    }
    console.error('[proposals] insert error:', insertError)
    return NextResponse.json({ error: 'Erro ao enviar proposta.' }, { status: 500 })
  }

  // Notifica a empresa (best-effort)
  try {
    await admin.from('notifications').insert({
      profile_id: job.company_id,
      title:      'Nova proposta recebida',
      body:       `${freelancer.name} enviou uma proposta para "${job.title}".`,
      metadata:   { proposal_id: created?.id, job_id: job.id },
    })
  } catch (err) {
    console.error('[proposals] notif error:', err)
  }

  return NextResponse.json({ ok: true, proposalId: created?.id })
}
