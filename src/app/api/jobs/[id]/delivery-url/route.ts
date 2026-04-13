import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(
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
  if (!profile) return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })

  const { data: job } = await admin
    .from('jobs').select('company_id, freelancer_id, delivery_url').eq('id', jobId).single()

  if (!job) return NextResponse.json({ error: 'Trabalho não encontrado.' }, { status: 404 })

  // Only company or freelancer of this job can view the file
  const isCompany = profile.role === 'company' && job.company_id === profile.id
  const isFreelancer = profile.role === 'freelancer' && job.freelancer_id === profile.id
  if (!isCompany && !isFreelancer)
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })

  if (!job.delivery_url)
    return NextResponse.json({ error: 'Nenhum arquivo entregue.' }, { status: 404 })

  const { data, error } = await admin.storage
    .from('deliveries')
    .createSignedUrl(job.delivery_url, 60 * 60)

  if (error || !data)
    return NextResponse.json({ error: 'Erro ao gerar link.' }, { status: 500 })

  return NextResponse.json({ url: data.signedUrl })
}
