import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const txid = searchParams.get('txid')
  if (!txid) return NextResponse.json({ error: 'txid obrigatório.' }, { status: 400 })

  // Autenticação
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('id').eq('user_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 403 })

  const admin = createAdminClient()

  // Busca o pagamento pelo txid
  const { data: payment } = await admin
    .from('payments')
    .select('id, status, job_id')
    .eq('txid', txid)
    .maybeSingle()

  if (!payment) return NextResponse.json({ status: 'not_found' })

  // Verifica que o usuário logado é a empresa OU o freelancer do job
  // (impede que usuário A consulte status de pagamento do usuário B)
  const { data: job } = await admin
    .from('jobs')
    .select('company_id, freelancer_id')
    .eq('id', payment.job_id)
    .maybeSingle()

  if (!job) return NextResponse.json({ status: 'not_found' })

  const hasAccess = profile.id === job.company_id || profile.id === job.freelancer_id
  if (!hasAccess) return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })

  return NextResponse.json({ status: payment.status })
}
