import { createAdminClient } from '@/lib/supabase/admin'
import { archiveAndCleanJob } from '@/lib/archiveJob'
import { secureCompare } from '@/lib/security'
import type { ResolveMilestoneResult } from '@/lib/payments/rpc-results'
import { NextResponse } from 'next/server'

// GET /api/contracts/auto-approve  (cron)
// Auto-aprova etapas de contrato ENTREGUES há mais de N dias sem a empresa
// aprovar nem contestar — libera os 93% pro freelancer (M3).
const AUTO_APPROVE_DAYS = 7

export async function GET(req: Request) {
  const authHeader  = req.headers.get('authorization') ?? ''
  const cronSecret  = process.env.CRON_SECRET ?? ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!cronSecret || !secureCompare(bearerToken, cronSecret))
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const admin = createAdminClient()
  const cutoff = new Date(Date.now() - AUTO_APPROVE_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data: due, error } = await admin
    .from('contract_milestones')
    .select('id, job_id')
    .eq('status', 'delivered')
    .lt('delivered_at', cutoff)

  if (error) {
    console.error('[contracts/auto-approve] erro ao buscar etapas:', error)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
  if (!due || due.length === 0)
    return NextResponse.json({ ok: true, approved: 0, message: 'Nenhuma etapa para auto-aprovar.' })

  let approved = 0
  const errors: string[] = []

  for (const ms of due) {
    try {
      const { data: rpcResult, error: rpcError } = await admin
        .rpc('auto_approve_milestone', { p_milestone_id: ms.id })
      if (rpcError) { errors.push(`Etapa ${ms.id}: ${rpcError.message}`); continue }

      const result = rpcResult as ResolveMilestoneResult
      if (!result.ok) continue  // já aprovada / estado mudou → pula
      approved++

      // Concluiu o contrato? Limpa arquivos das etapas e arquiva.
      if (result.completed && result.job_id) {
        try {
          const { data: msFiles } = await admin
            .from('contract_milestones').select('delivery_url').eq('job_id', result.job_id)
          const paths = (msFiles ?? []).map(m => m.delivery_url).filter(Boolean) as string[]
          if (paths.length > 0) await admin.storage.from('deliveries').remove(paths)
        } catch (e) { console.error('[contracts/auto-approve] limpeza falhou:', e) }
        try { await archiveAndCleanJob(result.job_id) }
        catch (e) { console.error('[contracts/auto-approve] arquivamento falhou:', e) }
      }
    } catch (err) {
      errors.push(`Etapa ${ms.id}: ${String(err)}`)
    }
  }

  return NextResponse.json({
    ok: true, approved,
    errors: errors.length > 0 ? errors : undefined,
    message: `${approved} etapa(s) auto-aprovada(s).`,
  })
}
