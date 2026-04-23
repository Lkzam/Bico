import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('id, role').eq('user_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })

  const body = await req.json()
  const { jobArchiveId, rating, comment } = body

  if (!jobArchiveId || !rating) {
    return NextResponse.json({ error: 'jobArchiveId e rating são obrigatórios.' }, { status: 400 })
  }
  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating deve ser entre 1 e 5.' }, { status: 400 })
  }

  // Busca o arquivo do job
  const { data: archive } = await admin
    .from('job_archives')
    .select('id, company_id, freelancer_id, company_reviewed, freelancer_reviewed')
    .eq('id', jobArchiveId)
    .single()

  if (!archive) return NextResponse.json({ error: 'Trabalho não encontrado.' }, { status: 404 })

  const isCompany    = archive.company_id    === profile.id
  const isFreelancer = archive.freelancer_id === profile.id

  if (!isCompany && !isFreelancer) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
  }

  // Verifica se já avaliou
  if (isCompany    && archive.company_reviewed)    return NextResponse.json({ error: 'Você já avaliou este trabalho.' }, { status: 400 })
  if (isFreelancer && archive.freelancer_reviewed) return NextResponse.json({ error: 'Você já avaliou este trabalho.' }, { status: 400 })

  // Quem está sendo avaliado
  const reviewedId = isCompany ? archive.freelancer_id : archive.company_id

  // Insere a avaliação (via admin para bypassar RLS do insert)
  const { error: insertError } = await admin
    .from('reviews')
    .insert({
      job_id:      jobArchiveId,
      reviewer_id: profile.id,
      reviewee_id: reviewedId,
      stars:       rating,
      comment:     comment?.trim() || null,
    })

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json({ error: 'Você já avaliou este trabalho.' }, { status: 400 })
    }
    console.error('[reviews/submit] Erro ao inserir review:', insertError)
    return NextResponse.json({ error: 'Erro ao salvar avaliação.' }, { status: 500 })
  }

  // Marca o archive como avaliado por esta parte
  // (a trigger on_review_insert já atualiza o rating do perfil automaticamente)
  const updateField = isCompany ? { company_reviewed: true } : { freelancer_reviewed: true }
  await admin.from('job_archives').update(updateField).eq('id', jobArchiveId)

  return NextResponse.json({ ok: true })
}
