import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { name, bio, role } = await req.json()

  if (!name || !role) {
    return NextResponse.json({ error: 'Nome e tipo de conta são obrigatórios.' }, { status: 400 })
  }

  // Pega o usuário logado
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  // Usa admin client para criar o perfil (bypassa RLS)
  const admin = await createAdminClient()

  // Verifica se já existe
  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (existing) {
    return NextResponse.json({ ok: true, existed: true })
  }

  const { error } = await admin.from('profiles').insert({
    user_id: user.id,
    role,
    name,
    bio: bio || null,
    terms_accepted_at: new Date().toISOString(),
  })

  if (error) {
    console.error('Profile creation error:', error)
    return NextResponse.json({ error: 'Erro ao criar perfil.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
