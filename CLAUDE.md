@AGENTS.md

# FreelaBR — Contexto do Projeto

Marketplace de freelancers estilo Uber para o Brasil.
Empresa posta job → freelancer aceita → trabalha → entrega arquivo → empresa paga PIX → aprovação → freelancer saca.

**App name exibido ao usuário:** Bico

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend/Backend | Next.js 16 App Router (breaking changes — leia AGENTS.md) |
| Banco | Supabase (PostgreSQL + RLS + Realtime + Storage) |
| Auth | Supabase Auth (email/password) |
| Pagamento | Efí Bank PIX (mTLS com certificado .p12) |
| Deploy | Vercel |
| IA de Suporte | Groq `llama-3.3-70b-versatile` |
| Linguagem | TypeScript strict |

---

## Localização do Projeto

- **Repo:** `C:\Users\lucam\Desktop\Programação\SAAS 1\freela-app`
- **Obsidian:** `C:\Users\lucam\Documents\Obsidian Vault\Projetos\FreelaBR - Marketplace Freelancers\`
  - `00 - Visão Geral` · `01 - Stack e Arquitetura` · `02 - Banco de Dados`
  - `04 - Funcionalidades` · `05 - Segurança` · `11 - Padrões e Armadilhas`

---

## Regras de Negócio Críticas

- **Taxa empresa:** +10% sobre o valor do job (pago no PIX)
- **Taxa freelancer:** -7% no saque do saldo (não na aprovação)
- **Escrow:** dinheiro fica retido na Efí Bank até empresa aprovar
- **Auto-approve:** cron `GET /api/jobs/auto-approve` aprova após 5h sem resposta
- **Valor do job (`value`):** IMUTÁVEL após criação. Para mudar valor → cancelar + criar novo
- **Cancelamento:** job é DELETADO da tabela `jobs`; log salvo em `cancelled_job_logs` com motivo

---

## Máquina de Estados (jobs.status)

```
open → in_progress → delivered → payment_received → completed
                                                  ↘ disputed
