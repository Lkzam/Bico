import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const VALID_ROLES = ['company', 'freelancer']

export async function POST(req: NextRequest) {
  const { name, bio, role } = await req.json()

  if (!name || !role) {
    return NextResponse.json({ error: 'Nome e tipo de conta são obrigatórios.' }, { status: 400 })
  }
  // Whitelist do role — nunca confiar no valor enviado pelo cliente
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Tipo de conta inválido.' }, { status: 400 })
  }

  // Pega o usuário logado
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  // Usa admin client para criar o perfil (bypassa RLS)
  const admin = createAdminClient()

  // Verifica se já existe
  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (existing) {
    return NextResponse.json({ ok: true, existed: true })
  }

  const { data: created, error } = await admin.from('profiles').insert({
    user_id: user.id,
    role,
    name,
    bio: bio || null,
    terms_accepted_at: new Date().toISOString(),
  }).select('id').single()

  if (error || !created) {
    console.error('Profile creation error:', error)
    return NextResponse.json({ error: 'Erro ao criar perfil.' }, { status: 500 })
  }

  // Cria a linha de dados privados (saldo/pix/cpf). RLS só deixa o dono ler.
  const { error: privError } = await admin
    .from('account_private')
    .insert({ profile_id: created.id, balance: 0 })
  if (privError) {
    console.error('account_private creation error:', privError)
  }

  return NextResponse.json({ ok: true })
}
