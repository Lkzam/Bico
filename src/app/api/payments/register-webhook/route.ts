import { NextResponse } from 'next/server'
import { secureCompare } from '@/lib/security'
import { getPaymentGateway } from '@/lib/payments'

// Rota para registrar o webhook no PSP (chame uma vez após o deploy).
// GET /api/payments/register-webhook?secret=SEU_CRON_SECRET
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const cronSecret = process.env.CRON_SECRET ?? ''

  if (!cronSecret || !secureCompare(searchParams.get('secret') ?? '', cronSecret)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const APP_URL       = process.env.NEXT_PUBLIC_APP_URL!
  const WEBHOOK_TOKEN = process.env.EFIBANK_WEBHOOK_TOKEN!

  // URL do webhook:
  // - ?token=  → o webhook valida a origem
  // - &ignorar= → evita que o PSP adicione /pix como rota separada (legado Efí)
  const webhookUrl = `${APP_URL}/api/payments/webhook?token=${WEBHOOK_TOKEN}&ignorar=`

  try {
    const gateway = getPaymentGateway({ method: 'pix' })
    const result  = await gateway.registerWebhook(webhookUrl)
    return NextResponse.json({
      ok: result.ok,
      status: result.status,
      webhookUrl: result.webhookUrl,
      message: 'Webhook registrado com sucesso!',
    })
  } catch (err: any) {
    console.error('[register-webhook] erro:', err?.response?.data ?? err?.message ?? err)
    return NextResponse.json(
      { error: 'Erro ao registrar webhook.', detail: err?.response?.data ?? err?.message ?? String(err) },
      { status: 500 }
    )
  }
}
