'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Briefcase, ArrowRight, Plus, X, CreditCard, FileText, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { toast, Toaster } from 'sonner'

const statusMap: Record<string, { label: string; color: string }> = {
  open:        { label: 'Aberto',       color: '#3b82f6' },
  in_progress: { label: 'Em andamento', color: '#d94e18' },
  delivered:   { label: 'Entregue',     color: '#C18F6B' },
  completed:   { label: 'Concluído',    color: '#22c55e' },
  cancelled:   { label: 'Cancelado',    color: '#ef4444' },
}

export default function CompanyJobsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [jobs, setJobs] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)
  const [payJobId, setPayJobId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase
        .from('profiles').select('*').eq('user_id', user.id).single()
      if (!profile || profile.role !== 'company') { router.push('/dashboard/freelancer'); return }
      const { data } = await supabase
        .from('jobs')
        .select('*, profiles!jobs_freelancer_id_fkey(name)')
        .eq('company_id', profile.id)
        .order('created_at', { ascending: false })
      setJobs(data ?? [])
      setLoaded(true)
    }
    load()
  }, [])

  function refreshJobs() {
    supabase
      .from('jobs')
      .select('*, profiles!jobs_freelancer_id_fkey(name)')
      .then(({ data }) => { if (data) setJobs(data) })
    // Re-load properly
    router.refresh()
  }

  if (!loaded) return null

  const payJob = jobs.find(j => j.id === payJobId)

  return (
    <div style={{ color: '#fff' }}>
      <Toaster position="top-right" richColors />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#d94e18', boxShadow: '0 0 6px rgba(217,78,24,0.9)' }} />
            <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#d94e18' }}>
              Meus trabalhos
            </span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: 900, letterSpacing: '-0.03em', margin: 0, color: '#fff' }}>
            Trabalhos publicados
          </h1>
        </div>
        <Link href="/dashboard/company/post-job" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '13px 24px', background: '#d94e18', color: '#fff', textDecoration: 'none',
          fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
        }}
          onMouseOver={e => (e.currentTarget.style.background = '#c04010')}
          onMouseOut={e => (e.currentTarget.style.background = '#d94e18')}>
          <Plus size={13} /> Publicar trabalho
        </Link>
      </div>

      <div style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
        {jobs.length === 0 ? (
          <div style={{ padding: '64px 32px', textAlign: 'center' }}>
            <Briefcase size={40} style={{ color: 'rgba(185,190,200,0.15)', margin: '0 auto 16px', display: 'block' }} />
            <p style={{ fontSize: 14, color: 'rgba(185,190,200,0.5)', margin: '0 0 16px' }}>Nenhum trabalho publicado ainda.</p>
            <Link href="/dashboard/company/post-job" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 20px', border: '1px solid rgba(217,78,24,0.4)', color: '#d94e18',
              textDecoration: 'none', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>
              Publicar primeiro trabalho <ArrowRight size={11} />
            </Link>
          </div>
        ) : (
          jobs.map((job: any, i: number) => {
            const status = statusMap[job.status] ?? { label: job.status, color: '#9ca3af' }
            return (
              <div key={job.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '20px 24px',
                borderBottom: i < jobs.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                transition: 'background 0.15s',
              }}
                onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: '0 0 4px' }}>{job.title}</p>
                  <p style={{ fontSize: 12, color: 'rgba(185,190,200,0.4)', margin: 0 }}>
                    {formatDate(job.created_at)}
                    {job.profiles?.name && ` · Freelancer: ${job.profiles.name}`}
                    {job.deadline_hours && ` · ${job.deadline_hours}h de prazo`}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 16, flexShrink: 0 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-heading)' }}>
                    {formatCurrency(job.value)}
                  </span>
                  <span style={{
                    fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                    padding: '4px 10px',
                    background: `${status.color}18`,
                    border: `1px solid ${status.color}40`,
                    color: status.color, whiteSpace: 'nowrap',
                  }}>
                    {status.label}
                  </span>
                  {job.status === 'delivered' && (
                    <button
                      onClick={() => setPayJobId(job.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '7px 14px',
                        background: 'rgba(34,197,94,0.12)',
                        border: '1px solid rgba(34,197,94,0.4)',
                        color: '#22c55e', cursor: 'pointer',
                        fontSize: '0.62rem', fontWeight: 700,
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                        fontFamily: 'inherit', transition: 'all 0.15s', whiteSpace: 'nowrap',
                      }}
                      onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(34,197,94,0.22)' }}
                      onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(34,197,94,0.12)' }}>
                      <CreditCard size={11} /> Pagar
                    </button>
                  )}
                  {job.status === 'in_progress' && (
                    <Link href="/dashboard/messages" style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      fontSize: 12, color: '#d4783a', textDecoration: 'none',
                    }}>
                      Chat <ArrowRight size={11} />
                    </Link>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {payJobId && payJob && (
        <PaymentModal
          job={payJob}
          onClose={() => setPayJobId(null)}
          onSuccess={() => {
            setPayJobId(null)
            setJobs(prev => prev.map(j => j.id === payJobId ? { ...j, status: 'completed' } : j))
          }}
        />
      )}
    </div>
  )
}

