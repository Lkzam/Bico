import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  // Usa admin: 'terms_accepted_at' não está no grant de colunas do client
  // (H1 revogou UPDATE amplo de profiles). A escrita é validada pelo user_id.
  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ terms_accepted_at: new Date().toISOString() })
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: 'Erro ao registrar aceite.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
