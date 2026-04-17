import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(
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
  if (!profile || profile.role !== 'company')
    return NextResponse.json({ error: 'Apenas empresas podem cancelar trabalhos.' }, { status: 403 })

  const { data: job } = await admin
    .from('jobs').select('id, status, company_id').eq('id', jobId).single()

  if (!job) return NextResponse.json({ error: 'Trabalho não encontrado.' }, { status: 404 })
  if (job.company_id !== profile.id)
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
  if (!['open', 'in_progress'].includes(job.status))
    return NextResponse.json({ error: 'Não é possível cancelar um trabalho já entregue ou concluído.' }, { status: 400 })

  await admin.from('jobs').update({ status: 'cancelled' }).eq('id', jobId)

  return NextResponse.json({ ok: true })
}
