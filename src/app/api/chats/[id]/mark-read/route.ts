import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: chatId } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('id, role').eq('user_id', user.id).single()
  if (!profile) return NextResponse.json({ ok: false }, { status: 401 })

  // Verifica se o usuário faz parte deste chat
  const { data: chat } = await admin
    .from('chats')
    .select('id, company_id, freelancer_id')
    .eq('id', chatId)
    .single()

  if (!chat) return NextResponse.json({ ok: false }, { status: 404 })

  const isCompany    = chat.company_id    === profile.id
  const isFreelancer = chat.freelancer_id === profile.id
  if (!isCompany && !isFreelancer) return NextResponse.json({ ok: false }, { status: 403 })

  const field = isCompany ? 'company_last_read_at' : 'freelancer_last_read_at'

  await admin
    .from('chats')
    .update({ [field]: new Date().toISOString() })
    .eq('id', chatId)

  return NextResponse.json({ ok: true })
}
