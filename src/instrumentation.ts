// Next 16 instrumentation: carrega o Sentry no runtime certo e captura erros
// de request do servidor. Tudo gated pela DSN nos arquivos de config.
import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

// Captura erros lançados em Server Components / Route Handlers.
export const onRequestError = Sentry.captureRequestError
