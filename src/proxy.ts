import { NextRequest, NextResponse } from 'next/server'

// ── Rate limiter em memória ───────────────────────────────────────────────────
// Por instância (suficiente para deploys single-server/Vercel single-region).
// Para produção multi-região, substitua por Upstash Redis.
const store = new Map<string, { count: number; resetAt: number }>()

// Limpa entradas expiradas a cada 5 minutos
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of store) if (now > v.resetAt) store.delete(k)
}, 5 * 60 * 1000)

function getIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    '127.0.0.1'
  )
}

/** Retorna true = permitido, false = bloqueado */
function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = store.get(key)
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= max) return false
  entry.count++
  return true
}

// ── Limites por prefixo de rota ───────────────────────────────────────────────
const RATE_RULES = [
  { prefix: '/api/withdraw',       max: 5,   windowMs: 60_000  }, // saque: 5/min
  { prefix: '/api/payments',       max: 20,  windowMs: 60_000  }, // pagamentos: 20/min
  { prefix: '/api/auth',           max: 10,  windowMs: 60_000  }, // auth: 10/min
  { prefix: '/api/reviews',        max: 10,  windowMs: 60_000  }, // avaliações: 10/min
  { prefix: '/api/support',        max: 20,  windowMs: 60_000  }, // suporte IA: 20/min
  { prefix: '/api/jobs',           max: 60,  windowMs: 60_000  }, // jobs: 60/min
  { prefix: '/api/',               max: 100, windowMs: 60_000  }, // demais: 100/min
]

// Rotas internas (cron/webhook) — autenticam por token próprio, sem rate limit por IP
const INTERNAL_PATTERNS = [
  '/api/payments/webhook',
  '/api/payments/register-webhook',
  '/api/jobs/auto-approve',
  '/api/withdraw/status',
]

// ── Headers de segurança ──────────────────────────────────────────────────────
const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options':        'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection':       '1; mode=block',
  'Referrer-Policy':        'strict-origin-when-cross-origin',
  'Permissions-Policy':     'camera=(), microphone=(), geolocation=()',
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const ip = getIP(req)

  // ── 1. Rate limiting (apenas rotas /api/) ────────────────────────────────
  if (pathname.startsWith('/api/')) {
    const isInternal = INTERNAL_PATTERNS.some(p => pathname.startsWith(p))

    if (!isInternal) {
      const rule  = RATE_RULES.find(r => pathname.startsWith(r.prefix)) ?? RATE_RULES[RATE_RULES.length - 1]
      // Agrupa por IP + prefixo dos primeiros 4 segmentos (evita chaves únicas por ID dinâmico)
      const group = pathname.split('/').slice(0, 4).join('/')
      const key   = `${ip}:${group}`

      if (!checkRateLimit(key, rule.max, rule.windowMs)) {
        return new NextResponse(
          JSON.stringify({ error: 'Muitas requisições. Tente novamente em instantes.' }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After':  '60',
              ...SECURITY_HEADERS,
            },
          }
        )
      }
    }
  }

  // ── 2. Headers de segurança em todas as respostas ─────────────────────────
  const res = NextResponse.next()
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(k, v)

  if (process.env.NODE_ENV === 'production') {
    // HSTS: força HTTPS por 2 anos (só em produção)
    res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  }

  return res
}

export const config = {
  matcher: [
    // Aplica a tudo exceto assets estáticos do Next.js
    '/((?!_next/static|_next/image|favicon\\.ico|logo\\.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
