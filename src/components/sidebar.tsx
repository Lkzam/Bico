'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  LayoutDashboard, Briefcase, MessageSquare,
  Star, Wallet, LogOut, PlusCircle, Settings, LifeBuoy,
  Bell, X, AlertCircle, ChevronLeft, ChevronRight,
} from 'lucide-react'
import type { Profile } from '@/types'

interface SidebarProps { profile: Profile }

export function Sidebar({ profile }: SidebarProps) {
  const pathname  = usePathname()
  const router    = useRouter()
  const supabase  = createClient()
  const isCompany = profile.role === 'company'

  const [collapsed,   setCollapsed]   = useState(false)
  const [unreadChats, setUnreadChats] = useState(0)
  const [notifCount,  setNotifCount]  = useState(0)
  const [notifOpen,   setNotifOpen]   = useState(false)
  const [notifList,   setNotifList]   = useState<any[]>([])

  const chatIdsRef = useRef<string[]>([])

  // Persiste preferência de colapso no localStorage (sem hydration mismatch)
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved === 'true') setCollapsed(true)
  }, [])

  function toggleCollapsed() {
    setCollapsed(c => {
      const next = !c
      localStorage.setItem('sidebar-collapsed', String(next))
      if (next) setNotifOpen(false) // fecha notificações ao colapsar
      return next
    })
  }

  // ── Notificações ─────────────────────────────────────────────────────────
  async function fetchNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(30)
    const list = data ?? []
    setNotifList(list)
    setNotifCount(list.filter((n: any) => !n.read).length)
  }

  async function markAllRead() {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('profile_id', profile.id)
      .eq('read', false)
    setNotifList(prev => prev.map(n => ({ ...n, read: true })))
    setNotifCount(0)
  }

  // ── Mensagens não lidas ───────────────────────────────────────────────────
  async function fetchUnread() {
    const myField     = isCompany ? 'company_id'           : 'freelancer_id'
    const lastReadCol = isCompany ? 'company_last_read_at' : 'freelancer_last_read_at'

    const { data: chats } = await supabase
      .from('chats')
      .select(`id, ${lastReadCol}`)
      .eq(myField, profile.id)

    if (!chats?.length) { setUnreadChats(0); return }

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
    fetchUnread()
    fetchNotifications()

    const messagesChannel = supabase
      .channel(`sidebar-unread-${profile.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as { sender_id: string; chat_id: string }
        if (msg.sender_id === profile.id) return
        if (chatIdsRef.current.length === 0 || chatIdsRef.current.includes(msg.chat_id)) fetchUnread()
      })
      .subscribe()

    const notifChannel = supabase
      .channel(`sidebar-notif-${profile.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `profile_id=eq.${profile.id}` }, (payload) => {
        const notif = payload.new as { id: string; title: string; body: string }
        toast.error(notif.body, { duration: 10000, description: notif.title })
        setNotifList(prev => [{ ...notif, read: false, created_at: new Date().toISOString() }, ...prev])
        setNotifCount(prev => prev + 1)
      })
      .subscribe()

    const interval = setInterval(fetchUnread, 30_000)

    return () => {
      supabase.removeChannel(messagesChannel)
      supabase.removeChannel(notifChannel)
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (!pathname.startsWith('/dashboard/messages/')) fetchUnread()
  }, [pathname])

  // ── Links ─────────────────────────────────────────────────────────────────
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

  const sidebarWidth = collapsed ? 64 : 240

  return (
    <aside style={{
      width: sidebarWidth,
      minWidth: sidebarWidth,
      background: '#0b0808',
      borderRight: '1px solid rgba(185,190,200,0.08)',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'var(--font-body), Inter, sans-serif',
      transition: 'width 0.2s ease, min-width 0.2s ease',
      overflow: 'hidden',
    }}>

      {/* ── Logo ── */}
      <div style={{ padding: collapsed ? '24px 0 16px' : '28px 24px 20px', borderBottom: '1px solid rgba(185,190,200,0.08)', transition: 'padding 0.2s', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start' }}>
        {collapsed ? (
          /* Só o ponto quando colapsado */
          <div title={isCompany ? 'Bico — Empresa' : 'Bico — Freelancer'} style={{ width: 8, height: 8, borderRadius: '50%', background: '#d94e18', boxShadow: '0 0 6px rgba(217,78,24,0.9)', flexShrink: 0 }} />
        ) : (
          <div>
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
        )}
      </div>

      {/* ── Nav ── */}
      <nav style={{ flex: 1, padding: collapsed ? '16px 8px' : '16px 12px', display: 'flex', flexDirection: 'column', gap: 2, transition: 'padding 0.2s' }}>
        {links.map(({ href, label, icon: Icon }) => {
          const active     = pathname === href || (href !== '/dashboard/company' && href !== '/dashboard/freelancer' && pathname.startsWith(href))
          const isMessages = href === '/dashboard/messages'
          const showBadge  = isMessages && unreadChats > 0 && !pathname.startsWith('/dashboard/messages/')

          return (
            <Link key={href} href={href} title={collapsed ? label : undefined} style={{
              display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10,
              padding: collapsed ? '10px 0' : '10px 12px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              background: active ? 'rgba(217,78,24,0.12)' : 'transparent',
              borderLeft: collapsed ? 'none' : (active ? '2px solid #d94e18' : '2px solid transparent'),
              borderRadius: collapsed ? 8 : 0,
              textDecoration: 'none',
              transition: 'all 0.15s',
            }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Icon size={15} style={{ color: active ? '#d94e18' : showBadge ? '#fff' : 'rgba(185,190,200,0.5)' }} />
                {showBadge && (
                  <span style={{
                    position: 'absolute', top: -3, right: -3,
                    width: 7, height: 7, borderRadius: '50%',
                    background: '#d94e18', border: '1.5px solid #0b0808',
                    boxShadow: '0 0 5px rgba(217,78,24,0.9)',
                  }} />
                )}
              </div>

              {!collapsed && (
                <>
                  <span style={{
                    flex: 1,
                    fontSize: 13,
                    fontWeight: active || showBadge ? 600 : 400,
                    color: active ? '#fff' : showBadge ? '#fff' : 'rgba(185,190,200,0.6)',
                    whiteSpace: 'nowrap',
                  }}>
                    {label}
                  </span>
                  {showBadge && (
                    <span style={{
                      background: '#d94e18', color: '#fff',
                      fontSize: 10, fontWeight: 700,
                      borderRadius: 999, padding: '2px 7px',
                      minWidth: 20, textAlign: 'center', lineHeight: '15px',
                      flexShrink: 0, boxShadow: '0 0 6px rgba(217,78,24,0.5)',
                    }}>
                      {unreadChats > 9 ? '9+' : unreadChats}
                    </span>
                  )}
                </>
              )}
            </Link>
          )
        })}

        {/* ── Botão colapsar ── */}
        <div style={{ marginTop: 'auto', paddingTop: 8 }}>
          <button
            onClick={toggleCollapsed}
            title={collapsed ? 'Expandir menu' : 'Minimizar menu'}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              justifyContent: collapsed ? 'center' : 'flex-start',
              width: '100%', padding: collapsed ? '10px 0' : '10px 12px',
              background: 'transparent', border: 'none', cursor: 'pointer',
              borderRadius: 6,
              transition: 'all 0.15s',
            }}
            onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
            onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
          >
            {collapsed
              ? <ChevronRight size={15} style={{ color: 'rgba(185,190,200,0.4)' }} />
              : <>
                  <ChevronLeft size={15} style={{ color: 'rgba(185,190,200,0.4)' }} />
                  <span style={{ fontSize: 12, color: 'rgba(185,190,200,0.35)', whiteSpace: 'nowrap' }}>Minimizar</span>
                </>
            }
          </button>
        </div>
      </nav>

      {/* ── User ── */}
      <div style={{ padding: collapsed ? '16px 8px' : '16px', borderTop: '1px solid rgba(185,190,200,0.08)', transition: 'padding 0.2s' }}>
        {collapsed ? (
          /* Modo colapsado: avatar + sino centralizados */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div title={profile.name} style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, #d94e18, #1e2535)',
              border: '1px solid rgba(217,78,24,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              {profile.name?.slice(0, 2).toUpperCase()}
            </div>

            <button
              title="Notificações"
              onClick={() => setNotifOpen(o => !o)}
              style={{
                position: 'relative',
                background: notifOpen ? 'rgba(217,78,24,0.15)' : 'transparent',
                border: notifOpen ? '1px solid rgba(217,78,24,0.4)' : '1px solid transparent',
                borderRadius: 6, padding: 7, cursor: 'pointer',
                color: notifCount > 0 ? '#d94e18' : 'rgba(185,190,200,0.4)',
                transition: 'all 0.15s', display: 'flex', alignItems: 'center',
              }}
            >
              <Bell size={15} />
              {notifCount > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  minWidth: 16, height: 16, borderRadius: 999,
                  background: '#d94e18', color: '#fff',
                  fontSize: 9, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px', border: '1.5px solid #0b0808',
                  boxShadow: '0 0 6px rgba(217,78,24,0.8)', lineHeight: 1,
                }}>
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </button>

            <button onClick={handleLogout} title="Sair" style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'rgba(185,190,200,0.4)', padding: 7, display: 'flex', alignItems: 'center',
              borderRadius: 6, transition: 'color 0.15s',
            }}
              onMouseOver={e => (e.currentTarget.style.color = '#ef4444')}
              onMouseOut={e => (e.currentTarget.style.color = 'rgba(185,190,200,0.4)')}>
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          /* Modo expandido: layout normal */
          <>
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

              {/* Sino */}
              <button
                onClick={() => { setNotifOpen(o => !o); if (!notifOpen && notifCount > 0) markAllRead() }}
                title="Notificações"
                style={{
                  position: 'relative', flexShrink: 0,
                  background: notifOpen ? 'rgba(217,78,24,0.15)' : 'transparent',
                  border: notifOpen ? '1px solid rgba(217,78,24,0.4)' : '1px solid transparent',
                  borderRadius: 6, padding: 7, cursor: 'pointer',
                  color: notifCount > 0 ? '#d94e18' : 'rgba(185,190,200,0.4)',
                  transition: 'all 0.15s', display: 'flex', alignItems: 'center',
                }}
                onMouseOver={e => { if (!notifOpen) (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
                onMouseOut={e => { if (!notifOpen) (e.currentTarget as HTMLButtonElement).style.color = notifCount > 0 ? '#d94e18' : 'rgba(185,190,200,0.4)' }}
              >
                <Bell size={15} />
                {notifCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -4,
                    minWidth: 16, height: 16, borderRadius: 999,
                    background: '#d94e18', color: '#fff',
                    fontSize: 9, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 4px', border: '1.5px solid #0b0808',
                    boxShadow: '0 0 6px rgba(217,78,24,0.8)', lineHeight: 1,
                  }}>
                    {notifCount > 9 ? '9+' : notifCount}
                  </span>
                )}
              </button>
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
          </>
        )}
      </div>

      {/* ── Painel de notificações ── */}
      {notifOpen && (
        <div style={{
          position: 'fixed',
          bottom: 80,
          left: collapsed ? 72 : 248,
          width: 340, maxHeight: 480,
          background: '#0f1219',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          zIndex: 2000,
          display: 'flex', flexDirection: 'column',
          borderRadius: 2,
          transition: 'left 0.2s ease',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell size={13} style={{ color: '#d94e18' }} />
              <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(185,190,200,0.6)' }}>
                Notificações
              </span>
            </div>
            <button onClick={() => setNotifOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(185,190,200,0.4)', padding: 2, display: 'flex' }}>
              <X size={14} />
            </button>
          </div>

          {/* Lista */}
          <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(217,78,24,0.3) transparent' }}>
            {notifList.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <Bell size={28} style={{ color: 'rgba(185,190,200,0.1)', margin: '0 auto 10px', display: 'block' }} />
                <p style={{ fontSize: 13, color: 'rgba(185,190,200,0.35)', margin: 0 }}>Nenhuma notificação ainda</p>
              </div>
            ) : (
              notifList.map((n: any) => (
                <div key={n.id} style={{
                  padding: '13px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  background: n.read ? 'transparent' : 'rgba(217,78,24,0.05)',
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
                  }}>
                    <AlertCircle size={13} style={{ color: '#ef4444' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, color: n.read ? 'rgba(185,190,200,0.55)' : '#fff', margin: '0 0 3px', lineHeight: 1.4 }}>{n.body}</p>
                    <p style={{ fontSize: 10, color: 'rgba(185,190,200,0.3)', margin: 0 }}>
                      {new Date(n.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {!n.read && (
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#d94e18', flexShrink: 0, marginTop: 4, boxShadow: '0 0 5px rgba(217,78,24,0.7)' }} />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifList.length > 0 && (
            <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.07)', textAlign: 'right' }}>
              <button
                onClick={async () => {
                  await supabase.from('notifications').delete().eq('profile_id', profile.id)
                  setNotifList([])
                  setNotifCount(0)
                }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 11, color: 'rgba(185,190,200,0.35)',
                  fontFamily: 'inherit', transition: 'color 0.15s',
                }}
                onMouseOver={e => (e.currentTarget.style.color = '#ef4444')}
                onMouseOut={e => (e.currentTarget.style.color = 'rgba(185,190,200,0.35)')}>
                Limpar todas
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
