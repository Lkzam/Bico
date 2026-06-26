// Sentry — runtime Edge (proxy.ts roda no edge).
// Gated pela DSN: sem NEXT_PUBLIC_SENTRY_DSN, fica desativado (no-op).
import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn,
  enabled: !!dsn,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
})
