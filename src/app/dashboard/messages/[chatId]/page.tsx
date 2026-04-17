'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { Send, ArrowLeft, Paperclip, X, FileText, Image as ImageIcon, File } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function ChatPage() {
  const { chatId } = useParams<{ chatId: string }>()
  const supabase = createClient()
  const router = useRouter()
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<any>(null)
  const [chat, setChat] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)

  const lastMsgTimestampRef = useRef<string | null>(null)
  const profileRef = useRef<any>(null)

  // Marca mensagens como lidas via API
  async function markAsRead() {
    await fetch(`/api/chats/${chatId}/mark-read`, { method: 'POST' })
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: prof } = await supabase
        .from('profiles').select('*').eq('user_id', user.id).single()
      if (!prof) { router.push('/login'); return }
      setProfile(prof)
      profileRef.current = prof

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

      // Marca tudo como lido ao abrir o chat
      markAsRead()
    }
    load()

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

        // Filtra só as mensagens da outra pessoa (nova mensagem recebida)
        const fromOther = newMsgs.filter(m => m.sender_id !== profileRef.current?.id)

        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id))
          const fresh = newMsgs.filter(m => !existingIds.has(m.id))
          return fresh.length > 0 ? [...prev, ...fresh] : prev
        })

        // Marca como lido ao receber mensagem enquanto está na tela
        if (fromOther.length > 0) markAsRead()
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [chatId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 50 * 1024 * 1024) { toast.error('Arquivo muito grande. Máximo 50MB.'); return }
    setSelectedFile(file)
    if (file.type.startsWith('image/')) {
      setFilePreview(URL.createObjectURL(file))
    } else {
      setFilePreview(null)
    }
    // reset input so same file can be selected again
    e.target.value = ''
  }

  function clearFile() {
    setSelectedFile(null)
    setFilePreview(null)
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if ((!text.trim() && !selectedFile) || !profile || sending) return
    setSending(true)

    let file_url: string | null = null
    let file_name: string | null = null
    let file_type: string | null = null

    // Upload do arquivo se houver
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop()
      const path = `${chatId}/${Date.now()}-${selectedFile.name}`
      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(path, selectedFile, { upsert: true })

      if (uploadError) {
        toast.error('Erro ao enviar arquivo.')
        setSending(false)
        return
      }

      const { data: urlData } = supabase.storage.from('chat-files').getPublicUrl(path)
      file_url = urlData.publicUrl
      file_name = selectedFile.name
      file_type = selectedFile.type
    }

    const content = text.trim() || ''
    clearFile()
    setText('')

    // Otimista
    const tempMsg = {
      id: `temp-${Date.now()}`,
      chat_id: chatId,
      sender_id: profile.id,
      content: content || null,
      file_url,
      file_name,
      file_type,
      created_at: new Date().toISOString(),
      sender: { name: profile.name },
    }
    setMessages(prev => [...prev, tempMsg])

    const { data: inserted, error: insertError } = await supabase.from('messages').insert({
      chat_id: chatId,
      sender_id: profile.id,
      content: content || null,
      file_url,
      file_name,
      file_type,
    }).select('*, sender:profiles(name)').maybeSingle()

    if (insertError) {
      console.error('Erro ao inserir mensagem:', insertError)
      toast.error('Erro ao enviar mensagem.')
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id))
      setSending(false)
      return
    }

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
          const isImage = msg.file_type?.startsWith('image/')
          return (
            <div key={msg.id} style={{
              display: 'flex', flexDirection: 'column',
              alignItems: isMine ? 'flex-end' : 'flex-start',
            }}>
              <div style={{
                maxWidth: '70%',
                background: isMine ? '#d94e18' : 'rgba(255,255,255,0.07)',
                border: `1px solid ${isMine ? 'transparent' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: isMine ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                overflow: 'hidden',
              }}>
                {/* Imagem */}
                {msg.file_url && isImage && (
                  <a href={msg.file_url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={msg.file_url}
                      alt={msg.file_name ?? 'imagem'}
                      style={{ display: 'block', maxWidth: '100%', maxHeight: 260, objectFit: 'cover', cursor: 'pointer' }}
                    />
                  </a>
                )}

                {/* Arquivo não-imagem */}
                {msg.file_url && !isImage && (
                  <a href={msg.file_url} target="_blank" rel="noopener noreferrer" style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', textDecoration: 'none',
                    borderBottom: msg.content ? '1px solid rgba(255,255,255,0.1)' : 'none',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 6, flexShrink: 0,
                      background: isMine ? 'rgba(255,255,255,0.15)' : 'rgba(217,78,24,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <FileText size={16} style={{ color: isMine ? '#fff' : '#d94e18' }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#fff', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                        {msg.file_name ?? 'arquivo'}
                      </p>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', margin: 0 }}>Clique para baixar</p>
                    </div>
                  </a>
                )}

                {/* Texto */}
                {msg.content && (
                  <p style={{ fontSize: 14, color: '#fff', margin: 0, lineHeight: 1.5, padding: '10px 14px' }}>
                    {msg.content}
                  </p>
                )}
              </div>
              <span style={{ fontSize: 10, color: 'rgba(185,190,200,0.3)', marginTop: 4 }}>
                {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Preview do arquivo selecionado */}
      {selectedFile && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 14px', marginBottom: 8,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(217,78,24,0.3)',
        }}>
          {filePreview ? (
            <img src={filePreview} alt="preview" style={{ width: 48, height: 48, objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 48, height: 48, background: 'rgba(217,78,24,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileText size={20} style={{ color: '#d94e18' }} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedFile.name}
            </p>
            <p style={{ fontSize: 11, color: 'rgba(185,190,200,0.4)', margin: 0 }}>
              {(selectedFile.size / 1024).toFixed(0)} KB
            </p>
          </div>
          <button onClick={clearFile} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(185,190,200,0.4)', padding: 4 }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Input */}
      <form onSubmit={sendMessage} style={{ display: 'flex', gap: 10, flexShrink: 0, alignItems: 'flex-end' }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.zip,.rar,.txt,.xls,.xlsx,.psd,.ai,.sketch,.fig"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {/* Botão de anexo */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: '14px 14px', flexShrink: 0,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(185,190,200,0.5)',
            cursor: 'pointer', transition: 'all 0.2s',
          }}
          onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#d94e18'; (e.currentTarget as HTMLButtonElement).style.color = '#d94e18' }}
          onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(185,190,200,0.5)' }}
        >
          <Paperclip size={16} />
        </button>

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

        <button type="submit" disabled={(!text.trim() && !selectedFile) || sending} style={{
          padding: '14px 20px', flexShrink: 0,
          background: (text.trim() || selectedFile) ? '#d94e18' : 'rgba(217,78,24,0.3)',
          border: 'none', cursor: (text.trim() || selectedFile) ? 'pointer' : 'not-allowed',
          color: '#fff', transition: 'background 0.2s',
        }}>
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
