'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast, Toaster } from 'sonner'

function ForgotPasswordInner() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [email, setEmail] = useState('')

  // Se voltou do callback com link inválido/expirado, avisa
  useEffect(() => {
    if (searchParams.get('error') === 'link') {
      toast.error('O link expirou ou é inválido. Solicite um novo.')
    }
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const redirectTo = `${window.location.origin}/auth/callback?next=/redefinir-senha`
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })

    setLoading(false)

    // Não revela se o email existe (evita enumeração de contas).
    // Mostra sempre a tela de confirmação.
    if (error) {
      // Erros reais de rede/rate-limit ainda merecem feedback
      if (error.status === 429) {
        toast.error('Muitas tentativas. Aguarde um instante.')
        return
      }
    }
    setSent(true)
  }

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

          {/* Eyebrow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#d94e18', boxShadow: '0 0 6px rgba(217,78,24,0.9)' }} />
            <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#d94e18' }}>Recuperar acesso</span>
          </div>

          <h1 style={{
            fontFamily: 'var(--font-body), Inter, sans-serif',
            fontSize: 'clamp(2rem, 4vw, 2.8rem)',
            fontWeight: 900, lineHeight: 1.05,
            letterSpacing: '-0.03em', color: '#fff',
            margin: '0 0 8px',
          }}>
            Esqueceu<br />
            <span style={{ color: 'rgba(160,152,148,0.88)' }}>a senha?</span>
          </h1>

          {sent ? (
            <>
              <p style={{ fontSize: 14, color: 'rgba(185,190,200,0.6)', margin: '0 0 32px', lineHeight: 1.6 }}>
                Se houver uma conta com <strong style={{ color: '#fff' }}>{email}</strong>, enviamos um link
                para redefinir sua senha. Confira sua caixa de entrada (e o spam).
              </p>
              <div style={{
                padding: '16px 18px',
                background: 'rgba(34,197,94,0.06)',
                border: '1px solid rgba(34,197,94,0.25)',
                fontSize: 13, color: 'rgba(185,190,200,0.7)',
                marginBottom: 32,
              }}>
                O link expira em 1 hora. Não recebeu?{' '}
                <button
                  onClick={() => setSent(false)}
                  style={{ background: 'none', border: 'none', color: '#22c55e', fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: 13, fontFamily: 'inherit' }}
                >
                  Tentar outro email
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={{ fontSize: 14, color: 'rgba(185,190,200,0.6)', margin: '0 0 40px' }}>
                Digite seu email e enviaremos um link para criar uma nova senha.
              </p>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 32 }}>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(185,190,200,0.6)', marginBottom: 10 }}>
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
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
                  {loading ? 'Enviando...' : 'Enviar link de recuperação'}
                </button>
              </form>
            </>
          )}

          <div style={{ marginTop: 32, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
            <Link href="/login" style={{ fontSize: 13, fontWeight: 700, color: '#d4783a', textDecoration: 'none' }}>
              ← Voltar para o login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordInner />
    </Suspense>
  )
}
