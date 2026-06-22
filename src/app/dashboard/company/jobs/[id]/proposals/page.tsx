import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { calcCompanyTotal } from '@/lib/fees'
import { Star, ArrowLeft, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { AcceptProposalButton } from './AcceptProposalButton'

export const dynamic = 'force-dynamic'

export default async function JobProposalsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: jobId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('id, role').eq('user_id', user.id).single()
  if (!profile || profile.role !== 'company') redirect('/dashboard')

  const admin = createAdminClient()
  const { data: job } = await admin
    .from('jobs')
    .select('id, title, value, deadline_hours, mode, status, company_id')
    .eq('id', jobId).single()

  if (!job)                        redirect('/dashboard/company/jobs')
  if (job.company_id !== profile.id) redirect('/dashboard/company/jobs')
  if (job.mode !== 'proposal')       redirect(`/dashboard/company/jobs`)

  // Lista propostas (mais recentes primeiro). Usa admin para incluir dados do freelancer.
  const { data: proposals } = await admin
    .from('proposals')
    .select(`
      id, value, deadline_hours, message, status, created_at, freelancer_id,
      freelancer:profiles!proposals_freelancer_id_fkey(id, name, rating, rating_count, bio, portfolio_url)
    `)
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })

  const pending  = (proposals ?? []).filter(p => p.status === 'pending')
  const accepted = (proposals ?? []).find(p => p.status === 'accepted')
  const rejected = (proposals ?? []).filter(p => p.status === 'rejected' || p.status === 'withdrawn')

  return (
    <div style={{ color: '#fff' }}>
      {/* Voltar */}
      <Link href="/dashboard/company/jobs" style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 12, color: 'rgba(185,190,200,0.5)', textDecoration: 'none', marginBottom: 18,
      }}>
        <ArrowLeft size={12} /> Voltar para trabalhos
      </Link>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', boxShadow: '0 0 6px rgba(167,139,250,0.85)' }} />
          <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#a78bfa' }}>
            Propostas
          </span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(1.6rem, 2.6vw, 2.2rem)', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 6px' }}>
          {job.title}
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(185,190,200,0.55)', margin: 0 }}>
          Orçamento sugerido: <strong style={{ color: '#fff' }}>{formatCurrency(job.value)}</strong>
          {job.deadline_hours ? ` · ${job.deadline_hours}h de prazo` : ''}
        </p>
      </div>

      {/* Resumo */}
      {accepted && (
        <div style={{
          padding: '14px 18px', marginBottom: 20,
          background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)',
        }}>
          <p style={{ fontSize: 12, color: '#22c55e', margin: 0, fontWeight: 600 }}>
            Você já escolheu <strong>{(accepted.freelancer as any)?.name ?? 'um freelancer'}</strong>. O trabalho está em andamento.
          </p>
        </div>
      )}

      {/* Pendentes */}
      {pending.length === 0 && !accepted ? (
        <div style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', padding: '64px 32px', textAlign: 'center' }}>
          <MessageSquare size={36} style={{ color: 'rgba(185,190,200,0.2)', margin: '0 auto 14px', display: 'block' }} />
          <p style={{ fontSize: 14, color: 'rgba(185,190,200,0.5)', margin: 0 }}>
            Nenhuma proposta ainda. Aguarde freelancers compatíveis enviarem.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {pending.map((p: any) => (
            <ProposalCard key={p.id} proposal={p} job={job} canAccept={!accepted} />
          ))}
        </div>
      )}

      {/* Histórico (rejeitadas/retiradas) */}
      {rejected.length > 0 && (
        <details style={{ marginTop: 28 }}>
          <summary style={{ fontSize: 12, color: 'rgba(185,190,200,0.45)', cursor: 'pointer', padding: '8px 0', fontWeight: 600, letterSpacing: '0.06em' }}>
            Histórico ({rejected.length})
          </summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            {rejected.map((p: any) => (
              <ProposalCard key={p.id} proposal={p} job={job} canAccept={false} muted />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

function ProposalCard({
  proposal, job, canAccept, muted = false,
}: {
  proposal: any
  job: { id: string; value: number; deadline_hours: number | null }
  canAccept: boolean
  muted?: boolean
}) {
  const f = proposal.freelancer
  const propTotal = calcCompanyTotal(proposal.value)
  const diff = proposal.value - job.value
  const diffPct = job.value > 0 ? (diff / job.value) * 100 : 0
  const isHigher = diff > 0
  const isLower  = diff < 0
  const isAccepted = proposal.status === 'accepted'
  const isRejected = proposal.status === 'rejected'

  return (
    <div style={{
      border: `1px solid ${isAccepted ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.08)'}`,
      background: isAccepted ? 'rgba(34,197,94,0.04)' : 'rgba(255,255,255,0.02)',
      padding: 20,
      opacity: muted ? 0.6 : 1,
    }}>
      {/* Cabeçalho do freelancer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'linear-gradient(135deg, #d94e18, #1e2535)',
            border: '1px solid rgba(217,78,24,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>
            {f?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>{f?.name ?? 'Freelancer'}</p>
            {(f?.rating_count ?? 0) > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Star size={11} fill="#d94e18" style={{ color: '#d94e18' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{Number(f.rating).toFixed(1)}</span>
                <span style={{ fontSize: 11, color: 'rgba(185,190,200,0.4)' }}>({f.rating_count})</span>
              </div>
            ) : (
              <span style={{ fontSize: 11, color: 'rgba(185,190,200,0.4)' }}>Sem avaliações ainda</span>
            )}
          </div>
        </div>

        {/* Status badge (accepted/rejected/withdrawn) */}
        {isAccepted && (
          <span style={{
            fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
            padding: '4px 10px', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)',
            color: '#22c55e', whiteSpace: 'nowrap',
          }}>Escolhida</span>
        )}
        {isRejected && (
          <span style={{
            fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
            padding: '4px 10px', background: 'rgba(185,190,200,0.06)', border: '1px solid rgba(185,190,200,0.15)',
            color: 'rgba(185,190,200,0.55)', whiteSpace: 'nowrap',
          }}>Recusada</span>
        )}
        {proposal.status === 'withdrawn' && (
          <span style={{
            fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
            padding: '4px 10px', background: 'rgba(185,190,200,0.06)', border: '1px solid rgba(185,190,200,0.15)',
            color: 'rgba(185,190,200,0.55)', whiteSpace: 'nowrap',
          }}>Retirada</span>
        )}
      </div>

      {/* Valor + prazo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div style={{ padding: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ fontSize: 10, color: 'rgba(185,190,200,0.45)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Proposta</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0, fontFamily: 'var(--font-heading)' }}>
            {formatCurrency(proposal.value)}
          </p>
          {Math.abs(diffPct) >= 1 && (
            <p style={{ fontSize: 10.5, margin: '4px 0 0', color: isHigher ? '#f59e0b' : isLower ? '#22c55e' : 'rgba(185,190,200,0.5)' }}>
              {isHigher ? '+' : ''}{diffPct.toFixed(0)}% vs sugerido
            </p>
          )}
          <p style={{ fontSize: 10, color: 'rgba(185,190,200,0.4)', margin: '4px 0 0' }}>
            Você paga {formatCurrency(propTotal)} (taxa 10%)
          </p>
        </div>

        <div style={{ padding: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ fontSize: 10, color: 'rgba(185,190,200,0.45)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Prazo</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0, fontFamily: 'var(--font-heading)' }}>
            {proposal.deadline_hours
              ? proposal.deadline_hours >= 24 && proposal.deadline_hours % 24 === 0
                ? `${proposal.deadline_hours / 24}d`
                : `${proposal.deadline_hours}h`
              : '—'}
          </p>
          {proposal.deadline_hours && job.deadline_hours && proposal.deadline_hours !== job.deadline_hours && (
            <p style={{ fontSize: 10.5, margin: '4px 0 0', color: proposal.deadline_hours > job.deadline_hours ? '#f59e0b' : '#22c55e' }}>
              vs {job.deadline_hours}h sugerido
            </p>
          )}
        </div>
      </div>

      {/* Mensagem */}
      {proposal.message && (
        <div style={{ padding: 12, marginBottom: canAccept ? 14 : 0, background: 'rgba(167,139,250,0.04)', border: '1px solid rgba(167,139,250,0.15)' }}>
          <p style={{ fontSize: 10, color: '#a78bfa', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Mensagem</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{proposal.message}</p>
        </div>
      )}

      {/* Botão Escolher (só em pending + ainda sem accepted) */}
      {canAccept && proposal.status === 'pending' && (
        <AcceptProposalButton proposalId={proposal.id} freelancerName={f?.name ?? 'este freelancer'} freelancerId={f?.id} />
      )}
    </div>
  )
}
