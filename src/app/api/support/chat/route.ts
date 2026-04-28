import Groq from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import fs from 'fs'
import path from 'path'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// Carrega a base de conhecimento do arquivo .md — edite o arquivo para atualizar o suporte
const SYSTEM_PROMPT = fs.readFileSync(
  path.join(process.cwd(), 'src/app/api/support/knowledge-base.md'),
  'utf-8'
)

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const { messages } = await req.json()
  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: 'Mensagens inválidas.' }, { status: 400 })
  }

  const apiMessages = messages
    .filter((m: any) => m.role && m.content)
    .map((m: any) => ({ role: m.role as 'user' | 'assistant', content: String(m.content) }))

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 1024,
          stream: true,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...apiMessages,
          ],
        })

        for await (const chunk of response) {
          const text = chunk.choices[0]?.delta?.content ?? ''
          if (text) controller.enqueue(encoder.encode(text))
        }
      } catch (err: any) {
        console.error('[support/chat] Erro Groq:', err)
        controller.enqueue(encoder.encode('\n\nDesculpe, ocorreu um erro. Tente novamente em instantes.'))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  })
}
