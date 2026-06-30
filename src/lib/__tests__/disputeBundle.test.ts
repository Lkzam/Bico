import { describe, it, expect, beforeEach, vi } from 'vitest'
import JSZip from 'jszip'

// Mocka o admin client: chat fixo, mensagens e downloads controlados pelo teste.
const h = vi.hoisted(() => {
  const state: { messages: any[]; downloads: Record<string, ArrayBuffer>; hasChat: boolean } = {
    messages: [],
    downloads: {},
    hasChat: true,
  }
  const adminMock = {
    from(table: string) {
      const chain: any = {
        _table: table,
        select() { return chain },
        eq() { return chain },
        maybeSingle() {
          if (chain._table === 'chats')
            return Promise.resolve({ data: state.hasChat ? { id: 'c1' } : null, error: null })
          return Promise.resolve({ data: null, error: null })
        },
        order() { return Promise.resolve({ data: state.messages, error: null }) },
      }
      return chain
    },
    storage: {
      from() {
        return {
          download(path: string) {
            const buf = state.downloads[path]
            if (!buf) return Promise.resolve({ data: null, error: { message: 'not found' } })
            return Promise.resolve({ data: { arrayBuffer: async () => buf }, error: null })
          },
        }
      },
    },
  }
  return { state, adminMock }
})

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => h.adminMock }))

import { buildDisputeBundle } from '../disputeBundle'

const URL_PREFIX = 'https://x.supabase.co/storage/v1/object/public/chat-files/'
const ab = (s: string) => new TextEncoder().encode(s).buffer as ArrayBuffer

beforeEach(() => {
  h.state.messages = []
  h.state.downloads = {}
  h.state.hasChat = true
})

describe('buildDisputeBundle', () => {
  it('monta um ZIP com conversa.txt e os arquivos trocados', async () => {
    h.state.messages = [
      { content: 'Olá, cadê a entrega?', file_url: null, file_name: null, created_at: '2026-06-01T13:00:00Z', sender: { name: 'Empresa X', role: 'company' } },
      { content: null, file_url: `${URL_PREFIX}job1/arq.pdf`, file_name: 'arq.pdf', created_at: '2026-06-01T13:05:00Z', sender: { name: 'Free Y', role: 'freelancer' } },
    ]
    h.state.downloads['job1/arq.pdf'] = ab('CONTEUDO-PDF')

    const res = await buildDisputeBundle('job1')
    expect(Buffer.isBuffer(res.zip)).toBe(true)
    expect(res.messageCount).toBe(2)
    expect(res.fileCount).toBe(1)

    const zip = await JSZip.loadAsync(res.zip!)
    const log = await zip.file('conversa.txt')!.async('string')
    expect(log).toContain('Empresa X')
    expect(log).toContain('Olá, cadê a entrega?')
    expect(log).toContain('arq.pdf')

    const file = await zip.file('arquivos/arq.pdf')!.async('string')
    expect(file).toBe('CONTEUDO-PDF')
  })

  it('registra arquivos que falharam no download em _NAO_INCLUIDOS.txt', async () => {
    h.state.messages = [
      { content: null, file_url: `${URL_PREFIX}job1/sumiu.png`, file_name: 'sumiu.png', created_at: '2026-06-01T13:05:00Z', sender: { name: 'Free Y', role: 'freelancer' } },
    ]
    // sem entry em downloads → download falha

    const res = await buildDisputeBundle('job1')
    expect(res.fileCount).toBe(0)
    expect(res.skipped.some(s => s.includes('sumiu.png'))).toBe(true)

    const zip = await JSZip.loadAsync(res.zip!)
    expect(zip.file('arquivos/_NAO_INCLUIDOS.txt')).not.toBeNull()
  })

  it('retorna zip null quando não há chat para o job', async () => {
    h.state.hasChat = false
    const res = await buildDisputeBundle('job-sem-chat')
    expect(res.zip).toBeNull()
    expect(res.messageCount).toBe(0)
    expect(res.fileCount).toBe(0)
  })
})
