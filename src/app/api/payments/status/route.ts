import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getPaymentGateway } from '@/lib/payments'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const txid = searchParams.get('txid')
  if (!txid) return NextResponse.json({ error: 'txid obrigatório.' }, { status: 400 })

  // Autenticação
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('id').eq('user_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 403 })

  const admin = createAdminClient()

  // Busca o pagamento pelo txid
  const { data: payment } = await admin
    .from('payments')
    .select('id, status, job_id')
    .eq('txid', txid)
    .maybeSingle()

  if (!payment) return NextResponse.json({ status: 'not_found' })

  // Verifica que o usuário logado é a empresa OU o freelancer do job
  // (impede que usuário A consulte status de pagamento do usuário B)
  const { data: job } = await admin
    .from('jobs')
    .select('id, company_id, freelancer_id, status')
    .eq('id', payment.job_id)
    .maybeSingle()

  if (!job) return NextResponse.json({ status: 'not_found' })

  const hasAccess = profile.id === job.company_id || profile.id === job.freelancer_id
  if (!hasAccess) return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })

  // ── Reconciliação ativa ──────────────────────────────────────────────────
  // Se o banco ainda mostra "pending", não confiamos só no webhook da Efí:
  // consultamos a cobrança direto na API da Efí. Se ela já foi paga (CONCLUIDA),
  // aplicamos a mesma atualização de escrow que o webhook aplicaria.
  // Isso torna o sistema auto-corretivo caso o webhook não tenha chegado.
  if (payment.status === 'pending') {
    try {
      const gateway = getPaymentGateway({ method: 'pix' })
      const status = await gateway.getChargeStatus(txid)

      if (status === 'paid') {
        const now = new Date().toISOString()

        await admin.from('payments').update({
          status:         'paid_pending_approval',
          paid_at:        now,
        }).eq('id', payment.id).eq('status', 'pending')  // idempotente: só se ainda pending

        // Avança o job conforme o fluxo (espelha o webhook)
        if (job.status === 'delivered') {
          await admin.from('jobs').update({
            status:              'payment_received',
            payment_received_at: now,
          }).eq('id', job.id).eq('status', 'delivered')
        } else if (job.status === 'awaiting_payment') {
          // Contrato: in_progress + chat + 1ª etapa (atômico e idempotente)
          await admin.rpc('fund_contract', { p_job_id: job.id })
        }

        console.log(`[payments/status] Reconciliado via gateway. txid=${txid} job=${job.id}`)
        return NextResponse.json({ status: 'paid_pending_approval' })
      }
    } catch (err: any) {
      // Falha ao consultar o PSP não deve quebrar o polling — devolve o status atual
      console.error('[payments/status] Erro ao consultar cobrança no gateway:', err?.response?.data ?? err?.message ?? err)
    }
  }

  return NextResponse.json({ status: payment.status })
}
