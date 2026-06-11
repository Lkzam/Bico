import { NextResponse } from 'next/server'
import { getPaymentGateway } from '@/lib/payments'
import { secureCompare } from '@/lib/security'

// GET /api/withdraw/status?idEnvio=XXX&secret=SEU_CRON_SECRET
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const cronSecret = process.env.CRON_SECRET ?? ''
  if (!cronSecret || !secureCompare(searchParams.get('secret') ?? '', cronSecret))
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const idEnvio = searchParams.get('idEnvio')
  if (!idEnvio) return NextResponse.json({ error: 'idEnvio obrigatório.' }, { status: 400 })

  const gateway = getPaymentGateway({ method: 'pix' })
  const result  = await gateway.getSendStatus(idEnvio)

  return NextResponse.json({ status: result.status, raw: result.raw })
}
