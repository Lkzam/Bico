import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminUserId } from '@/lib/admin'
import { redirect } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { AlertTriangle, ShieldCheck, Layers } from 'lucide-react'
import { DisputeActions } from './DisputeActions'
import { MilestoneDisputeActions } from './MilestoneDisputeActions'

export const dynamic = 'force-dynamic'

export default async function AdminDisputesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!isAdminUserId(user.id)) redirect('/dashboard')

  const admin = createAdminClient()
  const { data: disputes } = await admin
    .from('jobs')
    .select(`
      id, title, value, dispute_reason, disputed_at, delivery_url, delivery_note,
      company:profiles!jobs_company_id_fkey(id, name),
      freelancer:profiles!jobs_freelancer_id_fkey(id, name)
    `)
    .eq('status', 'disputed')
    .order('disputed_at', { ascending: true })

  const list = disputes ?? []

  // Disputas de ETAPA de contrato.
  const { data: msDisputes } = await admin
    .from('contract_milestones')
    .select(`
      id, position, title, description, value, dispute_reason, disputed_at, delivery_url, delivery_note,
      job:jobs!contract_milestones_job_id_fkey(
        id, title,
        company:profiles!jobs_company_id_fkey(id, name),
        freelancer:profiles!jobs_freelancer_id_fkey(id, name)
      )
    `)
    .eq('status', 'disputed')
    .order('disputed_at', { ascending: true })

  const msList = msDisputes ?? []

  return (
    <div style={{ color: '#fff' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 6px rgba(245,158,11,0.9)' }} />
          <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#f59e0b' }}>
            Admin · Arbitragem
          </span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: 900, letterSpacing: '-0.03em', margin: 0 }}>
          Disputas em aberto
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(185,190,200,0.55)', marginTop: 8 }}>
          {list.length + msList.length === 0
            ? 'Nada para arbitrar agora.'
            : `${list.length + msList.length} disputa(s) aguardando decisão.`}
        </p>
      </div>

      {list.length + msList.length === 0 ? (
        <div style={{
          border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)',
          padding: '64px 32px', textAlign: 'center',
        }}>
          <ShieldCheck size={40} style={{ color: 'rgba(34,197,94,0.4)', margin: '0 auto 16px', display: 'block' }} />
          <p style={{ fontSize: 14, color: 'rgba(185,190,200,0.5)', margin: 0 }}>Tudo limpo.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {list.map((d: any) => (
            <DisputeCard key={d.id} dispute={d} />
          ))}

          {msList.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: list.length > 0 ? 16 : 0 }}>
              <Layers size={14} style={{ color: '#a78bfa' }} />
              <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#a78bfa' }}>
                Etapas de contrato ({msList.length})
              </span>
            </div>
          )}
          {msList.map((m: any) => (
            <MilestoneDisputeCard key={m.id} ms={m} />
          ))}
        </div>
      )}
    </div>
  )
}

function MilestoneDisputeCard({ ms }: { ms: any }) {
  const opened = ms.disputed_at ? new Date(ms.disputed_at) : null
  const job = ms.job

  return (
    <div style={{ border: '1px solid rgba(167,139,250,0.25)', background: 'rgba(167,139,250,0.04)', padding: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Layers size={14} style={{ color: '#a78bfa' }} />
            <span style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#a78bfa' }}>
              Etapa {ms.position} · contrato
            </span>
            {opened && (
              <span style={{ fontSize: 11, color: 'rgba(185,190,200,0.45)' }}>· aberta em {opened.toLocaleString('pt-BR')}</span>
            )}
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>{ms.title}</h3>
          <p style={{ fontSize: 12, color: 'rgba(185,190,200,0.5)', margin: '4px 0 0' }}>Contrato: {job?.title ?? '—'}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(185,190,200,0.45)', margin: 0 }}>Valor da etapa</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0, fontFamily: 'var(--font-heading)' }}>{formatCurrency(ms.value)}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, fontSize: 13 }}>
        <div>
          <p style={{ fontSize: 11, color: 'rgba(185,190,200,0.45)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>Empresa</p>
          <p style={{ color: '#fff', margin: 0 }}>{job?.company?.name ?? '—'}</p>
        </div>
        <div>
          <p style={{ fontSize: 11, color: 'rgba(185,190,200,0.45)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>Freelancer</p>
          <p style={{ color: '#fff', margin: 0 }}>{job?.freelancer?.name ?? '—'}</p>
        </div>
      </div>

      {ms.dispute_reason && (
        <div style={{ padding: 14, marginBottom: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ fontSize: 11, color: 'rgba(185,190,200,0.45)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>Motivo</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.5, fontStyle: 'italic' }}>"{ms.dispute_reason}"</p>
        </div>
      )}

      {ms.delivery_note && (
        <div style={{ padding: 14, marginBottom: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ fontSize: 11, color: 'rgba(185,190,200,0.45)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>Observação do freelancer</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.5 }}>{ms.delivery_note}</p>
        </div>
      )}

      <MilestoneDisputeActions milestoneId={ms.id} hasDelivery={!!ms.delivery_url} />
    </div>
  )
}

function DisputeCard({ dispute }: { dispute: any }) {
  const opened = dispute.disputed_at ? new Date(dispute.disputed_at) : null

  return (
    <div style={{
      border: '1px solid rgba(245,158,11,0.25)',
      background: 'rgba(245,158,11,0.04)',
      padding: 22,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <AlertTriangle size={14} style={{ color: '#f59e0b' }} />
            <span style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#f59e0b' }}>
              Disputa
            </span>
            {opened && (
              <span style={{ fontSize: 11, color: 'rgba(185,190,200,0.45)' }}>
                · aberta em {opened.toLocaleString('pt-BR')}
              </span>
            )}
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>{dispute.title}</h3>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(185,190,200,0.45)', margin: 0 }}>Valor</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0, fontFamily: 'var(--font-heading)' }}>
            {formatCurrency(dispute.value)}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, fontSize: 13 }}>
        <div>
          <p style={{ fontSize: 11, color: 'rgba(185,190,200,0.45)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>Empresa</p>
          <p style={{ color: '#fff', margin: 0 }}>{dispute.company?.name ?? '—'}</p>
        </div>
        <div>
          <p style={{ fontSize: 11, color: 'rgba(185,190,200,0.45)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>Freelancer</p>
          <p style={{ color: '#fff', margin: 0 }}>{dispute.freelancer?.name ?? '—'}</p>
        </div>
      </div>

      {dispute.dispute_reason && (
        <div style={{ padding: 14, marginBottom: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ fontSize: 11, color: 'rgba(185,190,200,0.45)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>Motivo</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.5, fontStyle: 'italic' }}>"{dispute.dispute_reason}"</p>
        </div>
      )}

      {dispute.delivery_note && (
        <div style={{ padding: 14, marginBottom: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ fontSize: 11, color: 'rgba(185,190,200,0.45)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>Observação do freelancer</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.5 }}>{dispute.delivery_note}</p>
        </div>
      )}

      <DisputeActions jobId={dispute.id} hasDelivery={!!dispute.delivery_url} />
    </div>
  )
}
