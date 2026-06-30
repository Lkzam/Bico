import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// GET /api/health — checagem leve de saúde para monitores de uptime.
// Verifica conectividade com o banco. Não revela segredos nem config sensível.
// Rate-limited pelo proxy (/api/ → 100/min por IP).
export const dynamic = 'force-dynamic'

export async function GET() {
  let database = false
  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from('profiles')
      .select('id', { head: true, count: 'exact' })
      .limit(1)
    database = !error
  } catch {
    database = false
  }

  return NextResponse.json(
    { ok: database, database, ts: new Date().toISOString() },
    { status: database ? 200 : 503 },
  )
}
