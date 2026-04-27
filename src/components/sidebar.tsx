'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Briefcase, MessageSquare,
  Star, Wallet, LogOut, PlusCircle, Settings, LifeBuoy,
} from 'lucide-react'
import type { Profile } from '@/types'

interface SidebarProps { profile: Profile }

export function Sidebar({ profile }: SidebarProps) {
  const pathname  = usePathname()
  const router    = useRouter()
  const supabase  = createClient()
  const isCompany = profile.role === 'company'

  const [unreadChats, setUnreadChats] = useState(0)

  // Guarda os IDs dos chats do usuário para filtrar eventos Realtime
  const chatIdsRef = useRef<string[]>([])

  // ── Busca quantidade de conversas com mensagens não lidas ─────────────────
  async function fetchUnread() {
    const myField     = isCompany ? 'company_id'           : 'freelancer_id'
    const lastReadCol = isCompany ? 'company_last_read_at' : 'freelancer_last_read_at'

    const { data: chats } = await supabase
      .from('chats')
      .select(`id, ${lastReadCol}`)
      .eq(myField, profile.id)

    if (!chats?.length) { setUnreadChats(0); return }

    // Salva IDs para o filtro Realtime
    chatIdsRef.current = chats.map(c => c.id)

    let count = 0
    for (const chat of chats) {
      const lastRead = (chat as any)[lastReadCol]

      let q = supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('chat_id', chat.id)
        .neq('sender_id', profile.id)

      if (lastRead) q = q.gt('created_at', lastRead)

      const { count: c } = await q
      if ((c ?? 0) > 0) count++
    }

    setUnreadChats(count)
  }

  useEffect(() => {
    // 1. Busca inicial
    fetchUnread()

    // 2. Realtime: ouve INSERT na tabela messages
    //    Quando chegar mensagem de outra pessoa num dos meus chats → atualiza badge
    const channel = supabase
      .channel(`sidebar-unread-${profile.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as { sender_id: string; chat_id: string }

          // Ignora mensagens enviadas por mim
          if (msg.sender_id === profile.id) return

          // Só atualiza se for num dos meus chats
          // (chatIdsRef pode estar vazio no primeiro evento — fetchUnread cuida disso)
          if (chatIdsRef.current.length === 0 || chatIdsRef.current.includes(msg.chat_id)) {
            fetchUnread()
          }
        }
      )
      .subscribe()

    // 3. Polling leve de fallback (30s) caso Realtime perca algum evento
    const interval = setInterval(fetchUnread, 30_000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, []) // mount apenas uma vez — Realtime mantém a conexão ativa

  // Ao navegar para fora do chat, re-verifica (o usuário pode ter saído sem ler tudo)
  useEffect(() => {
    if (!pathname.startsWith('/dashboard/messages/')) {
      fetchUnread()
    }
  }, [pathname])

  // ── Links da sidebar ──────────────────────────────────────────────────────
  const links = isCompany
    ? [
        { href: '/dashboard/company',          label: 'Dashboard',         icon: LayoutDashboard },
        { href: '/dashboard/company/post-job', label: 'Publicar trabalho', icon: PlusCircle      },
        { href: '/dashboard/company/jobs',     label: 'Meus trabalhos',    icon: Briefcase       },
        { href: '/dashboard/messages',         label: 'Mensagens',         icon: MessageSquare   },
        { href: '/dashboard/company/reviews',  label: 'Avaliações',        icon: Star            },
        { href: '/dashboard/settings',         label: 'Configurações',     icon: Settings        },
        { href: '/dashboard/support',          label: 'Suporte',           icon: LifeBuoy        },
      ]
    : [
        { href: '/dashboard/freelancer',          label: 'Dashboard',      icon: LayoutDashboard },
        { href: '/dashboard/freelancer/jobs',     label: 'Meus trabalhos', icon: Briefcase       },
        { href: '/dashboard/messages',            label: 'Mensagens',      icon: MessageSquare   },
        { href: '/dashboard/freelancer/withdraw', label: 'Sacar',          icon: Wallet          },
        { href: '/dashboard/freelancer/reviews',  label: 'Avaliações',     icon: Star            },
        { href: '/dashboard/settings',            label: 'Configurações',  icon: Settings        },
        { href: '/dashboard/support',             label: 'Suporte',        icon: LifeBuoy        },
      ]

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside style={{
      width: 240, background: '#0b0808',
      borderRight: '1px solid rgba(185,190,200,0.08)',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'var(--font-body), Inter, sans-serif',
    }}>
      {/* Logo */}
      <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid rgba(185,190,200,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#d94e18', boxShadow: '0 0 6px rgba(217,78,24,0.9)' }} />
          <span style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#d94e18' }}>
            {isCompany ? 'Empresa' : 'Freelancer'}
          </span>
        </div>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontFamily: 'var(--font-heading), DM Sans, sans-serif', fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
            Bico
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {links.map(({ href, label, icon: Icon }) => {
          const active     = pathname === href || (href !== '/dashboard/company' && href !== '/dashboard/freelancer' && pathname.startsWith(href))
          const isMessages = href === '/dashboard/messages'
          // Badge some quando está dentro de alguma conversa (já está lendo)
          const showBadge  = isMessages && unreadChats > 0 && !pathname.startsWith('/dashboard/messages/')

          return (
            <Link key={href} href={href} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px',
              background: active ? 'rgba(217,78,24,0.12)' : 'transparent',
              borderLeft: active ? '2px solid #d94e18' : '2px solid transparent',
              textDecoration: 'none',
              transition: 'all 0.15s',
            }}>
              {/* Ícone com ponto de notificação */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Icon
                  size={15}
                  style={{ color: active ? '#d94e18' : showBadge ? '#fff' : 'rgba(185,190,200,0.5)' }}
                />
                {showBadge && (
                  <span style={{
                    position:     'absolute',
                    top:          -3,
                    right:        -3,
                    width:        7,
                    height:       7,
                    borderRadius: '50%',
                    background:   '#d94e18',
                    border:       '1.5px solid #0b0808',
                    boxShadow:    '0 0 5px rgba(217,78,24,0.9)',
                  }} />
                )}
              </div>

              {/* Label */}
              <span style={{
                flex:       1,
                fontSize:   13,
                fontWeight: active || showBadge ? 600 : 400,
                color:      active ? '#fff' : showBadge ? '#fff' : 'rgba(185,190,200,0.6)',
              }}>
                {label}
              </span>

              {/* Contador */}
              {showBadge && (
                <span style={{
                  background:   '#d94e18',
                  color:        '#fff',
                  fontSize:     10,
                  fontWeight:   700,
                  borderRadius: 999,
                  padding:      '2px 7px',
                  minWidth:     20,
                  textAlign:    'center',
                  lineHeight:   '15px',
                  flexShrink:   0,
                  boxShadow:    '0 0 6px rgba(217,78,24,0.5)',
                }}>
                  {unreadChats > 9 ? '9+' : unreadChats}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div style={{ padding: '16px', borderTop: '1px solid rgba(185,190,200,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #d94e18, #1e2535)',
            border: '1px solid rgba(217,78,24,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#fff',
          }}>
            {profile.name?.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile.name}
            </p>
            <p style={{ fontSize: 11, color: 'rgba(185,190,200,0.4)', margin: 0 }}>
              ⭐ {profile.rating_count > 0 ? Number(profile.rating).toFixed(1) : 'Sem avaliações'}
            </p>
          </div>
        </div>
        <button onClick={handleLogout} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          width: '100%', padding: '8px 12px',
          background: 'transparent', border: 'none', cursor: 'pointer',
          fontSize: 12, color: 'rgba(185,190,200,0.4)',
          transition: 'color 0.15s', fontFamily: 'inherit',
        }}
          onMouseOver={e => (e.currentTarget.style.color = '#ef4444')}
          onMouseOut={e => (e.currentTarget.style.color = 'rgba(185,190,200,0.4)')}>
          <LogOut size={13} />
          Sair
        </button>
      </div>
    </aside>
  )
}
