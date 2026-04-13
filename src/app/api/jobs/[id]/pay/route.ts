import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

const PLATFORM_FEE = 0.15 // 15%

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { data: company } = await supabase
    .from('profiles').select('id, role').eq('user_id', user.id).single()
  if (!company || company.role !== 'company')
    return NextResponse.json({ error: 'Somente empresas podem realizar pagamentos.' }, { status: 403 })

  const { data: job } = await admin
    .from('jobs').select('*').eq('id', jobId).single()

  if (!job) return NextResponse.json({ error: 'Trabalho não encontrado.' }, { status: 404 })
  if (job.company_id !== company.id)
    return NextResponse.json({ error: 'Este trabalho não pertence à sua empresa.' }, { status: 403 })
  if (job.status !== 'delivered')
    return NextResponse.json({ error: 'O trabalho ainda não foi entregue.' }, { status: 409 })

  const fee = job.value * PLATFORM_FEE
  const freelancerAmount = job.value - fee

  // Registra o pagamento
  await admin.from('payments').insert({
    job_id: jobId,
    amount: job.value,
    fee,
    freelancer_amount: freelancerAmount,
    status: 'released',
    paid_at: new Date().toISOString(),
    released_at: new Date().toISOString(),
  })

  // Credita o saldo do freelancer
  const { data: freelancer } = await admin
    .from('profiles').select('balance').eq('id', job.freelancer_id).single()

  await admin.from('profiles')
    .update({ balance: (freelancer?.balance ?? 0) + freelancerAmount })
    .eq('id', job.freelancer_id)

  // Marca o job como concluído
  await admin.from('jobs')
    .update({ status: 'completed' })
    .eq('id', jobId)

  return NextResponse.json({ success: true, freelancerAmount, fee })
}
