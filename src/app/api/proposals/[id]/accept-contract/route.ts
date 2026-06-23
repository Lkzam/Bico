import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AcceptContractResult } from '@/lib/payments/rpc-results'
import { NextResponse } from 'next/server'

// POST /api/proposals/[id]/accept-contract
// Empresa escolhe a proposta de um CONTRATO. Tudo atômico no banco (RPC):
// sincroniza os milestones com o plano do freelancer e deixa o job em
// 'awaiting_payment'. O chat só abre depois do pagamento (fund_contract).
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: proposalId } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('id, role').eq('user_id', user.id).single()
  if (!profile || profile.role !== 'company')
    return NextResponse.json({ error: 'Apenas empresas podem escolher propostas.' }, { status: 403 })

  const { data: rpcResult, error: rpcError } = await admin.rpc('accept_contract_proposal', {
    p_proposal_id: proposalId,
    p_company_profile_id: profile.id,
  })

  if (rpcError) {
    console.error('[proposals/accept-contract] RPC error:', rpcError)
    return NextResponse.json({ error: 'Erro ao aceitar proposta.' }, { status: 500 })
  }

  const result = rpcResult as AcceptContractResult
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? 'Não foi possível aceitar.' }, { status: 409 })
  }

  return NextResponse.json({ ok: true, jobId: result.job_id, value: result.value })
}
