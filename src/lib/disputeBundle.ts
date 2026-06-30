import { createAdminClient } from './supabase/admin'
import JSZip from 'jszip'

// Teto de segurança do anexo. O Resend aceita ~40MB no total da mensagem;
// ficamos bem abaixo para não estourar e manter o email rápido.
const MAX_BUNDLE_BYTES = 20 * 1024 * 1024 // 20 MB

export interface DisputeBundle {
  zip: Buffer | null            // null se não houver chat
  messageCount: number
  fileCount: number
  skipped: string[]             // arquivos não incluídos (erro/tamanho)
}

// Monta um ZIP com o log da conversa (conversa.txt) e os arquivos trocados no
// chat (pasta arquivos/), para anexar ao email de disputa. Best-effort: erros de
// download são registrados em arquivos/_NAO_INCLUIDOS.txt, nunca lançam.
export async function buildDisputeBundle(jobId: string): Promise<DisputeBundle> {
  const admin = createAdminClient()

  const { data: chat } = await admin
    .from('chats').select('id').eq('job_id', jobId).maybeSingle()
  if (!chat) return { zip: null, messageCount: 0, fileCount: 0, skipped: [] }

  const { data: messages } = await admin
    .from('messages')
    .select('content, file_url, file_name, file_type, created_at, sender:profiles(name, role)')
    .eq('chat_id', chat.id)
    .order('created_at', { ascending: true })

  const msgs = (messages ?? []) as any[]

  // ── Log legível da conversa ────────────────────────────────────────────────
  const header = [
    `Log de conversa — job ${jobId}`,
    `Gerado em ${new Date().toLocaleString('pt-BR')}`,
    `Total de mensagens: ${msgs.length}`,
    '='.repeat(64),
    '',
  ]
  const body = msgs.map((m) => {
    const who  = `${m.sender?.name ?? 'Desconhecido'} (${m.sender?.role ?? '?'})`
    const when = new Date(m.created_at).toLocaleString('pt-BR')
    const text = m.content ? m.content : ''
    const file = m.file_name ? `  [arquivo anexo: ${m.file_name}]` : ''
    return `[${when}] ${who}: ${text}${file}`.trimEnd()
  })
  const log = [...header, ...body].join('\n')

  const zip = new JSZip()
  zip.file('conversa.txt', log)

  // ── Arquivos trocados (bucket chat-files, público) ─────────────────────────
  const folder  = zip.folder('arquivos')!
  const skipped: string[] = []
  const used    = new Set<string>()
  let totalBytes = Buffer.byteLength(log)
  let fileCount = 0

  for (const m of msgs) {
    if (!m.file_url) continue
    // URL pública: .../storage/v1/object/public/chat-files/<PATH>
    const path = String(m.file_url).split('/chat-files/')[1]
    if (!path) continue

    const { data, error } = await admin.storage.from('chat-files').download(path)
    if (error || !data) {
      skipped.push(`${m.file_name ?? path} (download falhou)`)
      continue
    }

    const buf = Buffer.from(await data.arrayBuffer())
    if (totalBytes + buf.length > MAX_BUNDLE_BYTES) {
      skipped.push(`${m.file_name ?? path} (excede o limite de tamanho)`)
      continue
    }
    totalBytes += buf.length

    // Nome único dentro da pasta
    let name = (m.file_name ?? path.split('/').pop() ?? 'arquivo').toString()
    if (used.has(name)) name = `${fileCount + 1}_${name}`
    used.add(name)

    folder.file(name, buf)
    fileCount++
  }

  if (skipped.length > 0) {
    folder.file('_NAO_INCLUIDOS.txt', skipped.join('\n'))
  }

  const out = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  return { zip: out, messageCount: msgs.length, fileCount, skipped }
}
