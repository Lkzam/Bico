'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { MessageSquare, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function MessagesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [chats, setChats] = useState<any[]>([])
  const [isCompany, setIsCompany] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('*').eq('user_id', user.id).single()
      if (!profile) { router.push('/login'); return }

      const company = profile.role === 'company'
      setIsCompany(company)

      const { data } = await supabase
        .from('chats')
        .select(`*, job:jobs(title, value, status), company:profiles!chats_company_id_fkey(name), freelancer:profiles!chats_freelancer_id_fkey(name)`)
        .eq(company ? 'company_id' : 'freelancer_id', profile.id)
        .order('created_at', { ascending: false })
      setChats(data ?? [])
      setLoaded(true)
    }
    load()
  }, [])

  if (!loaded) return null

  return (
    <div style={{ color: '#fff' }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#d94e18', boxShadow: '0 0 6px rgba(217,78,24,0.9)' }} />
          <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#d94e18' }}>
            Mensagens
          </span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: 900, letterSpacing: '-0.03em', margin: 0, color: '#fff' }}>
          Conversas
        </h1>
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
            const other = isCompany ? chat.freelancer : chat.company
            return (
              <Link key={chat.id} href={`/dashboard/messages/${chat.id}`} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '20px 24px',
                borderBottom: i < chats.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                textDecoration: 'none', transition: 'background 0.15s',
              }}
                onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #d94e18, #1e2535)',
                    border: '1px solid rgba(217,78,24,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, color: '#fff',
                  }}>
                    {other?.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: '0 0 3px' }}>
                      {other?.name ?? 'Usuário'}
                    </p>
                    <p style={{ fontSize: 12, color: 'rgba(185,190,200,0.4)', margin: 0 }}>
                      {chat.job?.title} · {formatDate(chat.created_at)}
                    </p>
                  </div>
                </div>
                <ArrowRight size={14} style={{ color: 'rgba(185,190,200,0.3)', flexShrink: 0 }} />
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
