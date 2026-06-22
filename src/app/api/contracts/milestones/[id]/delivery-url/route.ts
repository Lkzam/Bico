import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminUserId } from '@/lib/admin'
import { NextResponse } from 'next/server'

// GET /api/contracts/milestones/[id]/delivery-url
// Link assinado (1h) do arquivo de uma etapa entregue. A empresa pode baixar a
// qualquer momento (o contrato já está financiado em escrow). Freelancer também.
export async function GET(
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
  if (!profile) return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })

  const { data: ms } = await admin
    .from('contract_milestones')
    .select('job_id, delivery_url')
    .eq('id', milestoneId).single()
  if (!ms) return NextResponse.json({ error: 'Etapa não encontrada.' }, { status: 404 })

  const { data: job } = await admin
    .from('jobs').select('company_id, freelancer_id').eq('id', ms.job_id).single()
  if (!job) return NextResponse.json({ error: 'Contrato não encontrado.' }, { status: 404 })

  const isCompany    = profile.role === 'company'    && job.company_id    === profile.id
  const isFreelancer = profile.role === 'freelancer' && job.freelancer_id === profile.id
  const isAdmin      = isAdminUserId(user.id)
  if (!isCompany && !isFreelancer && !isAdmin)
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })

  if (!ms.delivery_url)
    return NextResponse.json({ error: 'Nenhum arquivo entregue nesta etapa.' }, { status: 404 })

  const { data, error } = await admin.storage
    .from('deliveries')
    .createSignedUrl(ms.delivery_url, 60 * 60)

  if (error || !data)
    return NextResponse.json({ error: 'Erro ao gerar link.' }, { status: 500 })

  return NextResponse.json({ url: data.signedUrl })
}
