import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { archiveAndCleanJob } from '@/lib/archiveJob'
import { isAdminUserId } from '@/lib/admin'
import type { ResolveMilestoneResult } from '@/lib/payments/rpc-results'
import { NextResponse } from 'next/server'

// POST /api/admin/disputes/milestones/[id]/resolve
// body: { action: 'release' | 'refund', note?: string }
// Arbitra a disputa de UMA etapa de contrato. Se a resolução concluir o
// contrato (nenhuma etapa não-terminal restante), arquiva o job.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: milestoneId } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  if (!isAdminUserId(user.id))
    return NextResponse.json({ error: 'Acesso restrito.' }, { status: 403 })

  const { data: adminProfile } = await supabase
    .from('profiles').select('id').eq('user_id', user.id).single()
  if (!adminProfile)
    return NextResponse.json({ error: 'Perfil admin não encontrado.' }, { status: 403 })

  let body: { action?: string; note?: string } = {}
  try { body = await req.json() } catch {}
  const action = body.action
  const note = (body.note ?? '').trim() || null

  if (action !== 'release' && action !== 'refund')
    return NextResponse.json({ error: "Ação inválida. Use 'release' ou 'refund'." }, { status: 400 })

  const rpcName = action === 'release' ? 'release_milestone' : 'refund_milestone'
  const { data: rpcResult, error: rpcError } = await admin.rpc(rpcName, {
    p_milestone_id: milestoneId,
    p_admin_profile_id: adminProfile.id,
    p_note: note,
  })

  if (rpcError) {
    console.error(`[admin/disputes/milestones] RPC ${rpcName} falhou:`, rpcError)
    return NextResponse.json({ error: 'Erro ao resolver disputa.' }, { status: 500 })
  }

  const result = rpcResult as ResolveMilestoneResult
  if (!result.ok)
    return NextResponse.json({ error: result.error ?? 'Etapa não está em disputa.' }, { status: 409 })

  // Notifica as duas partes.
  const released = action === 'release'
  if (result.company_id && result.freelancer_id) {
    await Promise.all([
      admin.from('notifications').insert({
        profile_id: result.company_id,
        title: released ? 'Disputa de etapa resolvida — a favor do freelancer'
                        : 'Disputa de etapa resolvida — reembolso aprovado',
        body: released
          ? 'A análise concluiu que a etapa foi entregue conforme combinado.'
          : `A análise aprovou o reembolso da etapa. O estorno de R$ ${result.refunded?.toFixed(2)} será processado em até 2 dias úteis.`,
        metadata: { dispute_action: action, milestone_id: milestoneId, admin_note: note },
      }),
      admin.from('notifications').insert({
        profile_id: result.freelancer_id,
        title: released ? 'Etapa liberada' : 'Disputa de etapa — reembolso da empresa',
        body: released
          ? `O pagamento da etapa (R$ ${result.credited?.toFixed(2)}) foi creditado no seu saldo.`
          : 'A análise da disputa decidiu pelo reembolso da empresa nesta etapa.',
        metadata: { dispute_action: action, milestone_id: milestoneId, admin_note: note },
      }),
    ])
  }

  // Concluiu o contrato? Arquiva (mesmo fluxo das outras resoluções/aprovações).
  if (result.completed && result.job_id) {
    try {
      const { data: msFiles } = await admin
        .from('contract_milestones').select('delivery_url').eq('job_id', result.job_id)
      const paths = (msFiles ?? []).map(m => m.delivery_url).filter(Boolean) as string[]
      if (paths.length > 0) await admin.storage.from('deliveries').remove(paths)
    } catch (err) {
      console.error('[admin/disputes/milestones] limpeza de arquivos falhou:', err)
    }
    try {
      await archiveAndCleanJob(result.job_id)
    } catch (err) {
      console.error('[admin/disputes/milestones] arquivamento falhou:', err)
    }
  }

  return NextResponse.json({ ok: true, action, completed: !!result.completed })
}
