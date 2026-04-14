import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPixCharge } from '@/lib/efi'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { jobId } = await req.json()
  if (!jobId) return NextResponse.json({ error: 'jobId obrigatório.' }, { status: 400 })

  const { data: profile } = await supabase
    .from('profiles').select('id, role, name').eq('user_id', user.id).single()
  if (!profile || profile.role !== 'company')
    return NextResponse.json({ error: 'Apenas empresas podem pagar.' }, { status: 403 })

  const { data: job } = await admin
    .from('jobs').select('id, value, status, company_id, title').eq('id', jobId).single()

  if (!job) return NextResponse.json({ error: 'Trabalho não encontrado.' }, { status: 404 })
  if (job.company_id !== profile.id)
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
  if (job.status !== 'delivered')
    return NextResponse.json({ error: 'Trabalho ainda não foi entregue.' }, { status: 400 })

  // Verifica se já existe cobrança pendente para esse job
  const { data: existingPayment } = await admin
    .from('payments')
    .select('txid, qrcode, qrcode_image, total_value')
    .eq('job_id', jobId)
    .eq('status', 'pending')
    .single()

  if (existingPayment) {
    return NextResponse.json({
      txid: existingPayment.txid,
      qrcode: existingPayment.qrcode,
      imagemQrcode: existingPayment.qrcode_image,
      valor: existingPayment.total_value,
    })
  }

  try {
    // Gera um txid único por tentativa de pagamento
    const uniqueSuffix = Math.random().toString(36).substring(2, 10)
    const charge = await createPixCharge({
      jobId: job.id,
      value: job.value,
      companyName: profile.name,
      uniqueSuffix,
    })

    // Salva a cobrança no banco
    await admin.from('payments').insert({
      job_id: job.id,
      txid: charge.txid,
      status: 'pending',
      job_value: job.value,
      total_value: charge.valor,
      qrcode: charge.qrcode,
      qrcode_image: charge.imagemQrcode,
    })

    return NextResponse.json(charge)
  } catch (err: any) {
    console.error('Erro ao criar cobrança Efí:', err?.response?.data ?? err.message)
    return NextResponse.json(
      { error: 'Erro ao gerar cobrança PIX. Tente novamente.' },
      { status: 500 }
    )
  }
}