Cancelamento: deleta o job (log em cancelled_job_logs)
```

---

## Next.js 16 — Breaking Changes (IMPORTANTE)

1. **`middleware.ts` foi descontinuado** → usar `src/proxy.ts` com `export function proxy(req)`
2. **`params` em Route Handlers é `Promise`** → sempre `await params`:
   ```typescript
   export async function POST(req, { params }: { params: Promise<{ id: string }> }) {
     const { id } = await params  // obrigatório
   ```
3. Verificar `node_modules/next/dist/docs/` antes de qualquer implementação nova

---

## Supabase — Três Clientes (nunca confundir)

| Cliente | Import | Quando usar |
|---------|--------|------------|
| `createClient()` | `lib/supabase/client.ts` | Componentes client-side (browser) |
| `await createClient()` | `lib/supabase/server.ts` | Route Handlers autenticados, Server Components |
| `createAdminClient()` | `lib/supabase/admin.ts` | Webhooks, crons — bypassa RLS. NUNCA no client-side |

---

## Padrão de Route Handler

```typescript
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('id, role, name').eq('user_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 403 })

  // lógica aqui
  return NextResponse.json({ ok: true })
}
```

Ler body com segurança (nunca joga exceção):
```typescript
let reason = ''
try { const body = await req.json(); reason = (body.reason ?? '').trim() } catch {}
```

---

## Armadilhas Conhecidas

### localStorage e SSR (hydration mismatch)
```typescript
// ✅ CORRETO
const [collapsed, setCollapsed] = useState(false)
useEffect(() => { if (localStorage.getItem('x') === 'true') setCollapsed(true) }, [])

// ❌ ERRADO — quebra SSR
const [collapsed, setCollapsed] = useState(() => localStorage.getItem('x') === 'true')
```

### fs.readFileSync no Vercel
Arquivos estáticos não são incluídos por padrão. Configurar em `next.config.ts`:
```typescript
outputFileTracingIncludes: { '/api/support/chat': ['./src/app/api/support/knowledge-base.md'] }
```

### Inline styles + Media Queries
Inline styles têm especificidade máxima. Para responsividade:
```tsx
<style>{`@media (max-width: 768px) { .hero { max-width: 100% !important; } }`}</style>
<div className="hero" style={{ maxWidth: '46%' }}>
```

### Tokens timing-safe
```typescript
import { secureCompare } from '@/lib/security'
// SEMPRE secureCompare para tokens — NUNCA ===
```

---

## Design System

| Elemento | Valor |
|----------|-------|
| Cor primária | `#d94e18` |
| Primária hover | `#c04010` |
| Fundo geral | `#0b0e17` |
| Fundo cards/sidebar | `#0f1219` |
| Verde sucesso | `#22c55e` |
| Vermelho erro | `#ef4444` |
| Amarelo alerta | `#f59e0b` |
| Roxo escrow/pag. | `#a78bfa` |
| Azul info/edição | `#3b82f6` |
| Âmbar entrega | `#C18F6B` |

UI usa **inline styles** (não Tailwind). Tailwind apenas pontualmente.

---

## Utilitários Importantes (`src/lib/`)

- `formatDeadline(hours)` → `"5h de prazo"` / `"2d de prazo"` / `"1d 12h de prazo"`
- `formatCurrency(value)` → `"R$ 100,00"`
- `calcCompanyTotal(value)` → `value * 1.10` (empresa paga 10% a mais)
- `calcFreelancerReceives(value)` → `value * 0.93` (freelancer recebe 93% no saque)
- `secureCompare(a, b)` → timing-safe, usar para todos os tokens/secrets

---

## Tabelas Principais

- `profiles` — `id, user_id, role ('company'|'freelancer'), name, bio, balance, rating, rating_count`
- `jobs` — `id, company_id, freelancer_id, title, description, value, status, work_type, address, deadline_hours, delivery_url, delivery_note`
- `payments` — `id, job_id, txid, status, paid_at`
- `notifications` — `id, profile_id, title, body, read, metadata jsonb`
- `cancelled_job_logs` — `id, original_job_id, cancel_reason, messages jsonb, cancelled_by, cancelled_by_name`
- `job_archives` — jobs concluídos (após approve)
- `chats` + `messages` — chat empresa↔freelancer durante in_progress
- `reviews` — avaliações pós-job (1–5 estrelas + comentário)

`metadata` em `notifications` quando cancelamento:
```json
{ "cancel_reason": "...", "cancelled_by": "company|freelancer", "cancelled_by_name": "...", "job_title": "..." }
```

---

## Storage Buckets

- `deliveries` — arquivos entregues pelos freelancers (privado, signed URL 60min)
- `chat-files` — arquivos enviados no chat (RLS: só participantes)

---

## Rotas de API

```
/api/auth/complete-profile     POST  Cria perfil no cadastro
/api/jobs/auto-approve         GET   Cron: aprova jobs após 5h
/api/jobs/[id]/accept          POST  Freelancer aceita job
/api/jobs/[id]/approve         POST  Empresa aprova entrega
/api/jobs/[id]/cancel          POST  Cancela job (body: { reason })
/api/jobs/[id]/delivery-url    GET   URL assinada para download
/api/jobs/[id]/dispute         POST  Abre contestação
/api/jobs/[id]/edit            PATCH Edita job (sem alterar value)
/api/jobs/[id]/pay             POST  Inicia pagamento PIX
/api/payments/create           POST  Gera cobrança Efí Bank
/api/payments/webhook          POST  Recebe notificação PIX (mTLS)
/api/payments/register-webhook GET   Cadastra webhook na Efí (1x após deploy)
/api/support/chat              POST  Chat IA streaming (Groq)
/api/withdraw                  POST  Inicia saque PIX
/api/withdraw/status           GET   Consulta status de saque
```

---

## Migração Pendente ⚠️

Rodar no SQL Editor do Supabase antes do próximo deploy:
```sql
ALTER TABLE cancelled_job_logs ADD COLUMN IF NOT EXISTS cancel_reason text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata jsonb;
```
Arquivo: `supabase/migrations/add_cancel_reason_and_notif_metadata.sql`

---

## Regra: Atualizar Obsidian ao Aprender Algo Novo

Sempre que descobrirmos algo novo sobre o projeto — uma armadilha, um padrão de código, uma decisão de negócio, uma correção de bug, uma nova feature implementada — **atualizar a nota correspondente no Obsidian antes de encerrar a sessão**:

- **Padrão ou armadilha técnica** → `11 - Padrões e Armadilhas.md`
- **Nova feature ou mudança de regra de negócio** → `04 - Funcionalidades.md`
- **Nova tabela, coluna ou migração** → `02 - Banco de Dados.md`
- **Nova rota, arquivo ou mudança de stack** → `01 - Stack e Arquitetura.md`
- **Decisão legal ou de privacidade** → `10 - Termos e Privacidade.md`
- **Status geral do projeto** → `00 - Visão Geral.md`

Vault path: `C:\Users\lucam\Documents\Obsidian Vault\Projetos\FreelaBR - Marketplace Freelancers\`

---

## Variáveis de Ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
EFIBANK_CLIENT_ID=
EFIBANK_CLIENT_SECRET=
EFIBANK_PIX_KEY=
EFIBANK_CERT_BASE64=
EFIBANK_CERT_PASSPHRASE=
EFIBANK_WEBHOOK_TOKEN=
NEXT_PUBLIC_APP_URL=
CRON_SECRET=
GROQ_API_KEY=
```
