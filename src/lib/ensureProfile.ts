import { createAdminClient } from '@/lib/supabase/admin'

const VALID_ROLES = ['company', 'freelancer'] as const

// Cria o perfil + a linha de dados privados (account_private) se ainda não
// existirem. Idempotente: se o perfil já existe, retorna existed=true sem mexer.
// Usado tanto no cadastro direto (complete-profile, sem confirmação de email)
// quanto após a confirmação de email (/auth/confirm type=signup), lendo os
// dados do user_metadata gravado no signUp.
export async function ensureProfile(opts: {
  userId: string
  role?: string | null
  name?: string | null
  bio?: string | null
}): Promise<{ ok: true; existed?: boolean } | { ok: false; status: number; error: string }> {
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('profiles').select('id').eq('user_id', opts.userId).single()
  if (existing) return { ok: true, existed: true }

  const role = (opts.role ?? '').toString()
  if (!VALID_ROLES.includes(role as (typeof VALID_ROLES)[number]))
    return { ok: false, status: 400, error: 'Tipo de conta inválido.' }

  const name = (opts.name ?? '').toString().trim()
  if (!name) return { ok: false, status: 400, error: 'Nome obrigatório.' }

  const { data: created, error } = await admin.from('profiles').insert({
    user_id: opts.userId,
    role,
    name: name.slice(0, 120),
    bio: opts.bio ? opts.bio.toString().trim().slice(0, 2000) : null,
    terms_accepted_at: new Date().toISOString(),
  }).select('id').single()

  if (error || !created) {
    console.error('[ensureProfile] erro ao criar perfil:', error)
    return { ok: false, status: 500, error: 'Erro ao criar perfil.' }
  }

  const { error: privError } = await admin
    .from('account_private').insert({ profile_id: created.id, balance: 0 })
  if (privError) console.error('[ensureProfile] erro ao criar account_private:', privError)

  return { ok: true }
}
