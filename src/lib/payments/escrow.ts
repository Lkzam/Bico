import { createAdminClient } from '@/lib/supabase/admin'

// ─────────────────────────────────────────────────────────────────────────────
// Liquidação de um pagamento CONFIRMADO no escrow — fonte única de verdade.
// Usado por: webhook PIX (Efí), reconciliação ativa (payments/status) e cartão
// (Pagar.me). Independe do PSP: o efeito é sempre o mesmo.
//
//   payment  pending -> paid_pending_approval (dinheiro retido)
//   job      delivered        -> payment_received          (job comum/proposal)
//   job      awaiting_payment -> in_progress via fund_contract (contrato)
//
// Idempotente: todos os updates são condicionados ao status atual, então retries
// do PSP / duplo processamento não creditam nem avançam duas vezes.
// ─────────────────────────────────────────────────────────────────────────────
export async function settleConfirmedPayment(opts: {
  paymentId: string
  jobId: string
  jobStatus: string
  /** end-to-end id do PIX (Efí). Para cartão, omitir. */
  endToEndId?: string | null
  paidAt?: string
}): Promise<{ applied: boolean; contract: boolean }> {
  const admin = createAdminClient()
  const { paymentId, jobId, jobStatus } = opts
  const now = opts.paidAt ?? new Date().toISOString()

  // Só liquida nos dois estados que aguardam pagamento.
  if (jobStatus !== 'delivered' && jobStatus !== 'awaiting_payment') {
    return { applied: false, contract: false }
  }

  await admin
    .from('payments')
    .update({
      status:  'paid_pending_approval',
      paid_at: now,
      ...(opts.endToEndId !== undefined ? { pix_end_to_end: opts.endToEndId } : {}),
    })
    .eq('id', paymentId)
    .eq('status', 'pending')

  if (jobStatus === 'delivered') {
    await admin
      .from('jobs')
      .update({ status: 'payment_received', payment_received_at: now })
      .eq('id', jobId)
      .eq('status', 'delivered')
    return { applied: true, contract: false }
  }

  // Contrato (awaiting_payment): in_progress + chat + 1ª etapa (atômico/idempotente).
  await admin.rpc('fund_contract', { p_job_id: jobId })
  return { applied: true, contract: true }
}
