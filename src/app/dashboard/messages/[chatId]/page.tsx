'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { Send, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ChatPage() {
  const { chatId } = useParams<{ chatId: string }>()
  const supabase = createClient()
  const router = useRouter()
  const bottomRef = useRef<HTMLDivElement>(null)

  const [profile, setProfile] = useState<any>(null)
  const [chat, setChat] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  const lastMsgTimestampRef = useRef<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: prof } = await supabase
        .from('profiles').select('*').eq('user_id', user.id).single()
      if (!prof) { router.push('/login'); return }
      setProfile(prof)

      const { data: chatData } = await supabase
        .from('chats')
        .select(`*, job:jobs(title, value, status), company:profiles!chats_company_id_fkey(name), freelancer:profiles!chats_freelancer_id_fkey(name)`)
        .eq('id', chatId)
        .single()
      setChat(chatData)

      const { data: msgs } = await supabase
        .from('messages')
        .select('*, sender:profiles(name)')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })

      const list = msgs ?? []
      setMessages(list)
      if (list.length > 0) {
        lastMsgTimestampRef.current = list[list.length - 1].created_at
      }
    }
    load()

    // Polling a cada 2s para buscar novas mensagens (funciona sem configuração extra)
    const interval = setInterval(async () => {
      const query = supabase
        .from('messages')
        .select('*, sender:profiles(name)')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })

      if (lastMsgTimestampRef.current) {
        query.gt('created_at', lastMsgTimestampRef.current)
      }

      const { data: newMsgs } = await query

      if (newMsgs && newMsgs.length > 0) {
        lastMsgTimestampRef.current = newMsgs[newMsgs.length - 1].created_at
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id))
          const fresh = newMsgs.filter(m => !existingIds.has(m.id))
          return fresh.length > 0 ? [...prev, ...fresh] : prev
        })
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [chatId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || !profile || sending) return
    setSending(true)

    const content = text.trim()
    setText('') // Limpa o input imediatamente

    // Adiciona mensagem na tela instantaneamente (otimista)
    const tempMsg = {
      id: `temp-${Date.now()}`,
      chat_id: chatId,
      sender_id: profile.id,
      content,
      created_at: new Date().toISOString(),
      sender: { name: profile.name },
    }
    setMessages(prev => [...prev, tempMsg])

    const { data: inserted } = await supabase.from('messages').insert({
      chat_id: chatId,
      sender_id: profile.id,
      content,
    }).select('*, sender:profiles(name)').single()

    // Substitui a mensagem temporária pela real
    if (inserted) {
      setMessages(prev => prev.map(m => m.id === tempMsg.id ? inserted : m))
    }

    setSending(false)
  }

  const other = profile?.role === 'company' ? chat?.freelancer : chat?.company

  return (
    <div style={{ color: '#fff', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>

      {/* Header */}
      <div style={{ marginBottom: 24, flexShrink: 0 }}>
        <Link href="/dashboard/messages" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 12, color: 'rgba(185,190,200,0.4)', textDecoration: 'none', marginBottom: 16,
        }}>
          <ArrowLeft size={12} /> Voltar para mensagens
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'linear-gradient(135deg, #d94e18, #1e2535)',
            border: '1px solid rgba(217,78,24,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>
            {other?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>
              {other?.name ?? '...'}
            </h1>
            {chat?.job && (
              <p style={{ fontSize: 12, color: 'rgba(185,190,200,0.4)', margin: 0 }}>
                {chat.job.title} · {formatCurrency(chat.job.value)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '20px',
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.02)',
        display: 'flex', flexDirection: 'column', gap: 12,
        marginBottom: 16,
      }}>
        {messages.length === 0 && (
          <p style={{ textAlign: 'center', color: 'rgba(185,190,200,0.3)', fontSize: 13, margin: 'auto' }}>
            Nenhuma mensagem ainda. Comece a conversa!
          </p>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_id === profile?.id
          return (
            <div key={msg.id} style={{
              display: 'flex', flexDirection: 'column',
              alignItems: isMine ? 'flex-end' : 'flex-start',
            }}>
              <div style={{
                maxWidth: '70%', padding: '10px 14px',
                background: isMine ? '#d94e18' : 'rgba(255,255,255,0.07)',
                border: `1px solid ${isMine ? 'transparent' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: isMine ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
              }}>
                <p style={{ fontSize: 14, color: '#fff', margin: 0, lineHeight: 1.5 }}>{msg.content}</p>
              </div>
              <span style={{ fontSize: 10, color: 'rgba(185,190,200,0.3)', marginTop: 4 }}>
                {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Escreva uma mensagem..."
          style={{
            flex: 1, padding: '14px 18px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff', fontSize: 14, outline: 'none',
            fontFamily: 'inherit', transition: 'border-color 0.2s',
          }}
          onFocus={e => (e.target.style.borderColor = '#d94e18')}
          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
        />
        <button type="submit" disabled={!text.trim() || sending} style={{
          padding: '14px 20px',
          background: text.trim() ? '#d94e18' : 'rgba(217,78,24,0.3)',
          border: 'none', cursor: text.trim() ? 'pointer' : 'not-allowed',
          color: '#fff', transition: 'background 0.2s', flexShrink: 0,
        }}>
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
