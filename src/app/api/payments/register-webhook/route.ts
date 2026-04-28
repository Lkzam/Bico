import { NextResponse } from 'next/server'
import { secureCompare } from '@/lib/security'
import axios from 'axios'
import https from 'https'
import fs from 'fs'
import path from 'path'

// Rota para registrar o webhook na Efí Bank (chame uma vez após o deploy)
// GET /api/payments/register-webhook?secret=SEU_CRON_SECRET

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const cronSecret = process.env.CRON_SECRET ?? ''

  if (!cronSecret || !secureCompare(searchParams.get('secret') ?? '', cronSecret)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const SANDBOX       = process.env.EFIBANK_SANDBOX === 'true'
  const BASE_URL      = SANDBOX ? 'https://pix-h.api.efipay.com.br' : 'https://pix.api.efipay.com.br'
  const CLIENT_ID     = SANDBOX ? process.env.EFIBANK_HOMOLOG_CLIENT_ID!    : process.env.EFIBANK_CLIENT_ID!
  const CLIENT_SECRET = SANDBOX ? process.env.EFIBANK_HOMOLOG_CLIENT_SECRET! : process.env.EFIBANK_CLIENT_SECRET!
  const PIX_KEY       = process.env.EFIBANK_PIX_KEY!
  const APP_URL       = process.env.NEXT_PUBLIC_APP_URL!
  const WEBHOOK_TOKEN = process.env.EFIBANK_WEBHOOK_TOKEN!

  // Certificado
  let pfx: Buffer
  if (process.env.EFIBANK_CERT_BASE64) {
    pfx = Buffer.from(process.env.EFIBANK_CERT_BASE64, 'base64')
  } else {
    const certPath = SANDBOX ? process.env.EFIBANK_HOMOLOG_CERT_PATH! : process.env.EFIBANK_CERT_PATH!
    pfx = fs.readFileSync(path.resolve(process.cwd(), certPath))
  }

  const agent = new https.Agent({
    pfx,
    passphrase: process.env.EFIBANK_CERT_PASSPHRASE ?? '',
  })

  // OAuth token
  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
  const tokenRes = await axios.post(
    `${BASE_URL}/oauth/token`,
    new URLSearchParams({ grant_type: 'client_credentials' }).toString(),
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      httpsAgent: agent,
    }
  )
  const token = tokenRes.data.access_token

  // URL do webhook:
  // - ?token= para validar origem
  // - &ignorar= para a Efí não adicionar /pix como rota separada
  const webhookUrl = `${APP_URL}/api/payments/webhook?token=${WEBHOOK_TOKEN}&ignorar=`

  // Registra o webhook com skip-mTLS (necessário para Vercel/servidores compartilhados)
  const webhookRes = await axios.put(
    `${BASE_URL}/v2/webhook/${encodeURIComponent(PIX_KEY)}`,
    { webhookUrl },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-skip-mtls-checking': 'true',   // ← obrigatório para Vercel
      },
      httpsAgent: agent,
    }
  )

  return NextResponse.json({
    ok: true,
    status: webhookRes.status,
    webhookUrl,
    message: 'Webhook registrado com sucesso!',
  })
}
