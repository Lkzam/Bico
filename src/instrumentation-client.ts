// Sentry — navegador (erros de frontend). Carregado pelo Next no client.
// Gated pela DSN: sem NEXT_PUBLIC_SENTRY_DSN, fica desativado (no-op).
import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn,
  enabled: !!dsn,
  tracesSampleRate: 0.1,
  // Sem session replay (mantém leve e barato no beta).
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  environment: process.env.NODE_ENV,
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
