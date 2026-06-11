// ─────────────────────────────────────────────────────────────────────────────
// Abstração de gateway de pagamento.
// A ideia: o resto do código fala com `PaymentGateway` (interface abstrata).
// Hoje só temos a Efí (PIX). Amanhã, quando entrar cartão (Pagar.me), basta
// criar outra impl e o resto do código não muda.
// ─────────────────────────────────────────────────────────────────────────────

/** Cobrança gerada para o pagador (exibir QR code / copia-e-cola). */
export interface PixCharge {
  txid: string
  qrcode: string         // copia-e-cola PIX
  qrcodeImage: string    // data URL base64 PNG
  amount: number         // valor cobrado (já com taxas, se houver)
  expiresAt: Date
}

export type ChargeStatus =
  | 'pending'      // aguardando pagamento
  | 'paid'         // pago
  | 'expired'      // expirou sem pagamento
  | 'cancelled'    // cancelada pelo recebedor/PSP
  | 'unknown'      // não encontrada ou status indefinido

/** Evento de PIX recebido (entregue pelo webhook do PSP). */
export interface WebhookPaidEvent {
  txid: string
  endToEndId: string | null
  paidAt: Date
}

export type SendStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'unknown'

export interface CreateChargeParams {
  /** ID único da cobrança (caller gera; máx 35 chars alfanumérico para PIX). */
  txid: string
  /** Valor final que será cobrado (já com taxa de plataforma somada). */
  amount: number
  /** Metadados opcionais (anotados na cobrança quando o PSP suportar). */
  metadata?: { jobId?: string; companyName?: string }
}

export interface SendPixParams {
  /** ID único do envio (caller gera; máx 35 chars alfanumérico). */
  idEnvio: string
  /** Valor a enviar (já líquido de taxas). */
  amount: number
  /** Chave PIX do favorecido (CPF, CNPJ, e-mail, telefone ou aleatória). */
  destinationKey: string
  /** Texto que aparece no extrato do recebedor. */
  description?: string
}

export type SendResult =
  | { ok: true; idEnvio: string }
  | { ok: false; error: string }

/** Resultado da consulta de status de um envio (saque). */
export interface SendStatusResult {
  status: SendStatus
  raw: unknown // payload original do PSP, para debug/log
}

/** Resultado de registrar o webhook na conta do PSP. */
export interface RegisterWebhookResult {
  ok: boolean
  status: number
  webhookUrl: string
}

/**
 * Contrato que toda integração de PSP deve implementar.
 * Os métodos NÃO devem aplicar regra de negócio (taxa, escrow, etc.) — só
 * encapsulam a conversa com o PSP. Regra de negócio fica nas rotas/RPCs.
 */
export interface PaymentGateway {
  /** Identificador para log (ex: 'efi', 'pagarme'). */
  readonly name: string

  // ── Cobranças PIX (entrada / escrow) ──────────────────────────────────────
  createPixCharge(params: CreateChargeParams): Promise<PixCharge>
  getChargeStatus(txid: string): Promise<ChargeStatus>

  // ── Envio PIX (saída / saque) ─────────────────────────────────────────────
  sendPix(params: SendPixParams): Promise<SendResult>
  getSendStatus(idEnvio: string): Promise<SendStatusResult>

  // ── Webhook ───────────────────────────────────────────────────────────────
  /** Extrai eventos de PIX pago de um payload bruto recebido no webhook. */
  parseWebhookEvents(payload: unknown): WebhookPaidEvent[]
  /** Registra a URL do webhook na conta do PSP. */
  registerWebhook(url: string): Promise<RegisterWebhookResult>
}
