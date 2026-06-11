// Ponto único de acesso ao gateway de pagamento.
// O resto do código importa daqui — nunca importa /efi.ts ou /pagarme.ts direto.
//
// Hoje só temos Efí (PIX). Quando entrar Pagar.me/Stripe (cartão), bastará:
//   1. criar src/lib/payments/pagarme.ts implementando PaymentGateway
//   2. ajustar a fábrica abaixo para escolher por método/moeda/feature flag
// Nenhuma rota muda.

import { efiGateway } from './efi'
import type { PaymentGateway } from './gateway'

export type {
  PaymentGateway,
  PixCharge,
  ChargeStatus,
  WebhookPaidEvent,
  CreateChargeParams,
  SendPixParams,
  SendResult,
  SendStatusResult,
  SendStatus,
  RegisterWebhookResult,
} from './gateway'

/**
 * Retorna o gateway ativo.
 * Recebe um hint opcional para o dia em que coexistirem múltiplos PSPs.
 *
 *   getPaymentGateway()                // PIX → Efí
 *   getPaymentGateway({ method:'pix' }) // PIX → Efí
 *   getPaymentGateway({ method:'card' }) // futuro: Pagar.me
 */
export function getPaymentGateway(_opts?: { method?: 'pix' | 'card' }): PaymentGateway {
  // Hoje, tudo Efí.
  return efiGateway
}
