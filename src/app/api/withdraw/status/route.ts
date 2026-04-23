import { NextResponse } from 'next/server'
import { getAccessToken, getHttpsAgent } from '@/lib/efi'
import axios from 'axios'

const SANDBOX  = process.env.EFIBANK_SANDBOX === 'true'
const BASE_URL = SANDBOX ? 'https://pix-h.api.efipay.com.br' : 'https://pix.api.efipay.com.br'

// GET /api/withdraw/status?idEnvio=XXX&secret=SEU_CRON_SECRET
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  if (searchParams.get('secret') !== process.env.CRON_SECRET)
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const idEnvio = searchParams.get('idEnvio')
  if (!idEnvio) return NextResponse.json({ error: 'idEnvio obrigatório.' }, { status: 400 })

  const token = await getAccessToken()
  const agent = getHttpsAgent()

  const { data } = await axios.get(
    `${BASE_URL}/v3/gn/pix/${idEnvio}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      httpsAgent: agent,
    }
  )

  return NextResponse.json(data)
}
