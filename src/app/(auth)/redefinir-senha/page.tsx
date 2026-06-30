'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast, Toaster } from 'sonner'

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  const [checking, setChecking] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ password: '', confirm: '' })

  // Só permite redefinir quem chegou com sessão de recuperação válida
  // (criada pelo /auth/callback ao trocar o code do link de email).
  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setAuthorized(true)
      setChecking(false)
    }
    check()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (form.password.length < 8) {
      toast.error('A senha precisa ter pelo menos 8 caracteres.')
      return
    }
    if (form.password !== form.confirm) {
      toast.error('As senhas não coincidem.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: form.password })
    setLoading(false)

    if (error) {
      toast.error('Não foi possível atualizar a senha. Tente novamente.')
      return
    }

    toast.success('Senha atualizada com sucesso!')
    setTimeout(() => {
      router.push('/dashboard')
      router.refresh()
    }, 1200)
  }

  if (checking) return null

  return (
    <div style={{ minHeight: '100vh', background: '#0b0e17', display: 'flex', fontFamily: 'var(--font-body), Inter, sans-serif' }}>
      <Toaster position="top-right" richColors />

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 32px' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Logo */}
          <div style={{ marginBottom: 48, textAlign: 'center' }}>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <span style={{ fontFamily: 'var(--font-heading), DM Sans, sans-serif', fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Bico</span>
            </Link>
          </div>

          {!authorized ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 6px rgba(239,68,68,0.9)' }} />
                <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#ef4444' }}>Link inválido</span>
              </div>
              <h1 style={{
                fontFamily: 'var(--font-body), Inter, sans-serif',
                fontSize: 'clamp(1.8rem, 4vw, 2.4rem)',
                fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.03em', color: '#fff',
                margin: '0 0 8px',
              }}>
                Link expirado<br />
                <span style={{ color: 'rgba(160,152,148,0.88)' }}>ou inválido</span>
              </h1>
              <p style={{ fontSize: 14, color: 'rgba(185,190,200,0.6)', margin: '0 0 32px', lineHeight: 1.6 }}>
                Este link de recuperação não é mais válido. Solicite um novo para continuar.
              </p>
              <Link href="/esqueci-senha" style={{
                display: 'block', textAlign: 'center',
                width: '100%', padding: '15px 32px', boxSizing: 'border-box',
                background: '#d94e18', color: '#fff', textDecoration: 'none',
                fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
              }}>
                Solicitar novo link
              </Link>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#d94e18', boxShadow: '0 0 6px rgba(217,78,24,0.9)' }} />
                <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#d94e18' }}>Nova senha</span>
              </div>

              <h1 style={{
                fontFamily: 'var(--font-body), Inter, sans-serif',
                fontSize: 'clamp(2rem, 4vw, 2.8rem)',
                fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.03em', color: '#fff',
                margin: '0 0 8px',
              }}>
                Criar nova<br />
                <span style={{ color: 'rgba(160,152,148,0.88)' }}>senha</span>
              </h1>
              <p style={{ fontSize: 14, color: 'rgba(185,190,200,0.6)', margin: '0 0 40px' }}>
                Escolha uma senha forte com pelo menos 8 caracteres.
              </p>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(185,190,200,0.6)', marginBottom: 10 }}>
                    Nova senha
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    required
                    style={{
                      width: '100%', padding: '14px 18px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff', fontSize: 14,
                      outline: 'none', transition: 'border-color 0.2s',
                      fontFamily: 'inherit',
                    }}
                    onFocus={e => (e.target.style.borderColor = '#d94e18')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                  />
                </div>

                <div style={{ marginBottom: 32 }}>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(185,190,200,0.6)', marginBottom: 10 }}>
                    Confirmar senha
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={form.confirm}
                    onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                    required
                    style={{
                      width: '100%', padding: '14px 18px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff', fontSize: 14,
                      outline: 'none', transition: 'border-color 0.2s',
                      fontFamily: 'inherit',
                    }}
                    onFocus={e => (e.target.style.borderColor = '#d94e18')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%', padding: '15px 32px',
                    background: loading ? 'rgba(217,78,24,0.5)' : '#d94e18',
                    color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                    transition: 'background 0.2s, box-shadow 0.2s',
                    fontFamily: 'inherit',
                  }}
                  onMouseOver={e => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.background = '#c04010'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(217,78,24,0.4)'; } }}
                  onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.background = loading ? 'rgba(217,78,24,0.5)' : '#d94e18'; (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'; }}
                >
                  {loading ? 'Salvando...' : 'Atualizar senha'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
