import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { parseBody, deadlineHours } from '@/lib/validation'
import { z } from 'zod'

// NOTA: `value` é imutável por regra de negócio — não entra no schema de edição.
const editSchema = z.object({
  title:          z.string().trim().min(1, 'Título é obrigatório.').max(200, 'Título muito longo.'),
  description:    z.string().trim().min(1, 'Descrição é obrigatória.').max(20000, 'Descrição muito longa.'),
  deadline_hours: deadlineHours,
  work_type:      z.enum(['remote', 'presential']).optional().default('remote'),
  address:        z.string().trim().max(500, 'Endereço muito longo.').optional(),
}).refine(
  d => d.work_type !== 'presential' || !!d.address,
  { message: 'Endereço é obrigatório para trabalho presencial.', path: ['address'] },
)

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

  const { data: input, error: badInput } = await parseBody(req, editSchema)
  if (badInput) return badInput
  const { title, description, deadline_hours, work_type, address } = input

  const { error } = await admin.from('jobs').update({
    title,
    description,
    deadline_hours,
    work_type,
    address:        work_type === 'presential' ? address! : null,
  }).eq('id', jobId)

  if (error) return NextResponse.json({ error: 'Erro ao salvar alterações.' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
