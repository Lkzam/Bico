import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { archiveAndCleanJob } from '@/lib/archiveJob'
import { isAdminUserId } from '@/lib/admin'
import { NextResponse } from 'next/server'

// POST /api/admin/disputes/[jobId]/resolve
// body: { action: 'release' | 'refund', note?: string }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  if (!isAdminUserId(user.id))
    return NextResponse.json({ error: 'Acesso restrito.' }, { status: 403 })

  // Pega o profile do admin (para registrar no log de auditoria)
  const { data: adminProfile } = await supabase
    .from('profiles').select('id').eq('user_id', user.id).single()
  if (!adminProfile)
    return NextResponse.json({ error: 'Perfil admin não encontrado.' }, { status: 403 })

  let body: { action?: string; note?: string } = {}
  try { body = await req.json() } catch {}
  const action = body.action
  const note = (body.note ?? '').trim() || null

  if (action !== 'release' && action !== 'refund') {
    return NextResponse.json(
      { error: "Ação inválida. Use 'release' ou 'refund'." },
      { status: 400 }
    )
  }

  // Confirma que o job está em disputa antes de chamar a RPC.
  const { data: job } = await admin
    .from('jobs').select('id, status, company_id, freelancer_id, title, value')
    .eq('id', jobId).single()
  if (!job) return NextResponse.json({ error: 'Trabalho não encontrado.' }, { status: 404 })
  if (job.status !== 'disputed')
    return NextResponse.json({ error: 'Este trabalho não está em disputa.' }, { status: 409 })

  // RPC atômica (resolve_dispute correspondente).
  const rpcName = action === 'release' ? 'release_dispute' : 'refund_dispute'
  const { data: processedId, error: rpcError } = await admin.rpc(rpcName, {
    p_job_id: jobId,
    p_admin_profile_id: adminProfile.id,
    p_note: note,
  })

  if (rpcError) {
    console.error(`[admin/disputes] RPC ${rpcName} falhou:`, rpcError)
    return NextResponse.json({ error: 'Erro ao resolver disputa.' }, { status: 500 })
  }
  if (!processedId) {
    return NextResponse.json({ ok: true, alreadyResolved: true })
  }

  // Notifica as duas partes
  const releasedToFreelancer = action === 'release'
  await Promise.all([
    admin.from('notifications').insert({
      profile_id: job.company_id,
      title: releasedToFreelancer
        ? 'Disputa resolvida — pagamento liberado'
        : 'Disputa resolvida — reembolso aprovado',
      body: releasedToFreelancer
        ? `A análise concluiu que o trabalho "${job.title}" foi entregue conforme combinado.`
        : `A análise aprovou o reembolso do trabalho "${job.title}". O estorno será processado em até 2 dias úteis.`,
      metadata: { dispute_action: action, admin_note: note },
    }),
    admin.from('notifications').insert({
      profile_id: job.freelancer_id,
      title: releasedToFreelancer
        ? 'Pagamento liberado'
        : 'Disputa resolvida — reembolso da empresa',
      body: releasedToFreelancer
        ? `O pagamento do trabalho "${job.title}" foi creditado no seu saldo.`
        : `A análise da disputa do trabalho "${job.title}" decidiu pelo reembolso da empresa.`,
      metadata: { dispute_action: action, admin_note: note },
    }),
  ])

  // Se liberou, arquiva o job (mesmo fluxo do approve normal).
  if (releasedToFreelancer) {
    try {
      await archiveAndCleanJob(jobId)
    } catch (err) {
      console.error(`[admin/disputes] Falha ao arquivar job ${jobId}:`, err)
      // não falha a resposta — a resolução em si já está aplicada
    }
  }

  return NextResponse.json({ ok: true, action })
}
