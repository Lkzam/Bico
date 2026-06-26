import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { archiveAndCleanJob } from '@/lib/archiveJob'
import { notifyAdminAlert } from '@/lib/email'
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

  // ── 1. Aprovação + crédito ATÔMICOS e idempotentes (função no Postgres) ────
  // Retorna o freelancer_id se processou, ou null se já tinha sido processado
  // (duplo-clique ou corrida com o auto-approve do cron).
  const { data: processedFreelancerId, error: rpcError } = await admin
    .rpc('approve_and_credit', { p_job_id: jobId, p_auto: false })

  if (rpcError) {
    console.error(`[approve] Falha na RPC approve_and_credit (job ${jobId}):`, rpcError)
    return NextResponse.json({ error: 'Erro ao aprovar entrega.' }, { status: 500 })
  }

  // Já processado → idempotente, não credita de novo nem arquiva de novo.
  if (!processedFreelancerId) {
    return NextResponse.json({ ok: true, alreadyProcessed: true })
  }

  // ── 2. Arquiva + limpa, retorna archiveId para exibir review imediatamente ─
  let archiveId: string | null = null
  try {
    archiveId = await archiveAndCleanJob(jobId)
  } catch (err) {
    console.error(`[approve] Falha ao arquivar job ${jobId}:`, err)
    await notifyAdminAlert({
      event:   'archive_failed_after_credit',
      message: 'Freelancer foi creditado mas o arquivamento do job falhou — estado inconsistente, precisa de limpeza manual.',
      context: { jobId, error: err instanceof Error ? err.message : String(err) },
    })
  }

  return NextResponse.json({ ok: true, archiveId })
}
