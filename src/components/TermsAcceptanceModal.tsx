'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function TermsAcceptanceModal({ alreadyAccepted }: { alreadyAccepted: boolean }) {
  const router = useRouter()
  const [checked, setChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(!alreadyAccepted)

  if (!open) return null

  async function handleAccept() {
    if (!checked) return
    setLoading(true)
    try {
      const res = await fetch('/api/auth/accept-terms', { method: 'POST' })
      if (!res.ok) {
        toast.error('Erro ao registrar aceite. Tente novamente.')
        setLoading(false)
        return
      }
      toast.success('Obrigado por aceitar os termos!')
      setOpen(false)
      router.refresh()
    } catch {
      toast.error('Erro de conexão. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 5000,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 520,
        background: '#0f1219',
        border: '1px solid rgba(255,255,255,0.1)',
        padding: 36,
      }}>
        {/* Eyebrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#d94e18', boxShadow: '0 0 6px rgba(217,78,24,0.9)' }} />
          <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#d94e18' }}>
            Atualização obrigatória
          </span>
        </div>

        <h2 style={{
          fontSize: '1.5rem', fontWeight: 800,
          color: '#fff', margin: '0 0 16px',
          letterSpacing: '-0.02em', lineHeight: 1.2,
        }}>
          Aceite os Termos de Serviço
        </h2>

        <p style={{
          fontSize: 14, lineHeight: 1.6,
          color: 'rgba(185,190,200,0.7)',
          margin: '0 0 24px',
        }}>
          Para continuar usando o Bico, você precisa ler e concordar com os nossos
          Termos de Serviço e a Política de Privacidade. Faremos isso uma única vez —
          após o aceite, esta tela não aparecerá novamente.
        </p>

        <label style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          cursor: 'pointer', padding: '14px 16px',
          background: checked ? 'rgba(217,78,24,0.07)' : 'rgba(255,255,255,0.02)',
          border: `1px solid ${checked ? 'rgba(217,78,24,0.3)' : 'rgba(255,255,255,0.1)'}`,
          transition: 'all 0.2s', marginBottom: 24,
        }}>
          <div style={{ position: 'relative', flexShrink: 0, marginTop: 1 }}>
            <input
              type="checkbox"
              checked={checked}
              onChange={e => setChecked(e.target.checked)}
              style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
            />
            <div style={{
              width: 18, height: 18,
              background: checked ? '#d94e18' : 'transparent',
              border: `2px solid ${checked ? '#d94e18' : 'rgba(185,190,200,0.3)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}>
              {checked && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </div>
          <span style={{ fontSize: 12, color: 'rgba(185,190,200,0.7)', lineHeight: 1.55 }}>
            Li e concordo com os{' '}
            <Link href="/termos" target="_blank" style={{ color: '#d4783a', fontWeight: 600, textDecoration: 'none' }}>
              Termos de Serviço
            </Link>
            {' '}e a{' '}
            <Link href="/privacidade" target="_blank" style={{ color: '#d4783a', fontWeight: 600, textDecoration: 'none' }}>
              Política de Privacidade
            </Link>
            {' '}do Bico.
          </span>
        </label>

        <button
          onClick={handleAccept}
          disabled={loading || !checked}
          style={{
            width: '100%', padding: '15px 32px',
            background: loading || !checked ? 'rgba(217,78,24,0.35)' : '#d94e18',
            color: loading || !checked ? 'rgba(255,255,255,0.4)' : '#fff',
            border: 'none', cursor: loading || !checked ? 'not-allowed' : 'pointer',
            fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
            transition: 'background 0.2s, box-shadow 0.2s',
            fontFamily: 'inherit',
          }}
          onMouseOver={e => { if (!loading && checked) (e.currentTarget as HTMLButtonElement).style.background = '#c04010' }}
          onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.background = loading || !checked ? 'rgba(217,78,24,0.35)' : '#d94e18' }}
        >
          {loading ? 'Registrando aceite...' : 'Aceitar e continuar'}
        </button>
      </div>
    </div>
  )
}
