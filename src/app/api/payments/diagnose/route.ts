import { NextResponse } from 'next/server'
import { secureCompare } from '@/lib/security'
import { getAccessToken, getHttpsAgent } from '@/lib/efi'
import axios from 'axios'

// Diagnóstico de configuração de pagamento Efí Bank (rode em produção)
// GET /api/payments/diagnose?secret=SEU_CRON_SECRET
//
// Confere, dentro do ambiente de produção da Vercel:
//  1. Quais variáveis de ambiente estão presentes (sem vazar segredos)
//  2. Se o certificado + credenciais funcionam (tenta obter token OAuth)
//  3. Qual webhook está realmente registrado na Efí
//  4. Se o webhook registrado bate com a URL esperada deste deploy

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const cronSecret = process.env.CRON_SECRET ?? ''

  if (!cronSecret || !secureCompare(searchParams.get('secret') ?? '', cronSecret)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const SANDBOX = process.env.EFIBANK_SANDBOX === 'true'

  // Mostra se a variável existe e um trecho mascarado (nunca o valor completo)
  const mask = (v?: string) =>
    !v ? '❌ AUSENTE' : `✅ definida (${v.length} chars, ...${v.slice(-4)})`

  const env = {
    EFIBANK_SANDBOX:             process.env.EFIBANK_SANDBOX ?? '(não definido → assume produção)',
    EFIBANK_CLIENT_ID:           mask(SANDBOX ? process.env.EFIBANK_HOMOLOG_CLIENT_ID : process.env.EFIBANK_CLIENT_ID),
    EFIBANK_CLIENT_SECRET:       mask(SANDBOX ? process.env.EFIBANK_HOMOLOG_CLIENT_SECRET : process.env.EFIBANK_CLIENT_SECRET),
    EFIBANK_PIX_KEY:             mask(process.env.EFIBANK_PIX_KEY),
    EFIBANK_CERT_BASE64:         mask(SANDBOX ? process.env.EFIBANK_HOMOLOG_CERT_BASE64 : process.env.EFIBANK_CERT_BASE64),
    EFIBANK_CERT_PASSPHRASE:     process.env.EFIBANK_CERT_PASSPHRASE ? '✅ definida' : '⚠️ vazia (ok se o cert não tem senha)',
    EFIBANK_WEBHOOK_TOKEN:       mask(process.env.EFIBANK_WEBHOOK_TOKEN),
    NEXT_PUBLIC_APP_URL:         process.env.NEXT_PUBLIC_APP_URL ?? '❌ AUSENTE',
    CRON_SECRET:                 process.env.CRON_SECRET ? '✅ definida' : '❌ AUSENTE',
  }

  const APP_URL  = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const PIX_KEY  = process.env.EFIBANK_PIX_KEY ?? ''
  const TOKEN    = process.env.EFIBANK_WEBHOOK_TOKEN ?? ''
  const expectedWebhookUrl = `${APP_URL}/api/payments/webhook?token=${TOKEN}&ignorar=`

  const BASE_URL = SANDBOX ? 'https://pix-h.api.efipay.com.br' : 'https://pix.api.efipay.com.br'

  const result: any = {
    ambiente: SANDBOX ? '🧪 SANDBOX/Homologação' : '🚀 PRODUÇÃO',
    baseUrl: BASE_URL,
    env,
    expectedWebhookUrl,
  }

  // 2. Testa autenticação (cert + credenciais)
  let token: string
  try {
    token = await getAccessToken()
    result.oauth = '✅ Autenticação OK (certificado + credenciais válidos)'
  } catch (err: any) {
    result.oauth = '❌ FALHOU ao autenticar na Efí'
    result.oauthErro = err?.response?.data ?? err?.message ?? String(err)
    return NextResponse.json(result)
  }

  // 3. Consulta o webhook realmente registrado na Efí
  try {
    const agent = getHttpsAgent()
    const res = await axios.get(
      `${BASE_URL}/v2/webhook/${encodeURIComponent(PIX_KEY)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        httpsAgent: agent,
      }
    )
    const registeredUrl = res.data?.webhookUrl ?? null
    result.webhookRegistrado = registeredUrl ?? '❌ NENHUM webhook registrado nesta chave PIX'
    result.criacao = res.data?.criacao ?? null
    result.webhookBate = registeredUrl === expectedWebhookUrl
      ? '✅ O webhook registrado bate com este deploy'
      : '⚠️ O webhook registrado NÃO bate com a URL esperada — rode /api/payments/register-webhook'
  } catch (err: any) {
    if (err?.response?.status === 404) {
      result.webhookRegistrado = '❌ NENHUM webhook registrado (404) — rode /api/payments/register-webhook?secret=...'
    } else {
      result.webhookRegistrado = '❌ Erro ao consultar webhook na Efí'
      result.webhookErro = err?.response?.data ?? err?.message ?? String(err)
    }
  }

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
