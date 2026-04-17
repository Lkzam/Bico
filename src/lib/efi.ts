import axios from 'axios'
import https from 'https'
import fs from 'fs'
import path from 'path'
import QRCode from 'qrcode'
import { calcCompanyTotal } from './fees'
export { calcCompanyTotal, calcFreelancerReceives, PLATFORM_FEE_COMPANY, PLATFORM_FEE_FREELANCER } from './fees'

const SANDBOX = process.env.EFIBANK_SANDBOX === 'true'

const BASE_URL = SANDBOX
  ? 'https://pix-h.api.efipay.com.br'
  : 'https://pix.api.efipay.com.br'

const CLIENT_ID = SANDBOX
  ? process.env.EFIBANK_HOMOLOG_CLIENT_ID!
  : process.env.EFIBANK_CLIENT_ID!

const CLIENT_SECRET = SANDBOX
  ? process.env.EFIBANK_HOMOLOG_CLIENT_SECRET!
  : process.env.EFIBANK_CLIENT_SECRET!

const CERT_PATH = SANDBOX
  ? process.env.EFIBANK_HOMOLOG_CERT_PATH!
  : process.env.EFIBANK_CERT_PATH!

/**
 * Lê o certificado .p12:
 * - Em produção na Vercel: usa EFIBANK_CERT_BASE64 (variável de ambiente com o cert em base64)
 * - Em desenvolvimento local: lê o arquivo do disco via EFIBANK_CERT_PATH
 */
function getCertBuffer(): Buffer {
  const base64Env = SANDBOX
    ? process.env.EFIBANK_HOMOLOG_CERT_BASE64
    : process.env.EFIBANK_CERT_BASE64

  if (base64Env) {
    return Buffer.from(base64Env, 'base64')
  }

  const certAbsPath = path.resolve(process.cwd(), CERT_PATH)
  return fs.readFileSync(certAbsPath)
}

function getHttpsAgent() {
  const pfx        = getCertBuffer()
  const passphrase = process.env.EFIBANK_CERT_PASSPHRASE ?? ''
  return new https.Agent({ pfx, passphrase })
}

// ── OAuth token (cacheado em memória) ─────────────────────────────────────────
let cachedToken: { token: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  const now = Date.now()
  if (cachedToken && cachedToken.expiresAt > now + 10_000) {
    return cachedToken.token
  }

  const agent       = getHttpsAgent()
  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')

  const res = await axios.post(
    `${BASE_URL}/oauth/token`,
    new URLSearchParams({ grant_type: 'client_credentials' }).toString(),
    {
      headers: {
        Authorization:  `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      httpsAgent: agent,
    }
  )

  cachedToken = {
    token:     res.data.access_token,
    expiresAt: now + res.data.expires_in * 1000,
  }

  return cachedToken.token
}

// ── Criar cobrança PIX ────────────────────────────────────────────────────────
export interface PixChargeResult {
  txid:        string
  qrcode:      string        // copia e cola
  imagemQrcode: string       // base64 PNG para exibir o QR Code
  valor:       number
}

export async function createPixCharge(params: {
  jobId:        string
  value:        number
  companyName:  string
  uniqueSuffix?: string
}): Promise<PixChargeResult> {
  const token      = await getAccessToken()
  const agent      = getHttpsAgent()
  const totalValue = calcCompanyTotal(params.value)

  // txid: máx 35 chars, apenas alfanumérico
  const base   = params.jobId.replace(/-/g, '').substring(0, 26)
  const suffix = params.uniqueSuffix ?? Math.random().toString(36).substring(2, 10)
  const txid   = (base + suffix).substring(0, 35)

  const body = {
    calendario: { expiracao: 3600 },
    valor:      { original: totalValue.toFixed(2) },
    chave:      process.env.EFIBANK_PIX_KEY!,
    infoAdicionais: [
      { nome: 'Plataforma', valor: 'Bico' },
      { nome: 'Job ID',     valor: params.jobId },
    ],
  }

  const res = await axios.put(`${BASE_URL}/v2/cob/${txid}`, body, {
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    httpsAgent: agent,
  })

  const pixCopiaECola: string = res.data.pixCopiaECola

  const imagemQrcode = await QRCode.toDataURL(pixCopiaECola, { width: 256, margin: 2 })

  return { txid, qrcode: pixCopiaECola, imagemQrcode, valor: totalValue }
}

export async function getPixCharge(txid: string) {
  const token = await getAccessToken()
  const agent = getHttpsAgent()

  const res = await axios.get(`${BASE_URL}/v2/cob/${txid}`, {
    headers: { Authorization: `Bearer ${token}` },
    httpsAgent: agent,
  })

  return res.data
}
