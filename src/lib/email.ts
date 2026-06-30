// Helper de envio de email transacional.
//
// Provider: Resend (https://resend.com).
// Tier free: 3k emails/mês, 100/dia. Sem cartão.
//
// Variáveis necessárias:
//   RESEND_API_KEY     — chave criada no painel do Resend
//   ADMIN_EMAIL        — email que recebe notificações (você)
//   EMAIL_FROM         — endereço remetente verificado no Resend
//                        (ex: "Bico <noreply@seudominio.com>")
//
// Se RESEND_API_KEY não estiver configurado, sendEmail() vira no-op silencioso
// (loga warning, não falha). Útil em dev local sem Resend.

import { Resend } from 'resend'

let cachedClient: Resend | null = null

function getClient(): Resend | null {
  if (cachedClient) return cachedClient
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  cachedClient = new Resend(apiKey)
  return cachedClient
}

export interface EmailAttachment {
  filename: string
  content: Buffer | string   // Buffer (binário) ou base64
}

export interface SendEmailParams {
  to: string | string[]
  subject: string
  html: string
  text?: string
  attachments?: EmailAttachment[]
}

export async function sendEmail(params: SendEmailParams): Promise<{ ok: boolean; error?: string }> {
  const client = getClient()
  if (!client) {
    console.warn('[email] RESEND_API_KEY não configurado — email não enviado:', params.subject)
    return { ok: false, error: 'email-not-configured' }
  }

  const from = process.env.EMAIL_FROM ?? 'Bico <onboarding@resend.dev>'

  try {
    const { error } = await client.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      attachments: params.attachments,
    })
    if (error) {
      console.error('[email] Resend retornou erro:', error)
      return { ok: false, error: error.message }
    }
    return { ok: true }
  } catch (err: any) {
    console.error('[email] Falha ao enviar:', err?.message ?? err)
    return { ok: false, error: err?.message ?? String(err) }
  }
}

/** Notifica admin que uma disputa foi aberta. */
export async function notifyAdminNewDispute(params: {
  jobId: string
  jobTitle: string
  jobValue: number
  companyName: string
  companyId: string
  freelancerName: string
  freelancerId: string
  reason: string | null
  /** ZIP (log do chat + arquivos) anexado ao email. */
  bundle?: { zip: Buffer; messageCount: number; fileCount: number } | null
}): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) {
    console.warn('[email] ADMIN_EMAIL não configurado — disputa não notificada por email')
    return
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const link   = `${appUrl}/dashboard/admin/disputes`
  const valor  = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(params.jobValue)

  // Linha de "partes envolvidas" com nome + ID, para o admin identificar rápido.
  const partyRow = (label: string, name: string, id: string) => `
    <tr>
      <td style="padding:6px 10px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.1em;white-space:nowrap;vertical-align:top;">${label}</td>
      <td style="padding:6px 10px;font-size:13px;color:#fff;">${escapeHtml(name)}<br><span style="font-size:11px;color:#64748b;font-family:monospace;">${escapeHtml(id)}</span></td>
    </tr>`

  const bundleNote = params.bundle
    ? `<p style="margin:16px 0 0;font-size:12px;color:#22c55e;">📎 Anexo: <strong>disputa-${escapeHtml(params.jobId)}.zip</strong> — ${params.bundle.messageCount} mensagem(ns) e ${params.bundle.fileCount} arquivo(s) do chat.</p>`
    : ''

  const html = `
<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:#0b0e17;color:#fff;padding:24px;">
  <div style="max-width:520px;margin:0 auto;background:#0f1219;border:1px solid rgba(245,158,11,0.3);padding:28px;">
    <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#f59e0b;font-weight:700;margin-bottom:8px;">
      Bico · Admin
    </div>
    <h1 style="font-size:20px;margin:0 0 16px;color:#fff;">Nova disputa aberta</h1>
    <p style="margin:0 0 16px;color:#cbd5e1;line-height:1.5;">
      Contestação da entrega de <strong>${escapeHtml(params.jobTitle)}</strong> (${valor}).
    </p>
    <table style="width:100%;border-collapse:collapse;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);margin-bottom:18px;">
      ${partyRow('Empresa', params.companyName, params.companyId)}
      ${partyRow('Freelancer', params.freelancerName, params.freelancerId)}
    </table>
    ${params.reason
      ? `<div style="padding:14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);margin-bottom:18px;">
           <div style="font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#94a3b8;margin-bottom:6px;">Motivo</div>
           <div style="font-size:13px;color:#e2e8f0;font-style:italic;line-height:1.5;">"${escapeHtml(params.reason)}"</div>
         </div>`
      : ''
    }
    <a href="${link}" style="display:inline-block;padding:12px 22px;background:#d94e18;color:#fff;text-decoration:none;font-weight:700;font-size:12px;letter-spacing:.12em;text-transform:uppercase;">
      Abrir painel de arbitragem
    </a>
    ${bundleNote}
    <p style="margin:20px 0 0;font-size:11px;color:#64748b;">
      Job ID: ${escapeHtml(params.jobId)}
    </p>
  </div>
</body>
</html>`

  const text = `Nova disputa aberta no Bico

Trabalho: ${params.jobTitle} (${valor})

Empresa: ${params.companyName} [ID: ${params.companyId}]
Freelancer: ${params.freelancerName} [ID: ${params.freelancerId}]
${params.reason ? `\nMotivo: ${params.reason}\n` : ''}
Abra o painel: ${link}
Job ID: ${params.jobId}
${params.bundle ? `\nAnexo: disputa-${params.jobId}.zip (${params.bundle.messageCount} mensagens, ${params.bundle.fileCount} arquivos)` : ''}`

  await sendEmail({
    to: adminEmail,
    subject: `[Bico] Disputa aberta — ${params.jobTitle}`,
    html,
    text,
    attachments: params.bundle
      ? [{ filename: `disputa-${params.jobId}.zip`, content: params.bundle.zip }]
      : undefined,
  })
}

