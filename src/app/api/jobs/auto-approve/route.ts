import { createAdminClient } from '@/lib/supabase/admin'
import { archiveAndCleanJob } from '@/lib/archiveJob'
import { secureCompare } from '@/lib/security'
import { NextResponse } from 'next/server'

const AUTO_APPROVE_HOURS = 5

export async function GET(req: Request) {
  const authHeader  = req.headers.get('authorization') ?? ''
  const cronSecret  = process.env.CRON_SECRET ?? ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

  if (!cronSecret || !secureCompare(bearerToken, cronSecret)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const admin = createAdminClient()
  const cutoff = new Date(Date.now() - AUTO_APPROVE_HOURS * 60 * 60 * 1000).toISOString()

  const { data: expiredJobs, error } = await admin
    .from('jobs')
    .select('id, freelancer_id, value')
    .eq('status', 'payment_received')
    .lt('payment_received_at', cutoff)

  if (error) {
    console.error('[auto-approve] Erro ao buscar jobs expirados:', error)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }

  if (!expiredJobs || expiredJobs.length === 0) {
    return NextResponse.json({ ok: true, approved: 0, message: 'Nenhum job expirado.' })
  }

  let approved = 0
  const errors: string[] = []

  for (const job of expiredJobs) {
    try {
      // ── 1. Aprovação + crédito ATÔMICOS e idempotentes (Postgres) ──────
      const { data: processed, error: rpcError } = await admin
        .rpc('approve_and_credit', { p_job_id: job.id, p_auto: true })

      if (rpcError) {
        errors.push(`Job ${job.id}: ${rpcError.message}`)
        console.error(`[auto-approve] RPC falhou no job ${job.id}:`, rpcError)
        continue
      }

      // null = já processado (ex.: empresa aprovou manualmente antes) → pula
      if (!processed) continue

      approved++

      // ── 2. Arquiva + limpa (cada job individualmente) ──────────────────
      try {
        await archiveAndCleanJob(job.id)
        console.log(`[auto-approve] Job ${job.id} aprovado e arquivado.`)
      } catch (archiveErr) {
        console.error(`[auto-approve] Falha ao arquivar job ${job.id}:`, archiveErr)
        errors.push(`Job ${job.id}: arquivado com erro de limpeza`)
      }
    } catch (err) {
      errors.push(`Job ${job.id}: ${String(err)}`)
      console.error(`[auto-approve] Erro no job ${job.id}:`, err)
    }
  }

  return NextResponse.json({
    ok: true,
    approved,
    errors: errors.length > 0 ? errors : undefined,
    message: `${approved} job(s) aprovado(s) e arquivado(s) automaticamente.`,
  })
}
