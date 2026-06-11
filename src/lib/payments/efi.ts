// Implementação do PaymentGateway para a Efí Bank.
// Encapsula os endpoints PIX da Efí (cobrança, envio, webhook).
// Quando entrar Pagar.me/Stripe, basta criar outro arquivo análogo.

import axios from 'axios'
import QRCode from 'qrcode'
import { getAccessToken, getHttpsAgent } from '@/lib/efi'
import type {
  PaymentGateway,
  CreateChargeParams,
  PixCharge,
  ChargeStatus,
  SendPixParams,
  SendResult,
  SendStatusResult,
  SendStatus,
  WebhookPaidEvent,
  RegisterWebhookResult,
} from './gateway'

const SANDBOX = process.env.EFIBANK_SANDBOX === 'true'
const BASE_URL = SANDBOX
  ? 'https://pix-h.api.efipay.com.br'
  : 'https://pix.api.efipay.com.br'

// ── Mapeamento de status: Efí → enum interno ─────────────────────────────────
function mapChargeStatus(efi: string | undefined): ChargeStatus {
  if (efi === 'CONCLUIDA') return 'paid'
  if (efi === 'ATIVA') return 'pending'
  if (typeof efi === 'string' && efi.startsWith('REMOVIDA')) return 'cancelled'
  return 'unknown'
}

function mapSendStatus(efi: string | undefined): SendStatus {
  if (efi === 'REALIZADO') return 'completed'
  if (efi === 'PROCESSADO' || efi === 'EM_PROCESSAMENTO') return 'processing'
  if (efi === 'NAO_REALIZADO') return 'failed'
  return 'unknown'
}

export const efiGateway: PaymentGateway = {
  name: 'efi',

  async createPixCharge(params: CreateChargeParams): Promise<PixCharge> {
    const token = await getAccessToken()
    const agent = getHttpsAgent()

    const infoAdicionais: { nome: string; valor: string }[] = [
      { nome: 'Plataforma', valor: 'Bico' },
    ]
    if (params.metadata?.companyName) {
      infoAdicionais.push({ nome: 'Empresa', valor: params.metadata.companyName })
    }
    if (params.metadata?.jobId) {
      infoAdicionais.push({ nome: 'Job ID', valor: params.metadata.jobId })
    }

    const body = {
      calendario: { expiracao: 3600 }, // 1h — caller deve respeitar TTL ao reutilizar
      valor: { original: params.amount.toFixed(2) },
      chave: process.env.EFIBANK_PIX_KEY!,
      infoAdicionais,
    }

    const res = await axios.put(`${BASE_URL}/v2/cob/${params.txid}`, body, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      httpsAgent: agent,
    })

    const pixCopiaECola: string = res.data.pixCopiaECola
    const qrcodeImage = await QRCode.toDataURL(pixCopiaECola, { width: 256, margin: 2 })

    return {
      txid: params.txid,
      qrcode: pixCopiaECola,
      qrcodeImage,
      amount: params.amount,
      expiresAt: new Date(Date.now() + 3600 * 1000),
    }
  },

  async getChargeStatus(txid: string): Promise<ChargeStatus> {
    try {
      const token = await getAccessToken()
      const agent = getHttpsAgent()
      const res = await axios.get(`${BASE_URL}/v2/cob/${txid}`, {
        headers: { Authorization: `Bearer ${token}` },
        httpsAgent: agent,
      })
      return mapChargeStatus(res.data?.status)
    } catch (err: any) {
      if (err?.response?.status === 404) return 'unknown'
      throw err
    }
  },

  async sendPix({ idEnvio, amount, destinationKey, description }: SendPixParams): Promise<SendResult> {
    try {
      const token = await getAccessToken()
      const agent = getHttpsAgent()
      const body = {
        valor: amount.toFixed(2),
        pagador: {
          chave: process.env.EFIBANK_PIX_KEY!,
          infoPagador: description ?? 'Saque',
        },
        favorecido: { chave: destinationKey.trim() },
      }
      // Não loga o body — contém a chave PIX da plataforma
      await axios.put(`${BASE_URL}/v3/gn/pix/${idEnvio}`, body, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        httpsAgent: agent,
      })
      return { ok: true, idEnvio }
    } catch (err: any) {
      const efiError = err?.response?.data
      const msg =
        efiError?.mensagem ?? efiError?.message ?? err?.message ?? 'Erro ao enviar PIX'
      return { ok: false, error: String(msg) }
    }
  },

  async getSendStatus(idEnvio: string): Promise<SendStatusResult> {
    try {
      const token = await getAccessToken()
      const agent = getHttpsAgent()
      const res = await axios.get(`${BASE_URL}/v2/gn/pix/enviados/id-envio/${idEnvio}`, {
        headers: { Authorization: `Bearer ${token}` },
        httpsAgent: agent,
      })
      return { status: mapSendStatus(res.data?.status), raw: res.data }
    } catch (err: any) {
      if (err?.response?.status === 404) return { status: 'unknown', raw: null }
      throw err
    }
  },

  parseWebhookEvents(payload: unknown): WebhookPaidEvent[] {
    const events: WebhookPaidEvent[] = []
    const p = payload as { pix?: unknown }
    if (!p || !Array.isArray(p.pix)) return events
    for (const pix of p.pix) {
      const px = pix as { txid?: string; endToEndId?: string; horario?: string }
      if (!px?.txid) continue
      events.push({
        txid: px.txid,
        endToEndId: px.endToEndId ?? null,
        paidAt: px.horario ? new Date(px.horario) : new Date(),
      })
    }
    return events
  },

  async registerWebhook(url: string): Promise<RegisterWebhookResult> {
    const token = await getAccessToken()
    const agent = getHttpsAgent()
    const PIX_KEY = process.env.EFIBANK_PIX_KEY!
    const res = await axios.put(
      `${BASE_URL}/v2/webhook/${encodeURIComponent(PIX_KEY)}`,
      { webhookUrl: url },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-skip-mtls-checking': 'true', // obrigatório para Vercel/shared hosting
        },
        httpsAgent: agent,
      }
    )
    return { ok: true, status: res.status, webhookUrl: url }
  },
}