/**
 * Alerta OPERACIONAL para o admin (você) — falhas que você precisa saber ANTES
 * do cliente reclamar: webhook, saque, pagamento, entrega, arquivamento.
 *
 * Sempre loga no console (fica nos logs da Vercel mesmo sem email). Se Resend +
 * ADMIN_EMAIL estiverem configurados, manda email também. Nunca lança — é
 * best-effort e não pode quebrar o fluxo que o chamou.
 */
export async function notifyAdminAlert(opts: {
  event: string                         // ex: 'withdraw_failed', 'webhook_error'
  message: string                       // resumo legível
  context?: Record<string, unknown>     // ids, valores, erro do PSP, etc.
}): Promise<void> {
  // 1. Log sempre (grep-able nos logs)
  console.error(`[ALERT] ${opts.event}: ${opts.message}`, opts.context ?? {})

  // 2. Email best-effort
  try {
    const adminEmail = process.env.ADMIN_EMAIL
    if (!adminEmail) return

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const when   = new Date().toLocaleString('pt-BR')
    const ctx    = opts.context && Object.keys(opts.context).length > 0
      ? `<pre style="white-space:pre-wrap;word-break:break-word;font-size:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);padding:12px;color:#e2e8f0;margin:0 0 16px;">${escapeHtml(JSON.stringify(opts.context, null, 2))}</pre>`
      : ''

    const html = `
<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:#0b0e17;color:#fff;padding:24px;">
  <div style="max-width:520px;margin:0 auto;background:#0f1219;border:1px solid rgba(239,68,68,0.35);padding:28px;">
    <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#ef4444;font-weight:700;margin-bottom:8px;">Bico · Alerta operacional</div>
    <h1 style="font-size:19px;margin:0 0 6px;color:#fff;">⚠️ ${escapeHtml(opts.event)}</h1>
    <p style="margin:0 0 16px;color:#cbd5e1;line-height:1.5;">${escapeHtml(opts.message)}</p>
    ${ctx}
    <p style="margin:0;font-size:11px;color:#64748b;">${when}${appUrl ? ` · ${escapeHtml(appUrl)}` : ''}</p>
  </div>
</body></html>`

    const text = `[Bico] ALERTA: ${opts.event}\n\n${opts.message}\n\n${opts.context ? JSON.stringify(opts.context, null, 2) : ''}\n\n${when}`

    await sendEmail({ to: adminEmail, subject: `[Bico] ⚠️ ${opts.event}`, html, text })
  } catch (err) {
    console.error('[email] notifyAdminAlert falhou:', err)
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
