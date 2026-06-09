import { NextRequest, NextResponse } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ── Rate limiter ──────────────────────────────────────────────────────────────
// Produção: Upstash Redis (contador compartilhado entre todas as instâncias).
// Dev/local sem Upstash: fallback para Map em memória (por instância).
const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN
const redis = hasUpstash ? Redis.fromEnv() : null

// Cria/cacheia um Ratelimit do Upstash por regra (sliding window)
const upstashLimiters = new Map<string, Ratelimit>()
function getUpstashLimiter(prefix: string, max: number, windowMs: number): Ratelimit {
  let limiter = upstashLimiters.get(prefix)
  if (!limiter) {
    limiter = new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(max, `${Math.round(windowMs / 1000)} s`),
      prefix: `rl:${prefix}`,
      analytics: false,
    })
    upstashLimiters.set(prefix, limiter)
  }
  return limiter
}

// ── Fallback em memória (só usado quando Upstash não está configurado) ──────────
const store = new Map<string, { count: number; resetAt: number }>()

function getIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    '127.0.0.1'
  )
}

/** Retorna true = permitido, false = bloqueado (fallback em memória) */
function checkRateLimitMemory(key: string, max: number, windowMs: number): boolean {
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

// ── Content-Security-Policy ─────────────────────────────────────────────────
// Host do Supabase (REST + Realtime wss) extraído do env para o connect-src.
const SUPABASE_HOST = (() => {
  try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').host } catch { return '' }
})()
const CONNECT = SUPABASE_HOST
  ? `'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST}`
  : `'self'`

// Nota: 'unsafe-inline'/'unsafe-eval' em script-src são necessários para o
// bootstrap do Next.js sem nonce. Endurecer depois com nonce-based CSP.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src ${CONNECT}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ')

// ── Headers de segurança ──────────────────────────────────────────────────────
const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options':         'DENY',
  'X-Content-Type-Options':  'nosniff',
  'X-XSS-Protection':        '1; mode=block',
  'Referrer-Policy':         'strict-origin-when-cross-origin',
  'Permissions-Policy':      'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': CSP,
}

export async function proxy(req: NextRequest) {
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

      let allowed: boolean
      if (redis) {
        // Upstash: contador global compartilhado entre todas as instâncias
        const { success } = await getUpstashLimiter(rule.prefix, rule.max, rule.windowMs).limit(key)
        allowed = success
      } else {
        // Fallback local (dev sem Upstash)
        allowed = checkRateLimitMemory(key, rule.max, rule.windowMs)
      }

      if (!allowed) {
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
