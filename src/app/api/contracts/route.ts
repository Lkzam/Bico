import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

interface MilestoneInput {
  title?: string
  description?: string | null
  value?: number | string
  deadline_hours?: number | string | null
}

// POST /api/contracts
// body: { title, description, tagIds[], milestones[] }
//
// Cria um job com mode='contract' + suas milestones. Tudo via admin client
// (atômico — se algum passo falha, removemos o job parcial).
export async function POST(req: Request) {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('id, role').eq('user_id', user.id).single()
  if (!profile || profile.role !== 'company')
    return NextResponse.json({ error: 'Apenas empresas podem criar contratos.' }, { status: 403 })

  // Mesma trava de CPF/CNPJ do post-job
  const { data: priv } = await admin
    .from('account_private').select('cpf, cnpj').eq('profile_id', profile.id).single()
  if (!priv?.cpf && !priv?.cnpj)
    return NextResponse.json(
      { error: 'Cadastre CPF ou CNPJ para publicar trabalhos.', needsDocument: true },
      { status: 403 }
    )

  let body: any = {}
  try { body = await req.json() } catch {}

  const title = (body.title ?? '').toString().trim()
  const description = (body.description ?? '').toString().trim()
  const tagIds: string[] = Array.isArray(body.tagIds) ? body.tagIds : []
  const rawMilestones: MilestoneInput[] = Array.isArray(body.milestones) ? body.milestones : []
  const workType = body.workType === 'presential' ? 'presential' : 'remote'
  const address = workType === 'presential' ? (body.address ?? '').toString().trim() : null

  if (!title)       return NextResponse.json({ error: 'Título é obrigatório.' }, { status: 400 })
  if (!description) return NextResponse.json({ error: 'Descrição é obrigatória.' }, { status: 400 })
  if (workType === 'presential' && !address)
    return NextResponse.json({ error: 'Endereço é obrigatório para trabalho presencial.' }, { status: 400 })
  if (tagIds.length === 0)
    return NextResponse.json({ error: 'Selecione pelo menos uma habilidade.' }, { status: 400 })

  // Normaliza milestones — ignora linhas em branco; mantém ordem.
  const milestones = rawMilestones
    .map(m => ({
      title:          (m.title ?? '').toString().trim(),
      description:    m.description ? m.description.toString().trim() : null,
      value:          Number(m.value),
      deadline_hours: m.deadline_hours == null || m.deadline_hours === ''
                        ? null
                        : Math.max(1, Math.floor(Number(m.deadline_hours))),
    }))
    .filter(m => m.title && Number.isFinite(m.value) && m.value > 0)

  if (milestones.length === 0)
    return NextResponse.json({ error: 'Adicione pelo menos uma etapa válida.' }, { status: 400 })

  const totalValue = Number(milestones.reduce((s, m) => s + m.value, 0).toFixed(2))
  if (totalValue <= 0)
    return NextResponse.json({ error: 'Valor total inválido.' }, { status: 400 })

  // 1. Cria o job
  const { data: job, error: jobError } = await admin
    .from('jobs')
    .insert({
      company_id:     profile.id,
      title,
      description,
      value:          totalValue,
      mode:           'contract',
      status:         'open',
      work_type:      workType,
      address,
      // job.deadline_hours fica null em contrato — cada milestone tem seu prazo
      deadline_hours: null,
    })
    .select('id')
    .single()

  if (jobError || !job) {
    console.error('[contracts] erro ao criar job:', jobError)
    return NextResponse.json({ error: 'Erro ao criar contrato.' }, { status: 500 })
  }

  // 2. Insere milestones (position pela ordem do array)
  const milestoneRows = milestones.map((m, idx) => ({
    job_id:         job.id,
    position:       idx + 1,
    title:          m.title,
    description:    m.description,
    value:          Number(m.value.toFixed(2)),
    deadline_hours: m.deadline_hours,
    status:         'pending',
  }))

  const { error: msError } = await admin.from('contract_milestones').insert(milestoneRows)
  if (msError) {
    // Rollback: deleta o job (cascata deleta tags/milestones se existirem)
    await admin.from('jobs').delete().eq('id', job.id)
    console.error('[contracts] erro ao inserir milestones (rollback feito):', msError)
    return NextResponse.json({ error: 'Erro ao salvar milestones.' }, { status: 500 })
  }

  // 3. Insere tags
  if (tagIds.length > 0) {
    const tagRows = tagIds.map(tag_id => ({ job_id: job.id, tag_id }))
    const { error: tagError } = await admin.from('job_tags').insert(tagRows)
    if (tagError) {
      await admin.from('jobs').delete().eq('id', job.id)
      console.error('[contracts] erro ao inserir tags (rollback feito):', tagError)
      return NextResponse.json({ error: 'Erro ao salvar habilidades.' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, jobId: job.id })
}
