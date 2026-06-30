import { describe, it, expect, beforeEach, vi } from 'vitest'

// ─────────────────────────────────────────────────────────────────────────────
// Testa a liquidação de pagamento (settleConfirmedPayment) — fonte única de
// verdade do escrow. Mocka o admin client do Supabase para capturar os updates
// e provar as duas garantias críticas de dinheiro:
//   1. Idempotência: todo update é condicionado ao status atual (.eq('status',...)),
//      então retries do PSP não creditam/avançam duas vezes.
//   2. Roteamento correto: job comum vira payment_received; contrato chama
//      fund_contract; qualquer outro status é no-op.
// ─────────────────────────────────────────────────────────────────────────────

const h = vi.hoisted(() => {
  const fromCalls: any[] = []
  const rpcCalls: { fn: string; args: any }[] = []
  const adminMock = {
    from(table: string) {
      const rec: any = { table, op: null as string | null, payload: null as any, eqs: [] as [string, any][] }
      fromCalls.push(rec)
      const chain: any = {
        update(payload: any) { rec.op = 'update'; rec.payload = payload; return chain },
        eq(col: string, val: any) { rec.eqs.push([col, val]); return chain },
        then(resolve: any, reject: any) { return Promise.resolve({ error: null }).then(resolve, reject) },
      }
      return chain
    },
    rpc(fn: string, args: any) { rpcCalls.push({ fn, args }); return Promise.resolve({ data: true, error: null }) },
  }
  return { fromCalls, rpcCalls, adminMock }
})

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => h.adminMock }))

import { settleConfirmedPayment } from '../escrow'

beforeEach(() => {
  h.fromCalls.length = 0
  h.rpcCalls.length = 0
})

describe('settleConfirmedPayment — job comum (delivered)', () => {
  it('marca payment como paid_pending_approval e job como payment_received', async () => {
    const res = await settleConfirmedPayment({ paymentId: 'p1', jobId: 'j1', jobStatus: 'delivered' })
    expect(res).toEqual({ applied: true, contract: false })

    const pay = h.fromCalls.find(c => c.table === 'payments')
    expect(pay.payload.status).toBe('paid_pending_approval')

    const job = h.fromCalls.find(c => c.table === 'jobs')
    expect(job.payload.status).toBe('payment_received')

    // sem contrato → nenhum RPC
    expect(h.rpcCalls).toHaveLength(0)
  })

  it('condiciona os updates ao status atual (idempotência contra retry do PSP)', async () => {
    await settleConfirmedPayment({ paymentId: 'p1', jobId: 'j1', jobStatus: 'delivered' })

    const pay = h.fromCalls.find(c => c.table === 'payments')
    expect(pay.eqs).toContainEqual(['id', 'p1'])
    expect(pay.eqs).toContainEqual(['status', 'pending']) // guarda de idempotência

    const job = h.fromCalls.find(c => c.table === 'jobs')
    expect(job.eqs).toContainEqual(['id', 'j1'])
    expect(job.eqs).toContainEqual(['status', 'delivered']) // guarda de idempotência
  })

  it('grava o end-to-end id do PIX quando informado', async () => {
    await settleConfirmedPayment({ paymentId: 'p1', jobId: 'j1', jobStatus: 'delivered', endToEndId: 'E2E123' })
    const pay = h.fromCalls.find(c => c.table === 'payments')
    expect(pay.payload.pix_end_to_end).toBe('E2E123')
  })

  it('NÃO inclui pix_end_to_end quando omitido (cartão)', async () => {
    await settleConfirmedPayment({ paymentId: 'p1', jobId: 'j1', jobStatus: 'delivered' })
    const pay = h.fromCalls.find(c => c.table === 'payments')
    expect('pix_end_to_end' in pay.payload).toBe(false)
  })
})

describe('settleConfirmedPayment — contrato (awaiting_payment)', () => {
  it('libera o contrato via fund_contract (atômico) e não toca jobs.status direto', async () => {
    const res = await settleConfirmedPayment({ paymentId: 'p1', jobId: 'jC', jobStatus: 'awaiting_payment' })
    expect(res).toEqual({ applied: true, contract: true })

    expect(h.rpcCalls).toContainEqual({ fn: 'fund_contract', args: { p_job_id: 'jC' } })

    // não deve haver update direto em jobs (quem avança é o fund_contract)
    expect(h.fromCalls.find(c => c.table === 'jobs')).toBeUndefined()

    // ainda marca o pagamento como pago/retido
    const pay = h.fromCalls.find(c => c.table === 'payments')
    expect(pay.payload.status).toBe('paid_pending_approval')
    expect(pay.eqs).toContainEqual(['status', 'pending'])
  })
})

describe('settleConfirmedPayment — estados que não aguardam pagamento', () => {
  it.each(['open', 'in_progress', 'payment_received', 'completed', 'cancelled'])(
    'é no-op quando o job está em "%s" (não credita/avança)',
    async (status) => {
      const res = await settleConfirmedPayment({ paymentId: 'p1', jobId: 'j1', jobStatus: status })
      expect(res).toEqual({ applied: false, contract: false })
      expect(h.fromCalls).toHaveLength(0)
      expect(h.rpcCalls).toHaveLength(0)
    },
  )
})
