import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function PATCH(
  req: Request,
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
    return NextResponse.json({ error: 'Apenas empresas podem editar trabalhos.' }, { status: 403 })

  // Busca o job
  const { data: job } = await admin
    .from('jobs')
    .select('id, status, company_id')
    .eq('id', jobId)
    .single()

  if (!job) return NextResponse.json({ error: 'Trabalho não encontrado.' }, { status: 404 })
  if (job.company_id !== profile.id)
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
  if (!['open', 'in_progress'].includes(job.status))
    return NextResponse.json({ error: 'Não é possível editar um trabalho já entregue ou concluído.' }, { status: 400 })

  const body = await req.json()
  const { title, description, deadline_hours, address, work_type } = body

  if (!title?.trim()) return NextResponse.json({ error: 'Título é obrigatório.' }, { status: 400 })
  if (!description?.trim()) return NextResponse.json({ error: 'Descrição é obrigatória.' }, { status: 400 })
  if (work_type === 'presential' && !address?.trim())
    return NextResponse.json({ error: 'Endereço é obrigatório para trabalho presencial.' }, { status: 400 })

  const { error } = await admin.from('jobs').update({
    title:          title.trim(),
    description:    description.trim(),
    deadline_hours: deadline_hours ? parseInt(deadline_hours) : null,
    work_type:      work_type ?? 'remote',
    address:        work_type === 'presential' ? address.trim() : null,
  }).eq('id', jobId)

  if (error) return NextResponse.json({ error: 'Erro ao salvar alterações.' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
