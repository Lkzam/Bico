'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { MessageSquare, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function MessagesPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [chats, setChats]         = useState<any[]>([])
  const [profile, setProfile]     = useState<any>(null)
  const [isCompany, setIsCompany] = useState(false)
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({})
  const [loaded, setLoaded]       = useState(false)

  // Refs para uso dentro do callback Realtime (evita closure stale)
  const profileRef   = useRef<any>(null)
  const isCompanyRef = useRef(false)
  const chatsRef     = useRef<any[]>([])

  // ── Calcula não lidos para cada chat ──────────────────────────────────────
  async function computeUnread(chatList: any[], prof: any, company: boolean) {
    const lastReadCol = company ? 'company_last_read_at' : 'freelancer_last_read_at'
    const map: Record<string, number> = {}

    for (const chat of chatList) {
      const lastRead = chat[lastReadCol]

      let q = supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('chat_id', chat.id)
        .neq('sender_id', prof.id)

      if (lastRead) q = q.gt('created_at', lastRead)

      const { count } = await q
      if ((count ?? 0) > 0) map[chat.id] = count ?? 0
    }

    setUnreadMap(map)
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: prof } = await supabase
        .from('profiles').select('*').eq('user_id', user.id).single()
      if (!prof) { router.push('/login'); return }

      const company = prof.role === 'company'
      setIsCompany(company)
      setProfile(prof)
      profileRef.current   = prof
      isCompanyRef.current = company

      const { data } = await supabase
        .from('chats')
        .select(`
          *,
          job:jobs(title, value, status),
          company:profiles!chats_company_id_fkey(name),
          freelancer:profiles!chats_freelancer_id_fkey(name),
          company_last_read_at,
          freelancer_last_read_at
        `)
        .eq(company ? 'company_id' : 'freelancer_id', prof.id)
        .order('created_at', { ascending: false })

      const chatList = data ?? []
      setChats(chatList)
      chatsRef.current = chatList

      await computeUnread(chatList, prof, company)
      setLoaded(true)
    }

    load()

    // ── Realtime: ouve novas mensagens e atualiza badge por chat ─────────────
    const channel = supabase
      .channel('messages-list-unread')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as { sender_id: string; chat_id: string }
          const prof    = profileRef.current
          const company = isCompanyRef.current

          if (!prof || msg.sender_id === prof.id) return

          // Verifica se é num dos meus chats
          const chat = chatsRef.current.find(c => c.id === msg.chat_id)
          if (!chat) return

          // Incrementa o badge deste chat imediatamente
          setUnreadMap(prev => ({
            ...prev,
            [msg.chat_id]: (prev[msg.chat_id] ?? 0) + 1,
          }))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  if (!loaded) return null

  const totalUnread = Object.keys(unreadMap).length

  return (
    <div style={{ color: '#fff' }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#d94e18', boxShadow: '0 0 6px rgba(217,78,24,0.9)' }} />
          <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#d94e18' }}>
            Mensagens
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: 900, letterSpacing: '-0.03em', margin: 0, color: '#fff' }}>
            Conversas
          </h1>
          {totalUnread > 0 && (
            <span style={{
              background: '#d94e18', color: '#fff',
              fontSize: 12, fontWeight: 700,
              borderRadius: 999, padding: '3px 10px',
              boxShadow: '0 0 8px rgba(217,78,24,0.4)',
            }}>
              {totalUnread} não {totalUnread === 1 ? 'lida' : 'lidas'}
            </span>
          )}
        </div>
      </div>

      <div style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
        {chats.length === 0 ? (
          <div style={{ padding: '64px 32px', textAlign: 'center' }}>
            <MessageSquare size={40} style={{ color: 'rgba(185,190,200,0.15)', margin: '0 auto 16px', display: 'block' }} />
            <p style={{ fontSize: 14, color: 'rgba(185,190,200,0.5)', margin: '0 0 6px' }}>
              Nenhuma conversa ainda.
            </p>
            <p style={{ fontSize: 12, color: 'rgba(185,190,200,0.3)', margin: 0 }}>
              {isCompany
                ? 'Quando um freelancer aceitar um trabalho, o chat será aberto aqui.'
                : 'Quando você aceitar um trabalho, o chat com a empresa será aberto aqui.'}
            </p>
          </div>
        ) : (
          chats.map((chat: any, i: number) => {
            const other     = isCompany ? chat.freelancer : chat.company
            const unread    = unreadMap[chat.id] ?? 0
            const hasUnread = unread > 0

            return (
              <Link
                key={chat.id}
                href={`/dashboard/messages/${chat.id}`}
                onClick={() => {
                  // Remove badge desta conversa ao clicar (vai marcar como lido)
                  setUnreadMap(prev => {
                    const next = { ...prev }
                    delete next[chat.id]
                    return next
                  })
                }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '18px 24px',
                  borderBottom: i < chats.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  textDecoration: 'none', transition: 'background 0.15s',
                  background: hasUnread ? 'rgba(217,78,24,0.05)' : 'transparent',
                  borderLeft: hasUnread ? '2px solid rgba(217,78,24,0.6)' : '2px solid transparent',
                }}
                onMouseOver={e => (e.currentTarget.style.background = hasUnread ? 'rgba(217,78,24,0.1)' : 'rgba(255,255,255,0.03)')}
                onMouseOut={e => (e.currentTarget.style.background = hasUnread ? 'rgba(217,78,24,0.05)' : 'transparent')}
              >
                {/* Avatar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: '50%',
                      background: hasUnread
                        ? 'linear-gradient(135deg, #d94e18, #a03010)'
                        : 'linear-gradient(135deg, #d94e18, #1e2535)',
                      border: hasUnread ? '2px solid rgba(217,78,24,0.7)' : '1px solid rgba(217,78,24,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 15, fontWeight: 700, color: '#fff',
                    }}>
                      {other?.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    {/* Bolinha verde "online / nova mensagem" */}
                    {hasUnread && (
                      <span style={{
                        position: 'absolute', bottom: 1, right: 1,
                        width: 11, height: 11, borderRadius: '50%',
                        background: '#22c55e',
                        border: '2px solid #0b0808',
                        boxShadow: '0 0 5px rgba(34,197,94,0.8)',
                      }} />
                    )}
                  </div>

                  {/* Nome + job */}
                  <div>
                    <p style={{
                      fontSize: 14,
                      fontWeight: hasUnread ? 700 : 500,
                      color: hasUnread ? '#fff' : 'rgba(255,255,255,0.85)',
                      margin: '0 0 3px',
                    }}>
                      {other?.name ?? 'Usuário'}
                    </p>
                    <p style={{ fontSize: 12, color: 'rgba(185,190,200,0.4)', margin: 0 }}>
                      {chat.job?.title} · {formatDate(chat.created_at)}
                    </p>
                  </div>
                </div>

                {/* Badge ou seta */}
                <div style={{ flexShrink: 0 }}>
                  {hasUnread ? (
                    <span style={{
                      background: '#d94e18',
                      color: '#fff',
                      fontSize: 11, fontWeight: 800,
                      borderRadius: 999,
                      padding: '3px 9px',
                      minWidth: 24, textAlign: 'center',
                      display: 'inline-block',
                      boxShadow: '0 0 8px rgba(217,78,24,0.6)',
                    }}>
                      {unread > 99 ? '99+' : unread}
                    </span>
                  ) : (
                    <ArrowRight size={14} style={{ color: 'rgba(185,190,200,0.25)' }} />
                  )}
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
