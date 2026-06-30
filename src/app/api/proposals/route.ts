import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { parseBody, uuid } from '@/lib/validation'
import { z } from 'zod'

// Esquema leniente: trava o jobId (uuid) e o tamanho da mensagem; valor, prazo e
// milestones seguem na lógica de negócio abaixo (que tolera linhas incompletas
// do editor sem rejeitar a proposta inteira).
const proposalSchema = z.object({
  jobId: uuid,
  value: z.unknown().optional(),
  deadlineHours: z.unknown().optional(),
  message: z.string().max(2000).nullish(),
  proposedMilestones: z.array(z.unknown()).optional(),
})

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

  const { data: input, error: badInput } = await parseBody(req, proposalSchema)
  if (badInput) return badInput
  const { jobId, value, deadlineHours, message, proposedMilestones } = input

  const trimmedMsg = typeof message === 'string' ? message.trim().slice(0, 2000) : null

  // Carrega o job e valida (regras de negócio antes do RLS)
  const { data: job } = await admin
    .from('jobs')
    .select('id, company_id, freelancer_id, mode, status, title')
    .eq('id', jobId).single()

  if (!job)                                return NextResponse.json({ error: 'Trabalho não encontrado.' }, { status: 404 })
  if (job.mode !== 'proposal' && job.mode !== 'contract')
                                           return NextResponse.json({ error: 'Este trabalho não aceita propostas.' }, { status: 400 })
  if (job.status !== 'open')               return NextResponse.json({ error: 'Este trabalho não está mais aberto.' }, { status: 409 })
  if (job.freelancer_id)                   return NextResponse.json({ error: 'Este trabalho já tem freelancer.' }, { status: 409 })
  if (job.company_id === freelancer.id)    return NextResponse.json({ error: 'Você não pode propor para o próprio trabalho.' }, { status: 400 })

  // ── Valor e milestones dependem do modo ───────────────────────────────────
  let finalValue: number
  let finalDeadline: number | null = null
  let milestonesJson: any[] | null = null

  if (job.mode === 'contract') {
    // Em contrato, o valor é a SOMA dos milestones propostos.
    const raw: any[] = Array.isArray(proposedMilestones) ? proposedMilestones : []
    const cleaned = raw
      .map(m => ({
        title:          (m?.title ?? '').toString().trim(),
        description:    m?.description ? m.description.toString().trim() : null,
        value:          Number(m?.value),
        deadline_hours: m?.deadline_hours == null || m?.deadline_hours === ''
                          ? null
                          : Math.max(1, Math.floor(Number(m.deadline_hours))),
      }))
      .filter(m => m.title && Number.isFinite(m.value) && m.value > 0)

    if (cleaned.length === 0)
      return NextResponse.json({ error: 'Inclua ao menos uma etapa válida.' }, { status: 400 })

    milestonesJson = cleaned
    finalValue = Number(cleaned.reduce((s, m) => s + m.value, 0).toFixed(2))
  } else {
    // proposal comum: valor + prazo direto
    finalValue = Number(value)
    if (!Number.isFinite(finalValue) || finalValue <= 0)
      return NextResponse.json({ error: 'Valor inválido.' }, { status: 400 })
    finalDeadline = deadlineHours == null || deadlineHours === ''
      ? null
      : Math.max(1, Math.floor(Number(deadlineHours)))
    if (finalDeadline !== null && !Number.isFinite(finalDeadline))
      return NextResponse.json({ error: 'Prazo inválido.' }, { status: 400 })
  }

  // Insere a proposta — o índice único parcial impede 2 pendentes
  const { error: insertError, data: created } = await admin
    .from('proposals')
    .insert({
      job_id:              job.id,
      freelancer_id:       freelancer.id,
      value:               finalValue,
      deadline_hours:      finalDeadline,
      message:             trimmedMsg,
      proposed_milestones: milestonesJson,
      status:              'pending',
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
