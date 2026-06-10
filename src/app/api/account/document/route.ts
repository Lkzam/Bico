import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidCPF, isValidCNPJ } from '@/lib/security'
import { NextResponse } from 'next/server'

// Salva o CPF (freelancer/empresa) ou CNPJ (empresa) em account_private.
// CPF/CNPJ são únicos por conta → impede criar contas infinitas com o mesmo doc.
export async function POST(req: Request) {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('id, role').eq('user_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 403 })

  let body: any = {}
  try { body = await req.json() } catch {}
  const type = body.type === 'cnpj' ? 'cnpj' : 'cpf'
  const raw = String(body.document ?? '').replace(/\D/g, '')

  let update: { cpf?: string; cnpj?: string }
  if (type === 'cnpj') {
    if (profile.role !== 'company')
      return NextResponse.json({ error: 'Apenas empresas podem usar CNPJ.' }, { status: 403 })
    if (!isValidCNPJ(raw))
      return NextResponse.json({ error: 'CNPJ inválido.' }, { status: 400 })
    update = { cnpj: raw }
  } else {
    if (!isValidCPF(raw))
      return NextResponse.json({ error: 'CPF inválido.' }, { status: 400 })
    update = { cpf: raw }
  }

  const { error } = await admin
    .from('account_private').update(update).eq('profile_id', profile.id)

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: `Este ${type.toUpperCase()} já está cadastrado em outra conta.` },
        { status: 409 }
      )
    }
    console.error('[account/document] erro ao salvar:', error)
    return NextResponse.json({ error: 'Erro ao salvar documento.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
