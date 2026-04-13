'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Toaster } from 'sonner'
import type { UserRole } from '@/types'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState<UserRole>('freelancer')
  const [form, setForm] = useState({ email: '', password: '', name: '', bio: '' })

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { role, name: form.name } },
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    if (!data.user) {
      toast.error('Erro ao criar conta. Tente novamente.')
      setLoading(false)
      return
    }

    // Usa API route com admin client para garantir criação do perfil
    const res = await fetch('/api/auth/complete-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, bio: form.bio, role }),
    })

    if (!res.ok) {
      toast.error('Conta criada, mas erro ao salvar perfil. Tente entrar e completar o perfil.')
      setLoading(false)
      router.push('/login')
      return
    }

    toast.success('Conta criada com sucesso!')
    router.push('/dashboard')
    router.refresh()
  }

  const inputStyle = {
    width: '100%', padding: '14px 18px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff', fontSize: 14,
    outline: 'none', transition: 'border-color 0.2s',
    fontFamily: 'inherit',
  }

  const labelStyle = {
    display: 'block' as const,
    fontSize: '0.65rem', fontWeight: 700,
    letterSpacing: '0.14em', textTransform: 'uppercase' as const,
    color: 'rgba(185,190,200,0.6)', marginBottom: 10,
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0b0e17', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', fontFamily: 'var(--font-body), Inter, sans-serif' }}>
      <Toaster position="top-right" richColors />

      <div style={{ width: '100%', maxWidth: 480 }}>

        {/* Logo */}
        <div style={{ marginBottom: 48, textAlign: 'center' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: 'var(--font-heading), DM Sans, sans-serif', fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Bico</span>
          </Link>
        </div>

        {/* Eyebrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#d94e18', boxShadow: '0 0 6px rgba(217,78,24,0.9)' }} />
          <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#d94e18' }}>
            Crie sua conta grátis
          </span>
        </div>

        <h1 style={{
          fontFamily: 'var(--font-body), Inter, sans-serif',
          fontSize: 'clamp(2rem, 4vw, 2.8rem)',
          fontWeight: 900, lineHeight: 1.05,
          letterSpacing: '-0.03em', color: '#fff',
          margin: '0 0 40px',
        }}>
          Comece a ganhar<br />
          <span style={{ color: 'rgba(160,152,148,0.88)' }}>dinheiro hoje</span>
        </h1>

        {/* Seletor de role */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32 }}>
          {([
            { value: 'freelancer', label: 'Sou Freelancer', sub: 'Quero fazer bicos' },
            { value: 'company', label: 'Sou Empresa', sub: 'Quero contratar' },
          ] as { value: UserRole; label: string; sub: string }[]).map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRole(opt.value)}
              style={{
                padding: '20px 16px', textAlign: 'center',
                background: role === opt.value ? 'rgba(217,78,24,0.12)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${role === opt.value ? '#d94e18' : 'rgba(255,255,255,0.1)'}`,
                cursor: 'pointer', transition: 'all 0.2s',
                fontFamily: 'inherit',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: role === opt.value ? '#fff' : 'rgba(185,190,200,0.78)', marginBottom: 4 }}>
                {opt.label}
              </div>
              <div style={{ fontSize: 11, color: role === opt.value ? '#d4783a' : 'rgba(185,190,200,0.4)', letterSpacing: '0.05em' }}>
                {opt.sub}
              </div>
            </button>
          ))}
        </div>

        {/* Form */}
        <div style={{
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.02)',
          padding: '32px',
        }}>
          <form onSubmit={handleRegister}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>

              <div>
                <label style={labelStyle}>{role === 'company' ? 'Nome da empresa' : 'Seu nome'}</label>
                <input
                  placeholder={role === 'company' ? 'Empresa Ltda.' : 'João Silva'}
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = '#d94e18')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
              </div>

              <div>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  placeholder="seu@email.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = '#d94e18')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
              </div>

              <div>
                <label style={labelStyle}>Senha</label>
                <input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                  minLength={6}
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = '#d94e18')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
              </div>

              <div>
                <label style={labelStyle}>{role === 'company' ? 'O que sua empresa faz?' : 'Fale sobre você'}</label>
                <textarea
                  placeholder={role === 'company' ? 'Desenvolvemos soluções de marketing digital...' : 'Designer gráfico com 3 anos de experiência...'}
                  value={form.bio}
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  rows={3}
                  style={{ ...inputStyle, resize: 'none' }}
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
                  fontFamily: 'inherit', marginTop: 8,
                }}
                onMouseOver={e => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.background = '#c04010'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(217,78,24,0.4)'; } }}
                onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.background = loading ? 'rgba(217,78,24,0.5)' : '#d94e18'; (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'; }}
              >
                {loading ? 'Criando conta...' : 'Criar conta grátis'}
              </button>
            </div>
          </form>
        </div>

        <div style={{ marginTop: 28, textAlign: 'center' }}>
          <span style={{ fontSize: 13, color: 'rgba(185,190,200,0.5)' }}>Já tem conta? </span>
          <Link href="/login" style={{ fontSize: 13, fontWeight: 700, color: '#d4783a', textDecoration: 'none' }}>
            Entrar
          </Link>
        </div>

      </div>
    </div>
  )
}