function PaymentModal({ job, onClose, onSuccess }: {
  job: any
  onClose: () => void
  onSuccess: () => void
}) {
  const [paying, setPaying] = useState(false)
  const fee = job.value * 0.15
  const freelancerAmount = job.value - fee

  async function openFile() {
    const res = await fetch(`/api/jobs/${job.id}/delivery-url`)
    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Erro ao abrir arquivo.'); return }
    window.open(json.url, '_blank')
  }

  async function handlePay() {
    setPaying(true)
    const res = await fetch(`/api/jobs/${job.id}/pay`, { method: 'POST' })
    const json = await res.json()

    if (!res.ok) {
      toast.error(json.error ?? 'Erro ao processar pagamento.')
      setPaying(false)
      return
    }

    toast.success('Pagamento confirmado! O freelancer recebeu o valor.')
    onSuccess()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        width: '100%', maxWidth: 480,
        background: '#0f1219',
        border: '1px solid rgba(255,255,255,0.1)',
        padding: 36,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.9)' }} />
              <span style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#22c55e' }}>
                Realizar pagamento
              </span>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
              {job.title}
            </h2>
            <p style={{ fontSize: 12, color: 'rgba(185,190,200,0.4)', margin: 0 }}>
              Freelancer: {job.profiles?.name}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(185,190,200,0.4)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Arquivo entregue */}
        {job.delivery_url && (
          <button onClick={openFile} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '14px 16px', marginBottom: 20, width: '100%',
            background: 'rgba(193,143,107,0.08)',
            border: '1px solid rgba(193,143,107,0.2)',
            cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s',
          }}
            onMouseOver={e => (e.currentTarget.style.background = 'rgba(193,143,107,0.15)')}
            onMouseOut={e => (e.currentTarget.style.background = 'rgba(193,143,107,0.08)')}>
            <FileText size={16} style={{ color: '#C18F6B', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#C18F6B', margin: '0 0 2px' }}>Arquivo entregue</p>
              <p style={{ fontSize: 11, color: 'rgba(185,190,200,0.4)', margin: 0 }}>Clique para visualizar</p>
            </div>
            <ExternalLink size={13} style={{ color: '#C18F6B', flexShrink: 0 }} />
          </button>
        )}
        {job.delivery_note && (
          <div style={{ padding: '12px 16px', marginBottom: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(185,190,200,0.4)', margin: '0 0 6px' }}>
              Observação do freelancer
            </p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.5 }}>{job.delivery_note}</p>
          </div>
        )}

        {/* Resumo financeiro */}
        <div style={{ border: '1px solid rgba(255,255,255,0.08)', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 13, color: 'rgba(185,190,200,0.6)' }}>Valor do trabalho</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{formatCurrency(job.value)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 13, color: 'rgba(185,190,200,0.6)' }}>Taxa da plataforma (15%)</span>
            <span style={{ fontSize: 13, color: '#d94e18' }}>− {formatCurrency(fee)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(34,197,94,0.05)' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#22c55e' }}>Freelancer recebe</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#22c55e', fontFamily: 'var(--font-heading)' }}>{formatCurrency(freelancerAmount)}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '13px', background: 'transparent',
            border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(185,190,200,0.6)',
            cursor: 'pointer', fontSize: '0.65rem', fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'inherit',
          }}>
            Cancelar
          </button>
          <button onClick={handlePay} disabled={paying} style={{
            flex: 2, padding: '13px',
            background: paying ? 'rgba(34,197,94,0.3)' : '#22c55e',
            border: 'none', color: paying ? 'rgba(255,255,255,0.5)' : '#000',
            cursor: paying ? 'not-allowed' : 'pointer',
            fontSize: '0.65rem', fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s',
          }}>
            <CreditCard size={13} />
            {paying ? 'Processando...' : `Confirmar pagamento · ${formatCurrency(job.value)}`}
          </button>
        </div>
      </div>
    </div>
  )
}
