import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const txid = searchParams.get('txid')
  if (!txid) return NextResponse.json({ error: 'txid obrigatório.' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const admin = createAdminClient()
  const { data: payment } = await admin
    .from('payments')
    .select('status')
    .eq('txid', txid)
    .single()

  return NextResponse.json({ status: payment?.status ?? 'not_found' })
}
