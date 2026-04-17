'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Briefcase, ArrowRight, Plus, X, CreditCard, FileText, FileImage,
  FileArchive, FileCode, File, Lock, Copy, CheckCircle, Loader,
  Trash2, Download, ThumbsUp, AlertTriangle, ShieldCheck, Clock,
} from 'lucide-react'
import { calcCompanyTotal, calcFreelancerReceives, PLATFORM_FEE_COMPANY, PLATFORM_FEE_FREELANCER } from '@/lib/fees'
import Link from 'next/link'
import { toast, Toaster } from 'sonner'
import { ReviewModal } from '@/components/ReviewModal'

const statusMap: Record<string, { label: string; color: string }> = {
  open:             { label: 'Aberto',           color: '#3b82f6' },
  in_progress:      { label: 'Em andamento',     color: '#d94e18' },
  delivered:        { label: 'Entregue',         color: '#C18F6B' },
  payment_received: { label: 'Pago — em análise', color: '#a78bfa' },
  completed:        { label: 'Concluído',        color: '#22c55e' },
  disputed:         { label: 'Contestado',       color: '#f59e0b' },
  cancelled:        { label: 'Cancelado',        color: '#ef4444' },
}

export default function CompanyJobsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [jobs, setJobs] = useState<any[]>([])
  const [completedCount, setCompletedCount] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [payJobId, setPayJobId] = useState<string | null>(null)
  const [cancelJobId, setCancelJobId] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [approveJobId, setApproveJobId] = useState<string | null>(null)
  const [disputeJobId, setDisputeJobId] = useState<string | null>(null)
  const [approving, setApproving] = useState(false)
  const [disputing, setDisputing] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [downloadingJobId, setDownloadingJobId] = useState<string | null>(null)
  const [pendingReview, setPendingReview] = useState<{ archiveId: string; jobTitle: string; freelancerName: string } | null>(null)

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

      // Contador de jobs já concluídos e arquivados
      const { count } = await supabase
        .from('job_archives')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', profile.id)
      setCompletedCount(count ?? 0)

      // Verifica se há avaliação pendente (job concluído ainda não avaliado)
      const { data: unreviewed } = await supabase
        .from('job_archives')
        .select('id, title, freelancer_id, profiles!job_archives_freelancer_id_fkey(name)')
        .eq('company_id', profile.id)
        .eq('company_reviewed', false)
        .limit(1)
        .single()

      if (unreviewed) {
        setPendingReview({
          archiveId:     unreviewed.id,
          jobTitle:      unreviewed.title,
          freelancerName: (unreviewed as any).profiles?.name ?? 'Freelancer',
        })
      }

      setLoaded(true)
    }
    load()
  }, [])

  if (!loaded) return null

  const payJob = jobs.find(j => j.id === payJobId)
  const cancelJob = jobs.find(j => j.id === cancelJobId)
  const approveJob = jobs.find(j => j.id === approveJobId)
  const disputeJob = jobs.find(j => j.id === disputeJobId)

  async function confirmCancel() {
    if (!cancelJobId) return
    setCancelling(true)
    const res = await fetch(`/api/jobs/${cancelJobId}/cancel`, { method: 'POST' })
    const json = await res.json()
    setCancelling(false)
    if (!res.ok) { toast.error(json.error ?? 'Erro ao cancelar.'); return }
    toast.success('Trabalho cancelado.')
    setJobs(prev => prev.map(j => j.id === cancelJobId ? { ...j, status: 'cancelled' } : j))
    setCancelJobId(null)
  }

  async function confirmApprove() {
    if (!approveJobId) return
    const job = approveJob  // captura antes de limpar o estado
    setApproving(true)
    const res = await fetch(`/api/jobs/${approveJobId}/approve`, { method: 'POST' })
    const json = await res.json()
    setApproving(false)
    if (!res.ok) { toast.error(json.error ?? 'Erro ao aprovar.'); return }
    toast.success('Entrega aprovada! Pagamento liberado para o freelancer.')
    setJobs(prev => prev.filter(j => j.id !== approveJobId))  // remove da lista (foi arquivado)
    setCompletedCount(prev => prev + 1)
    setApproveJobId(null)

    // Aguarda arquivamento completar antes de pedir review
    setTimeout(async () => {
      const { data: arch } = await supabase
        .from('job_archives')
        .select('id, title, profiles!job_archives_freelancer_id_fkey(name)')
        .eq('company_reviewed', false)
        .limit(1)
        .maybeSingle()
      if (arch) setPendingReview({
        archiveId:      arch.id,
        jobTitle:       arch.title,
        freelancerName: (arch as any).profiles?.name ?? 'Freelancer',
      })
    }, 2000)
  }

  async function confirmDispute() {
    if (!disputeJobId) return
    setDisputing(true)
    const res = await fetch(`/api/jobs/${disputeJobId}/dispute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: disputeReason }),
    })
    const json = await res.json()
    setDisputing(false)
    if (!res.ok) { toast.error(json.error ?? 'Erro ao contestar.'); return }
    toast.success('Contestação aberta. Nossa equipe entrará em contato.')
    setJobs(prev => prev.map(j => j.id === disputeJobId ? { ...j, status: 'disputed' } : j))
    setDisputeJobId(null)
    setDisputeReason('')
  }

  async function downloadDelivery(jobId: string) {
    setDownloadingJobId(jobId)
    const res = await fetch(`/api/jobs/${jobId}/delivery-url`)
    const json = await res.json()
    setDownloadingJobId(null)
    if (!res.ok) { toast.error(json.error ?? 'Erro ao baixar arquivo.'); return }
    window.open(json.url, '_blank')
  }

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

      {/* Contador de trabalhos concluídos */}
      {completedCount > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '16px 20px', marginBottom: 20,
          background: 'rgba(34,197,94,0.05)',
          border: '1px solid rgba(34,197,94,0.15)',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckCircle size={18} style={{ color: '#22c55e' }} />
          </div>
          <div>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#22c55e', margin: 0, fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}>
              {completedCount} {completedCount === 1 ? 'trabalho concluído' : 'trabalhos concluídos'}
            </p>
            <p style={{ fontSize: 11, color: 'rgba(185,190,200,0.45)', margin: 0 }}>
              Histórico arquivado com segurança
            </p>
          </div>
        </div>
      )}

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
            const isDownloading = downloadingJobId === job.id
            return (
              <div key={job.id} style={{
                padding: '20px 24px',
                borderBottom: i < jobs.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                transition: 'background 0.15s',
              }}
                onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: '0 0 4px' }}>{job.title}</p>
                    <p style={{ fontSize: 12, color: 'rgba(185,190,200,0.4)', margin: 0 }}>
                      {formatDate(job.created_at)}
                      {job.profiles?.name && ` · Freelancer: ${job.profiles.name}`}
                      {job.deadline_hours && ` · ${job.deadline_hours}h de prazo`}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
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

                    {/* Botão Pagar (quando entregue) */}
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

                    {/* Chat (em andamento) */}
                    {job.status === 'in_progress' && (
                      <Link href="/dashboard/messages" style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        fontSize: 12, color: '#d4783a', textDecoration: 'none',
                      }}>
                        Chat <ArrowRight size={11} />
                      </Link>
                    )}

                    {/* Cancelar (aberto ou em andamento) */}
                    {['open', 'in_progress'].includes(job.status) && (
                      <button
                        onClick={() => setCancelJobId(job.id)}
                        title="Cancelar trabalho"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '7px 12px',
                          background: 'rgba(239,68,68,0.08)',
                          border: '1px solid rgba(239,68,68,0.3)',
                          color: '#ef4444', cursor: 'pointer',
                          fontSize: '0.62rem', fontWeight: 700,
                          letterSpacing: '0.08em', textTransform: 'uppercase',
                          fontFamily: 'inherit', transition: 'all 0.15s', whiteSpace: 'nowrap',
                        }}
                        onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.18)' }}
                        onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)' }}>
                        <Trash2 size={11} /> Cancelar
                      </button>
                    )}
                  </div>
                </div>

                {/* Faixa de ações do escrow (pagamento retido aguardando aprovação) */}
                {job.status === 'payment_received' && (
                  <div style={{
                    marginTop: 14,
                    padding: '14px 16px',
                    background: 'rgba(167,139,250,0.06)',
                    border: '1px solid rgba(167,139,250,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <ShieldCheck size={16} style={{ color: '#a78bfa', flexShrink: 0 }} />
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', margin: '0 0 2px' }}>
                          Pagamento retido em escrow
                        </p>
                        <p style={{ fontSize: 11, color: 'rgba(185,190,200,0.5)', margin: 0 }}>
                          Baixe o arquivo, analise e decida abaixo
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {/* Baixar arquivo */}
                      <button
                        onClick={() => downloadDelivery(job.id)}
                        disabled={isDownloading}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '7px 14px',
                          background: 'rgba(167,139,250,0.12)',
                          border: '1px solid rgba(167,139,250,0.35)',
                          color: '#a78bfa', cursor: isDownloading ? 'not-allowed' : 'pointer',
                          fontSize: '0.62rem', fontWeight: 700,
                          letterSpacing: '0.08em', textTransform: 'uppercase',
                          fontFamily: 'inherit', whiteSpace: 'nowrap',
                        }}>
                        {isDownloading ? <Loader size={11} /> : <Download size={11} />}
                        {isDownloading ? 'Baixando...' : 'Baixar arquivo'}
                      </button>

                      {/* Aprovar entrega */}
                      <button
                        onClick={() => setApproveJobId(job.id)}
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
                        <ThumbsUp size={11} /> Aprovar entrega
                      </button>

                      {/* Contestar */}
                      <button
                        onClick={() => setDisputeJobId(job.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '7px 14px',
                          background: 'rgba(245,158,11,0.08)',
                          border: '1px solid rgba(245,158,11,0.3)',
                          color: '#f59e0b', cursor: 'pointer',
                          fontSize: '0.62rem', fontWeight: 700,
                          letterSpacing: '0.08em', textTransform: 'uppercase',
                          fontFamily: 'inherit', transition: 'all 0.15s', whiteSpace: 'nowrap',
                        }}
                        onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(245,158,11,0.18)' }}
                        onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(245,158,11,0.08)' }}>
                        <AlertTriangle size={11} /> Contestar
                      </button>
                    </div>
                  </div>
                )}

                {/* Faixa de download para trabalhos concluídos */}
                {job.status === 'completed' && job.delivery_url && (
                  <div style={{
                    marginTop: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                  }}>
                    <button
                      onClick={() => downloadDelivery(job.id)}
                      disabled={isDownloading}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 12px',
                        background: 'transparent',
                        border: '1px solid rgba(34,197,94,0.25)',
                        color: 'rgba(34,197,94,0.7)', cursor: isDownloading ? 'not-allowed' : 'pointer',
                        fontSize: '0.6rem', fontWeight: 700,
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                        fontFamily: 'inherit',
                      }}>
                      {isDownloading ? <Loader size={10} /> : <Download size={10} />}
                      {isDownloading ? 'Baixando...' : 'Baixar entrega'}
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Modal de pagamento PIX */}
      {payJobId && payJob && (
        <PaymentModal
          job={payJob}
          onClose={() => setPayJobId(null)}
          onSuccess={() => {
            setPayJobId(null)
            setJobs(prev => prev.map(j => j.id === payJobId ? { ...j, status: 'payment_received' } : j))
          }}
        />
      )}

      {/* Modal confirmação cancelamento */}
      {cancelJobId && cancelJob && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }} onClick={e => { if (e.target === e.currentTarget) setCancelJobId(null) }}>
          <div style={{
            width: '100%', maxWidth: 400, background: '#0f1219',
            border: '1px solid rgba(239,68,68,0.2)', padding: 32,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={16} style={{ color: '#ef4444' }} />
              </div>
              <div>
                <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#ef4444', margin: '0 0 2px' }}>Cancelar trabalho</p>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>{cancelJob.title}</h3>
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(185,190,200,0.6)', margin: '0 0 24px', lineHeight: 1.5 }}>
              Tem certeza que deseja cancelar este trabalho? Esta ação não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setCancelJobId(null)} style={{
                flex: 1, padding: '11px', background: 'transparent',
                border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(185,190,200,0.6)',
                cursor: 'pointer', fontSize: '0.65rem', fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'inherit',
              }}>
                Voltar
              </button>
              <button onClick={confirmCancel} disabled={cancelling} style={{
                flex: 1, padding: '11px',
                background: cancelling ? 'rgba(239,68,68,0.3)' : '#ef4444',
                border: 'none', color: '#fff',
                cursor: cancelling ? 'not-allowed' : 'pointer',
                fontSize: '0.65rem', fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'inherit',
              }}>
                {cancelling ? 'Cancelando...' : 'Confirmar cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal aprovar entrega */}
      {approveJobId && approveJob && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }} onClick={e => { if (e.target === e.currentTarget) setApproveJobId(null) }}>
          <div style={{
            width: '100%', maxWidth: 440, background: '#0f1219',
            border: '1px solid rgba(34,197,94,0.2)', padding: 32,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ThumbsUp size={18} style={{ color: '#22c55e' }} />
              </div>
              <div>
                <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#22c55e', margin: '0 0 2px' }}>Aprovar entrega</p>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>{approveJob.title}</h3>
              </div>
            </div>

            <div style={{ padding: '14px 16px', marginBottom: 20, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'rgba(185,190,200,0.6)' }}>Valor retido</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{formatCurrency(calcCompanyTotal(approveJob.value))}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'rgba(185,190,200,0.6)' }}>Freelancer receberá</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#22c55e' }}>{formatCurrency(calcFreelancerReceives(approveJob.value))}</span>
              </div>
            </div>

            <p style={{ fontSize: 13, color: 'rgba(185,190,200,0.6)', margin: '0 0 24px', lineHeight: 1.6 }}>
              Ao aprovar, você confirma que o trabalho foi entregue conforme o combinado e o pagamento será <strong style={{ color: '#22c55e' }}>liberado imediatamente</strong> para o freelancer.
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setApproveJobId(null)} style={{
                flex: 1, padding: '11px', background: 'transparent',
                border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(185,190,200,0.6)',
                cursor: 'pointer', fontSize: '0.65rem', fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'inherit',
              }}>
                Voltar
              </button>
              <button onClick={confirmApprove} disabled={approving} style={{
                flex: 2, padding: '11px',
                background: approving ? 'rgba(34,197,94,0.3)' : '#22c55e',
                border: 'none', color: approving ? 'rgba(255,255,255,0.5)' : '#000',
                cursor: approving ? 'not-allowed' : 'pointer',
                fontSize: '0.65rem', fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                {approving ? <Loader size={13} /> : <CheckCircle size={13} />}
                {approving ? 'Aprovando...' : 'Confirmar aprovação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de avaliação obrigatória */}
      {pendingReview && (
        <ReviewModal
          jobArchiveId={pendingReview.archiveId}
          jobTitle={pendingReview.jobTitle}
          reviewedName={pendingReview.freelancerName}
          reviewerRole="company"
          onDone={() => setPendingReview(null)}
        />
      )}

      {/* Modal contestar entrega */}
      {disputeJobId && disputeJob && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }} onClick={e => { if (e.target === e.currentTarget) { setDisputeJobId(null); setDisputeReason('') } }}>
          <div style={{
            width: '100%', maxWidth: 460, background: '#0f1219',
            border: '1px solid rgba(245,158,11,0.2)', padding: 32,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={18} style={{ color: '#f59e0b' }} />
              </div>
              <div>
                <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#f59e0b', margin: '0 0 2px' }}>Contestar entrega</p>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>{disputeJob.title}</h3>
              </div>
            </div>

            <p style={{ fontSize: 13, color: 'rgba(185,190,200,0.6)', margin: '0 0 16px', lineHeight: 1.6 }}>
              Informe o motivo da contestação. Nossa equipe analisará o caso e tomará uma decisão em até 3 dias úteis. O pagamento ficará retido durante a análise.
            </p>

            <textarea
              value={disputeReason}
              onChange={e => setDisputeReason(e.target.value)}
              placeholder="Descreva o problema com a entrega..."
              rows={4}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '12px 14px', marginBottom: 20,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff', fontSize: 13, lineHeight: 1.5,
                fontFamily: 'inherit', resize: 'vertical',
                outline: 'none',
              }}
            />

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setDisputeJobId(null); setDisputeReason('') }} style={{
                flex: 1, padding: '11px', background: 'transparent',
                border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(185,190,200,0.6)',
                cursor: 'pointer', fontSize: '0.65rem', fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'inherit',
              }}>
                Cancelar
              </button>
              <button onClick={confirmDispute} disabled={disputing || !disputeReason.trim()} style={{
                flex: 2, padding: '11px',
                background: disputing || !disputeReason.trim() ? 'rgba(245,158,11,0.2)' : '#f59e0b',
                border: 'none', color: disputing || !disputeReason.trim() ? 'rgba(255,255,255,0.3)' : '#000',
                cursor: disputing || !disputeReason.trim() ? 'not-allowed' : 'pointer',
                fontSize: '0.65rem', fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                {disputing ? <Loader size={13} /> : <AlertTriangle size={13} />}
                {disputing ? 'Enviando...' : 'Abrir contestação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PaymentModal({ job, onClose, onSuccess }: {
  job: any
  onClose: () => void
  onSuccess: () => void
}) {
  const [step, setStep] = useState<'summary' | 'pix' | 'waiting'>('summary')
  const [pix, setPix] = useState<{ qrcode: string; imagemQrcode: string; valor: number; txid?: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const totalValue = calcCompanyTotal(job.value)
  const freelancerReceives = calcFreelancerReceives(job.value)
  const platformFeeCompany = totalValue - job.value
  const platformFeeFreelancer = job.value - freelancerReceives

  const rawFileName = job.delivery_url ? job.delivery_url.split('/').pop() ?? '' : ''
  const fileName = rawFileName.replace(/^\d{13}-/, '')
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''

  function FileIcon() {
    const s = { flexShrink: 0 as const }
    if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return <FileImage size={28} color="#C18F6B" style={s} />
    if (['zip','rar','7z','tar','gz'].includes(ext)) return <FileArchive size={28} color="#C18F6B" style={s} />
    if (['js','ts','tsx','jsx','html','css','json','py','php'].includes(ext)) return <FileCode size={28} color="#C18F6B" style={s} />
    if (['pdf','doc','docx','txt','odt'].includes(ext)) return <FileText size={28} color="#C18F6B" style={s} />
    return <File size={28} color="#C18F6B" style={s} />
  }

  const fileTypeLabel: Record<string, string> = {
    pdf: 'PDF', doc: 'Word', docx: 'Word', txt: 'Texto',
    jpg: 'Imagem', jpeg: 'Imagem', png: 'Imagem', gif: 'GIF', webp: 'Imagem', svg: 'Vetor',
    zip: 'Arquivo ZIP', rar: 'Arquivo RAR', '7z': 'Arquivo 7Z',
    js: 'JavaScript', ts: 'TypeScript', tsx: 'TypeScript/React', py: 'Python',
    mp4: 'Vídeo', mp3: 'Áudio',
  }

  async function generatePix() {
    setLoading(true)
    const res = await fetch('/api/payments/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: job.id }),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Erro ao gerar PIX.'); setLoading(false); return }
    setPix(json)
    setStep('pix')
    setLoading(false)
    startPolling(json.txid ?? job.id.replace(/-/g, '').substring(0, 35))
  }

  function startPolling(txid: string) {
    setStep('waiting')
    const interval = setInterval(async () => {
      const res = await fetch(`/api/payments/status?txid=${txid}`)
      const json = await res.json()
      // Pagamento confirmado — dinheiro retido em escrow
      if (json.status === 'paid_pending_approval' || json.status === 'paid') {
        clearInterval(interval)
        toast.success('Pagamento confirmado! Arquivo liberado para análise.')
        onSuccess()
      }
    }, 4000)
    setTimeout(() => clearInterval(interval), 60 * 60 * 1000)
  }

  async function copyCode() {
    if (!pix) return
    await navigator.clipboard.writeText(pix.qrcode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      overflowY: 'auto',
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        width: '100%', maxWidth: 480,
        background: '#0f1219',
        border: '1px solid rgba(255,255,255,0.1)',
        padding: 36,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.9)' }} />
              <span style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#22c55e' }}>
                {step === 'waiting' ? 'Aguardando pagamento' : 'Realizar pagamento'}
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

        {step === 'summary' && (<>
          {job.delivery_url && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '16px 18px', marginBottom: 20,
              background: 'rgba(193,143,107,0.06)', border: '1px solid rgba(193,143,107,0.2)',
            }}>
              <FileIcon />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {fileName || 'arquivo'}
                </p>
                <p style={{ fontSize: 11, color: 'rgba(185,190,200,0.45)', margin: 0 }}>
                  {fileTypeLabel[ext] ?? (ext.toUpperCase() || 'Arquivo')}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                <Lock size={11} style={{ color: 'rgba(185,190,200,0.35)' }} />
                <span style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(185,190,200,0.35)' }}>
                  Disponível após pagamento
                </span>
              </div>
            </div>
          )}

          {job.delivery_note && (
            <div style={{ padding: '12px 16px', marginBottom: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(185,190,200,0.4)', margin: '0 0 6px' }}>
                Observação do freelancer
              </p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.5 }}>{job.delivery_note}</p>
            </div>
          )}

          {/* Escrow info */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 14px', marginBottom: 20,
            background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.2)',
          }}>
            <ShieldCheck size={16} style={{ color: '#a78bfa', flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: 'rgba(185,190,200,0.7)', margin: 0, lineHeight: 1.5 }}>
              O pagamento fica <strong style={{ color: '#a78bfa' }}>retido em escrow</strong>. O freelancer só recebe após você aprovar a entrega.
            </p>
          </div>

          <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(185,190,200,0.4)', marginBottom: 8 }}>
            O que você paga
          </p>
          <div style={{ border: '1px solid rgba(255,255,255,0.08)', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: 13, color: 'rgba(185,190,200,0.6)' }}>Valor do trabalho</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{formatCurrency(job.value)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: 13, color: 'rgba(185,190,200,0.6)' }}>Taxa da plataforma ({Math.round(PLATFORM_FEE_COMPANY * 100)}%)</span>
              <span style={{ fontSize: 13, color: '#d94e18' }}>+ {formatCurrency(platformFeeCompany)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(34,197,94,0.05)' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#22c55e' }}>Total a pagar (PIX)</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#22c55e', fontFamily: 'var(--font-heading)' }}>{formatCurrency(totalValue)}</span>
            </div>
          </div>

          <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(185,190,200,0.4)', marginBottom: 8 }}>
            O que o freelancer recebe
          </p>
          <div style={{ border: '1px solid rgba(255,255,255,0.08)', marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: 13, color: 'rgba(185,190,200,0.6)' }}>Valor do trabalho</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{formatCurrency(job.value)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: 13, color: 'rgba(185,190,200,0.6)' }}>Taxa da plataforma ({Math.round(PLATFORM_FEE_FREELANCER * 100)}%)</span>
              <span style={{ fontSize: 13, color: '#d94e18' }}>− {formatCurrency(platformFeeFreelancer)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(217,78,24,0.05)' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#C18F6B' }}>Freelancer recebe (após aprovação)</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#C18F6B', fontFamily: 'var(--font-heading)' }}>{formatCurrency(freelancerReceives)}</span>
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
            <button onClick={generatePix} disabled={loading} style={{
              flex: 2, padding: '13px',
              background: loading ? 'rgba(34,197,94,0.3)' : '#22c55e',
              border: 'none', color: loading ? 'rgba(255,255,255,0.5)' : '#000',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.65rem', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s',
            }}>
              {loading ? <Loader size={13} /> : <CreditCard size={13} />}
              {loading ? 'Gerando PIX...' : `Pagar ${formatCurrency(totalValue)} via PIX`}
            </button>
          </div>
        </>)}

        {(step === 'pix' || step === 'waiting') && pix && (<>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <img
              src={pix.imagemQrcode}
              alt="QR Code PIX"
              style={{ width: 200, height: 200, margin: '0 auto 16px', display: 'block', background: '#fff', padding: 8 }}
            />
            <p style={{ fontSize: 12, color: 'rgba(185,190,200,0.5)', marginBottom: 12 }}>
              Escaneie o QR Code ou use o código abaixo
            </p>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              padding: '10px 14px', marginBottom: 16,
            }}>
              <p style={{
                flex: 1, fontSize: 11, color: 'rgba(185,190,200,0.6)',
                margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontFamily: 'monospace',
              }}>
                {pix.qrcode}
              </p>
              <button onClick={copyCode} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: copied ? '#22c55e' : 'rgba(185,190,200,0.5)',
                flexShrink: 0, padding: 0, display: 'flex',
              }}>
                {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
              </button>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', marginBottom: 12,
              background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.2)',
            }}>
              <ShieldCheck size={14} style={{ color: '#a78bfa', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'rgba(185,190,200,0.6)', textAlign: 'left' }}>
                Após pagar, você precisará <strong style={{ color: '#a78bfa' }}>aprovar a entrega</strong> para liberar o pagamento ao freelancer.
              </span>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px 16px',
              background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)',
            }}>
              <Loader size={13} style={{ color: '#22c55e', animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 12, color: '#22c55e' }}>Aguardando confirmação do pagamento...</span>
            </div>
          </div>

          <button onClick={onClose} style={{
            width: '100%', padding: '13px', background: 'transparent',
            border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(185,190,200,0.6)',
            cursor: 'pointer', fontSize: '0.65rem', fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'inherit',
          }}>
            Fechar (pagamento pendente)
          </button>
        </>)}
      </div>
    </div>
  )
}
