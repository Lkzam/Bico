// ─────────────────────────────────────────────────────────────────────────────
// Integração Pagar.me (cartão de crédito) — ENTRADA apenas.
// A saída (saque do freelancer) continua 100% PIX via Efí.
//
// PCI: o número do cartão NUNCA toca nosso servidor. O cliente tokeniza direto
// na Pagar.me (chave pública) e nos manda só o `card_token`. Aqui usamos a chave
// SECRETA para criar o pedido (order) e capturar.
//
// Tudo é env-gated: sem PAGARME_SECRET_KEY, isPagarmeConfigured() = false e a UI
// de cartão nem aparece.
// ─────────────────────────────────────────────────────────────────────────────

const PAGARME_API = 'https://api.pagar.me/core/v5'

export function isPagarmeConfigured(): boolean {
  return !!process.env.PAGARME_SECRET_KEY
}

export interface ChargeCardParams {
  /** Valor final em reais (já com taxa de plataforma). */
  amount: number
  /** Token do cartão gerado no client com a chave pública. */
  cardToken: string
  /** Nosso código de referência (ex.: derivado do jobId). */
  reference: string
  customer: {
    name: string
    email: string
    /** CPF/CNPJ só dígitos. */
    document: string
    documentType: 'cpf' | 'cnpj'
  }
  installments?: number
  metadata?: Record<string, string>
}

export interface ChargeCardResult {
  status: 'paid' | 'processing' | 'failed'
  chargeId: string | null
  /** Mensagem de recusa do adquirente, quando houver. */
  message: string | null
  raw: unknown
}

export async function chargeCard(p: ChargeCardParams): Promise<ChargeCardResult> {
  const secret = process.env.PAGARME_SECRET_KEY
  if (!secret) return { status: 'failed', chargeId: null, message: 'Cartão não configurado.', raw: null }

  const auth = Buffer.from(`${secret}:`).toString('base64')
  const body = {
    code: p.reference,
    customer: {
      name:          p.customer.name,
      email:         p.customer.email,
      type:          p.customer.documentType === 'cnpj' ? 'company' : 'individual',
      document:      p.customer.document,
      document_type: p.customer.documentType,
    },
    items: [{
      amount:      Math.round(p.amount * 100), // centavos
      description: 'Pagamento de trabalho — Bico',
      quantity:    1,
    }],
    payments: [{
      payment_method: 'credit_card',
      credit_card: {
        operation_type: 'auth_and_capture',
        installments:   Math.max(1, p.installments ?? 1),
        card_token:     p.cardToken,
      },
    }],
    metadata: p.metadata,
  }

  let json: any = null
  try {
    const res = await fetch(`${PAGARME_API}/orders`, {
      method:  'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    json = await res.json().catch(() => null)
  } catch (err) {
    console.error('[pagarme] erro de rede ao criar order:', err)
    return { status: 'failed', chargeId: null, message: 'Falha de comunicação com o processador.', raw: null }
  }

  const charge = json?.charges?.[0]
  const st: string | undefined = charge?.status ?? json?.status
  const message: string | null =
    charge?.last_transaction?.acquirer_message ??
    charge?.last_transaction?.gateway_response?.errors?.[0]?.message ??
    null

  const normalized: ChargeCardResult['status'] =
    st === 'paid'                                  ? 'paid'
    : st === 'failed' || st === 'canceled'         ? 'failed'
    :                                                'processing'

  return { status: normalized, chargeId: charge?.id ?? json?.id ?? null, message, raw: json }
}

/** Evento normalizado de webhook do Pagar.me. */
export interface PagarmeWebhookEvent {
  type: string
  chargeCode: string | null   // nosso `code` (reference)
  chargeId: string | null
  status: string | null
}

export function parsePagarmeWebhook(payload: unknown): PagarmeWebhookEvent | null {
  const p = payload as any
  if (!p?.type) return null
  const data = p.data ?? {}
  return {
    type:       p.type,
    chargeCode: data.code ?? data.order?.code ?? null,
    chargeId:   data.id ?? null,
    status:     data.status ?? null,
  }
}
