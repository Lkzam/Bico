'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

// Captura erros de renderização do React (último recurso) e reporta ao Sentry.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: 'system-ui, sans-serif', background: '#0b0e17', color: '#fff', display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 10px' }}>Algo deu errado</h1>
          <p style={{ fontSize: 14, color: 'rgba(185,190,200,0.7)', margin: '0 0 20px', lineHeight: 1.5 }}>
            Tivemos um problema inesperado. Nossa equipe foi avisada. Tente novamente.
          </p>
          <button
            onClick={() => reset()}
            style={{ padding: '11px 22px', background: '#d94e18', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}
          >
            Tentar de novo
          </button>
        </div>
      </body>
    </html>
  )
}
