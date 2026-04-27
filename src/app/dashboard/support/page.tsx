'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, RotateCcw } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  loading?: boolean
}

const WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  content: 'Olá! Sou o assistente de suporte do **Bico**. Pode me perguntar qualquer coisa sobre o app — como publicar trabalhos, receber pagamentos, sacar saldo, avaliações e muito mais. Como posso te ajudar?',
}

const SUGGESTIONS = [
  'Como faço para sacar meu saldo?',
  'Como funciona o pagamento via PIX?',
  'O que acontece depois que entrego o trabalho?',
  'Como adiciono minhas habilidades ao perfil?',
]

function renderMarkdown(text: string) {
  // Bold: **text**
  let html = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  // Italic: *text*
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
  // Bullet list: lines starting with -
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul style="margin:8px 0 8px 16px;padding:0;list-style:disc">$1</ul>')
  // Numbered list
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
  // Headers: ##
  html = html.replace(/^## (.+)$/gm, '<p style="font-weight:700;font-size:14px;margin:12px 0 4px;color:#fff">$1</p>')
  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:12px 0"/>')
  // Line breaks
  html = html.replace(/\n/g, '<br/>')
  // Fix double breaks before lists
  html = html.replace(/<br\/><ul/g, '<ul')
  html = html.replace(/<\/ul><br\/>/g, '</ul>')
  return html
}

export default function SupportPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text?: string) {
    const userText = (text ?? input).trim()
    if (!userText || loading) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: userText }
    const assistantId = (Date.now() + 1).toString()
    const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '', loading: true }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setInput('')
    setLoading(true)

    try {
      // Monta histórico sem a mensagem de boas-vindas e sem a mensagem assistant vazia atual
      const history = [...messages.filter(m => m.id !== 'welcome'), userMsg]
        .map(m => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/support/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      })

      if (!res.ok || !res.body) {
        throw new Error('Erro na resposta')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, content: accumulated, loading: false } : m)
        )
      }
    } catch {
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: 'Desculpe, ocorreu um erro. Verifique sua conexão e tente novamente.', loading: false }
            : m
        )
      )
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function reset() {
    setMessages([WELCOME])
    setInput('')
    inputRef.current?.focus()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', maxHeight: 780, fontFamily: 'var(--font-body), Inter, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'linear-gradient(135deg, #d94e18, #c04010)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(217,78,24,0.4)',
          }}>
            <Bot size={18} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>
              Suporte Bico
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.8)' }} />
              <span style={{ fontSize: 11, color: 'rgba(185,190,200,0.5)' }}>Assistente IA • Online</span>
            </div>
          </div>
        </div>
        <button
          onClick={reset}
          title="Nova conversa"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(185,190,200,0.5)',
            cursor: 'pointer', fontSize: 12,
            fontFamily: 'inherit', transition: 'all 0.15s',
          }}
          onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(217,78,24,0.4)'; e.currentTarget.style.color = '#d94e18' }}
          onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(185,190,200,0.5)' }}
        >
          <RotateCcw size={12} />
          Nova conversa
        </button>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16,
        padding: '20px', marginBottom: 16,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(255,255,255,0.1) transparent',
      }}>
        {messages.map(msg => (
          <div key={msg.id} style={{
            display: 'flex',
            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            gap: 10,
            alignItems: 'flex-start',
          }}>
            {/* Avatar */}
            <div style={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, #d94e18, #1e2535)'
                : 'linear-gradient(135deg, #1e2535, #111827)',
              border: `1px solid ${msg.role === 'user' ? 'rgba(217,78,24,0.3)' : 'rgba(255,255,255,0.08)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {msg.role === 'user'
                ? <User size={13} color="#d4783a" />
                : <Bot size={13} color="rgba(185,190,200,0.7)" />
              }
            </div>

            {/* Bubble */}
            <div style={{
              maxWidth: '75%',
              padding: '12px 16px',
              background: msg.role === 'user'
                ? 'rgba(217,78,24,0.15)'
                : 'rgba(255,255,255,0.04)',
              border: `1px solid ${msg.role === 'user' ? 'rgba(217,78,24,0.25)' : 'rgba(255,255,255,0.07)'}`,
              fontSize: 13.5,
              lineHeight: 1.65,
              color: msg.role === 'user' ? '#fff' : 'rgba(220,225,235,0.9)',
            }}>
              {msg.loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Loader2 size={14} color="#d94e18" style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: 12, color: 'rgba(185,190,200,0.4)' }}>Pensando...</span>
                </div>
              ) : msg.role === 'assistant' ? (
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
              ) : (
                <span>{msg.content}</span>
              )}
            </div>
          </div>
        ))}

        {/* Sugestões — mostra apenas no início */}
        {messages.length === 1 && (
          <div style={{ marginTop: 8 }}>
            <p style={{ fontSize: 11, color: 'rgba(185,190,200,0.35)', marginBottom: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Perguntas frequentes
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  style={{
                    padding: '8px 14px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(185,190,200,0.7)',
                    cursor: 'pointer', fontSize: 12,
                    fontFamily: 'inherit', transition: 'all 0.15s',
                    textAlign: 'left',
                  }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(217,78,24,0.4)'; e.currentTarget.style.color = '#d4783a' }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(185,190,200,0.7)' }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        display: 'flex', gap: 10, alignItems: 'flex-end',
        padding: '16px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escreva sua dúvida... (Enter para enviar)"
          rows={1}
          disabled={loading}
          style={{
            flex: 1, resize: 'none', minHeight: 44, maxHeight: 120,
            padding: '11px 14px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff', fontSize: 13,
            outline: 'none', fontFamily: 'inherit',
            lineHeight: 1.5,
            scrollbarWidth: 'none',
            overflow: 'auto',
          }}
          onFocus={e => (e.target.style.borderColor = '#d94e18')}
          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
          onInput={e => {
            const el = e.currentTarget
            el.style.height = 'auto'
            el.style.height = Math.min(el.scrollHeight, 120) + 'px'
          }}
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          style={{
            width: 44, height: 44, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: loading || !input.trim() ? 'rgba(217,78,24,0.3)' : '#d94e18',
            border: 'none', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s, box-shadow 0.15s',
          }}
          onMouseOver={e => { if (!loading && input.trim()) { e.currentTarget.style.background = '#c04010'; e.currentTarget.style.boxShadow = '0 0 16px rgba(217,78,24,0.5)' } }}
          onMouseOut={e => { e.currentTarget.style.background = loading || !input.trim() ? 'rgba(217,78,24,0.3)' : '#d94e18'; e.currentTarget.style.boxShadow = 'none' }}
        >
          {loading
            ? <Loader2 size={16} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
            : <Send size={16} color="#fff" />
          }
        </button>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
