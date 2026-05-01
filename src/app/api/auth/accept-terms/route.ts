import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  const { error } = await supabase
    .from('profiles')
    .update({ terms_accepted_at: new Date().toISOString() })
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: 'Erro ao registrar aceite.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
