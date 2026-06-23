import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { archiveAndCleanJob } from '@/lib/archiveJob'
import type { ApproveMilestoneResult } from '@/lib/payments/rpc-results'
import { NextResponse } from 'next/server'

// POST /api/contracts/milestones/[id]/approve
// Empresa aprova uma etapa entregue. Crédito de 93% da etapa é atômico (RPC).
// Quando a última etapa é aprovada, o contrato é concluído e arquivado.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: milestoneId } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('id, role').eq('user_id', user.id).single()
  if (!profile || profile.role !== 'company')
    return NextResponse.json({ error: 'Apenas empresas aprovam etapas.' }, { status: 403 })

  const { data: rpcResult, error: rpcError } = await admin.rpc('approve_milestone', {
    p_milestone_id: milestoneId,
    p_company_profile_id: profile.id,
  })

  if (rpcError) {
    console.error('[milestones/approve] RPC error:', rpcError)
    return NextResponse.json({ error: 'Erro ao aprovar etapa.' }, { status: 500 })
  }

  const result = rpcResult as ApproveMilestoneResult
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? 'Não foi possível aprovar.' }, { status: 409 })
  }

  // Última etapa aprovada -> conclui (job já está 'completed' pela RPC).
  // Limpa os arquivos das etapas no Storage e arquiva o job para o histórico.
  let archiveId: string | null = null
  if (result.all_approved && result.job_id) {
    try {
      const { data: msFiles } = await admin
        .from('contract_milestones')
        .select('delivery_url')
        .eq('job_id', result.job_id)
      const paths = (msFiles ?? []).map(m => m.delivery_url).filter(Boolean) as string[]
      if (paths.length > 0) {
        await admin.storage.from('deliveries').remove(paths)
      }
    } catch (err) {
      console.error('[milestones/approve] erro ao limpar arquivos das etapas:', err)
    }

    try {
      archiveId = await archiveAndCleanJob(result.job_id)
    } catch (err) {
      console.error('[milestones/approve] erro ao arquivar contrato:', err)
    }
  }

  return NextResponse.json({
    ok: true,
    credited: result.credited,
    allApproved: !!result.all_approved,
    archiveId,
  })
}
