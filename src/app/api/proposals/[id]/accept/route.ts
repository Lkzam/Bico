import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AcceptProposalResult } from '@/lib/payments/rpc-results'
import { NextResponse } from 'next/server'

// POST /api/proposals/[id]/accept
// Empresa aceita uma proposta. Tudo acontece atômico no banco (RPC).
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

  const { data: rpcResult, error: rpcError } = await admin.rpc('accept_proposal', {
    p_proposal_id: proposalId,
    p_company_profile_id: profile.id,
  })

  if (rpcError) {
    console.error('[proposals/accept] RPC error:', rpcError)
    return NextResponse.json({ error: 'Erro ao aceitar proposta.' }, { status: 500 })
  }

  // A RPC retorna jsonb com { ok, chat_id, ... } ou { ok:false, error }
  const result = rpcResult as AcceptProposalResult
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? 'Não foi possível aceitar.' }, { status: 409 })
  }

  return NextResponse.json({
    ok: true,
    chatId: result.chat_id,
    freelancerId: result.freelancer_id,
  })
}
