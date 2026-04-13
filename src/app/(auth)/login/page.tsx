'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Toaster } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    })

    if (error) {
      toast.error('Email ou senha inválidos.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0b0e17', display: 'flex', fontFamily: 'var(--font-body), Inter, sans-serif' }}>
      <Toaster position="top-right" richColors />

      {/* Painel esquerdo — dark com quote */}
      <div style={{
        display: 'none',
        width: '48%',
        background: '#0b0808',
        borderRight: '1px solid rgba(185,190,200,0.08)',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px 60px',
      }} className="left-panel">
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontFamily: 'var(--font-heading), DM Sans, sans-serif', fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Bico</span>
        </Link>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#d94e18', boxShadow: '0 0 8px rgba(217,78,24,0.9)' }} />
            <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#d94e18' }}>
              Depoimento real
            </span>
          </div>
          <p style={{
            fontFamily: 'var(--font-body), Inter, sans-serif',
            fontSize: 'clamp(1.5rem, 2.5vw, 2.2rem)',
            fontWeight: 800, lineHeight: 1.15,
            letterSpacing: '-0.02em', color: '#fff',
            margin: '0 0 20px',
          }}>
            "Fiz R$1.200 no<br />
            <span style={{ color: 'rgba(160,152,148,0.88)' }}>primeiro mês sem<br />sair de casa."</span>
          </p>
          <p style={{ fontSize: 13, color: 'rgba(185,190,200,0.5)', margin: 0 }}>— Ana Lima, Designer Gráfica · São Paulo</p>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'rgba(185,190,200,0.3)' }}>© 2025 Bico</p>
      </div>

      {/* Painel direito — formulário */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 32px' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Logo mobile */}
          <div style={{ marginBottom: 48, textAlign: 'center' }}>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <span style={{ fontFamily: 'var(--font-heading), DM Sans, sans-serif', fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Bico</span>
            </Link>
          </div>

          {/* Eyebrow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#d94e18', boxShadow: '0 0 6px rgba(217,78,24,0.9)' }} />
            <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#d94e18' }}>Acesse sua conta</span>
          </div>

          <h1 style={{
            fontFamily: 'var(--font-body), Inter, sans-serif',
            fontSize: 'clamp(2rem, 4vw, 2.8rem)',
            fontWeight: 900, lineHeight: 1.05,
            letterSpacing: '-0.03em', color: '#fff',
            margin: '0 0 8px',
          }}>
            Bem-vindo<br />
            <span style={{ color: 'rgba(160,152,148,0.88)' }}>de volta</span>
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(185,190,200,0.6)', margin: '0 0 40px' }}>
            Entre na sua conta para continuar
          </p>

          {/* Form */}
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(185,190,200,0.6)', marginBottom: 10 }}>
                Email
              </label>
              <input
                type="email"
                placeholder="seu@email.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
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
                Senha
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
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div style={{ marginTop: 32, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
            <span style={{ fontSize: 13, color: 'rgba(185,190,200,0.5)' }}>Não tem conta? </span>
            <Link href="/register" style={{ fontSize: 13, fontWeight: 700, color: '#d4783a', textDecoration: 'none' }}>
              Cadastre-se grátis
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
