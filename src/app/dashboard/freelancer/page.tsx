'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Wallet, Star, CheckCircle, Clock, ArrowRight, Zap, Tag, X, Wifi, MapPin, Trash2 } from 'lucide-react'
import { calcFreelancerReceives, PLATFORM_FEE_FREELANCER } from '@/lib/fees'
import Link from 'next/link'
import { toast, Toaster } from 'sonner'
import { ReviewModal } from '@/components/ReviewModal'

const statusMap: Record<string, { label: string; color: string }> = {
  open:             { label: 'Aberto',           color: '#3b82f6' },
  in_progress:      { label: 'Em andamento',     color: '#d94e18' },
  delivered:        { label: 'Entregue',         color: '#C18F6B' },
  payment_received: { label: 'Pago — em análise', color: '#a78bfa' },
  cancelled:        { label: 'Cancelado',        color: '#ef4444' },
  disputed:         { label: 'Contestado',       color: '#f59e0b' },
}

export default function FreelancerDashboard() {
  const supabase = createClient()
  const router = useRouter()

  const [profile, setProfile] = useState<any>(null)
  const [myJobs, setMyJobs] = useState<any[]>([])
  const [availableJobs, setAvailableJobs] = useState<any[]>([])
  const [archivedCount, setArchivedCount] = useState(0)
  const [pendingReview, setPendingReview] = useState<{ archiveId: string; jobTitle: string; companyName: string } | null>(null)
  const [userTagIds, setUserTagIds] = useState<string[]>([])
  const [accepting, setAccepting] = useState<string | null>(null)
  const [confirmJob, setConfirmJob] = useState<any | null>(null)
  const [cancelJobId, setCancelJobId] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const userTagIdsRef = useRef<string[]>([])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: prof } = await supabase
        .from('profiles').select('*').eq('user_id', user.id).single()
      if (!prof || prof.role !== 'freelancer') { router.push('/dashboard/company'); return }
      setProfile(prof)

      // My accepted jobs (ativos — concluídos são arquivados e deletados)
      const { data: jobs } = await supabase
        .from('jobs')
        .select('*, profiles!jobs_company_id_fkey(name)')
        .eq('freelancer_id', prof.id)
        .order('created_at', { ascending: false })
        .limit(8)
      setMyJobs(jobs ?? [])

      // Contador de jobs já concluídos e arquivados
      const { count: archived } = await supabase
        .from('job_archives')
        .select('id', { count: 'exact', head: true })
        .eq('freelancer_id', prof.id)
      setArchivedCount(archived ?? 0)

      // Verifica se há avaliação pendente (job concluído ainda não avaliado)
      const { data: unreviewed } = await supabase
        .from('job_archives')
        .select('id, title, company_id, profiles!job_archives_company_id_fkey(name)')
        .eq('freelancer_id', prof.id)
        .eq('freelancer_reviewed', false)
        .limit(1)
        .maybeSingle()

      if (unreviewed) {
        setPendingReview({
          archiveId:   unreviewed.id,
          jobTitle:    unreviewed.title,
          companyName: (unreviewed as any).profiles?.name ?? 'Empresa',
        })
      }

      // My tags
      const { data: ut } = await supabase
        .from('user_tags').select('tag_id').eq('profile_id', prof.id)
      const tagIds = (ut ?? []).map((r: any) => r.tag_id)
      setUserTagIds(tagIds)
      userTagIdsRef.current = tagIds

      // Available jobs matching my tags
      if (tagIds.length > 0) {
        await loadAvailableJobs(tagIds, prof.id)
      }
    }
    load()
  }, [])

  // Subscribe to new jobs after profile is loaded
  useEffect(() => {
    if (!profile) return

    const channel = supabase
      .channel('new-jobs')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'jobs',
      }, async (payload) => {
        const newJob = payload.new as any
        if (newJob.status !== 'open') return

        // Check if any of its tags match ours
        const { data: jt } = await supabase
          .from('job_tags').select('tag_id').eq('job_id', newJob.id)
        const jobTagIds = (jt ?? []).map((r: any) => r.tag_id)
        const hasMatch = jobTagIds.some(id => userTagIdsRef.current.includes(id))

        if (hasMatch) {
          toast.success(`Novo trabalho disponível: "${newJob.title}"`, {
            description: `${formatCurrency(newJob.value)} · Seja o primeiro a aceitar!`,
            duration: 8000,
            action: { label: 'Ver', onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
          })
          // Refresh available jobs
          await loadAvailableJobs(userTagIdsRef.current, profile.id)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile])

  // Realtime: remove job das listas se a empresa cancelar do lado dela
  useEffect(() => {
    if (!profile) return
    const channel = supabase
      .channel('freelancer-job-deletes')
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'jobs' }, (payload) => {
        const deletedId = (payload.old as any)?.id
        if (!deletedId) return
        setMyJobs(prev => prev.filter(j => j.id !== deletedId))
        setAvailableJobs(prev => prev.filter(j => j.id !== deletedId))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile])

  async function loadAvailableJobs(tagIds: string[], profileId: string) {
    if (tagIds.length === 0) return
    const { data: matchingJobTags } = await supabase
      .from('job_tags').select('job_id').in('tag_id', tagIds)
    const jobIds = [...new Set((matchingJobTags ?? []).map((r: any) => r.job_id))]
    if (jobIds.length === 0) { setAvailableJobs([]); return }

    const { data: jobs } = await supabase
      .from('jobs')
      .select('*, profiles!jobs_company_id_fkey(name), job_tags(tags(name))')
      .in('id', jobIds)
      .eq('status', 'open')
      .is('freelancer_id', null)
      .order('created_at', { ascending: false })
    setAvailableJobs(jobs ?? [])
  }


  async function confirmAccept() {
    if (!confirmJob) return
    setAccepting(confirmJob.id)
    setConfirmJob(null)

    const res = await fetch(`/api/jobs/${confirmJob.id}/accept`, { method: 'POST' })
    const json = await res.json()

    if (!res.ok) {
      toast.error(json.error ?? 'Erro ao aceitar trabalho.')
      setAccepting(null)
      await loadAvailableJobs(userTagIds, profile.id)
      return
    }

    toast.success('Trabalho aceito! O chat foi aberto.')
    setAccepting(null)

    const { data: jobs } = await supabase
      .from('jobs').select('*, profiles!jobs_company_id_fkey(name)')
      .eq('freelancer_id', profile.id).order('created_at', { ascending: false }).limit(8)
    setMyJobs(jobs ?? [])
    await loadAvailableJobs(userTagIds, profile.id)
    if (json.chatId) router.push(`/dashboard/messages/${json.chatId}`)
  }

  async function confirmCancel() {
    if (!cancelJobId) return
    setCancelling(true)
    const res = await fetch(`/api/jobs/${cancelJobId}/cancel`, { method: 'POST' })
    const json = await res.json()
    setCancelling(false)
    if (!res.ok) { toast.error(json.error ?? 'Erro ao cancelar.'); return }
    toast.success('Trabalho cancelado e removido.')
    setMyJobs(prev => prev.filter(j => j.id !== cancelJobId))
    setCancelJobId(null)
  }

  if (!profile) return null

  const activeJobs = myJobs.filter(j => j.status === 'in_progress').length
  const balance    = profile.balance ?? 0

  const stats = [
    { icon: Wallet,       label: 'Saldo disponível', value: formatCurrency(balance), accent: true },
    { icon: Clock,        label: 'Em andamento',      value: String(activeJobs)                   },
    { icon: CheckCircle,  label: 'Concluídos',        value: String(archivedCount)                },
    { icon: Star,         label: 'Avaliação',         value: profile.rating_count > 0 ? Number(profile.rating).toFixed(1) : '—' },
  ]

  return (
    <div style={{ color: '#fff' }}>
      <Toaster position="top-right" richColors />

      {/* Modal de avaliação obrigatória */}
      {pendingReview && (
        <ReviewModal
          jobArchiveId={pendingReview.archiveId}
          jobTitle={pendingReview.jobTitle}
          reviewedName={pendingReview.companyName}
          reviewerRole="freelancer"
          onDone={() => setPendingReview(null)}
        />
      )}

      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#d94e18', boxShadow: '0 0 6px rgba(217,78,24,0.9)' }} />
          <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#d94e18' }}>
            Painel do freelancer
          </span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 6px', color: '#fff' }}>
          Olá, {profile.name.split(' ')[0]}
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(185,190,200,0.6)', margin: 0 }}>
          Aqui está um resumo da sua atividade
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 40 }}>
        {stats.map(({ icon: Icon, label, value, accent }) => (
          <div key={label} style={{
            background: accent ? 'rgba(217,78,24,0.08)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${accent ? 'rgba(217,78,24,0.25)' : 'rgba(255,255,255,0.08)'}`,
            padding: '24px 20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Icon size={14} style={{ color: accent ? '#d94e18' : 'rgba(185,190,200,0.4)' }} />
              <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: accent ? '#d4783a' : 'rgba(185,190,200,0.4)' }}>
                {label}
              </span>
            </div>
            <p style={{ fontSize: 32, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.02em', fontFamily: 'var(--font-heading)' }}>
              {value}
            </p>
            {accent && balance > 0 && (
              <Link href="/dashboard/freelancer/withdraw" style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 12,
                fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: '#d94e18', textDecoration: 'none',
              }}>
                Sacar <ArrowRight size={10} />
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Available Jobs */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Zap size={14} style={{ color: '#d94e18' }} />
          <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(185,190,200,0.5)', margin: 0 }}>
            Trabalhos disponíveis para você
          </p>
          {availableJobs.length > 0 && (
            <span style={{
              fontSize: '0.58rem', fontWeight: 700, padding: '2px 8px',
              background: 'rgba(217,78,24,0.2)', border: '1px solid rgba(217,78,24,0.4)',
              color: '#d94e18',
            }}>
              {availableJobs.length}
            </span>
          )}
        </div>

        <div style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
          {userTagIds.length === 0 ? (
            <div style={{ padding: '40px 32px', textAlign: 'center' }}>
              <Tag size={32} style={{ color: 'rgba(185,190,200,0.15)', margin: '0 auto 12px', display: 'block' }} />
              <p style={{ fontSize: 14, color: 'rgba(185,190,200,0.5)', margin: '0 0 8px' }}>
                Você ainda não adicionou habilidades.
              </p>
              <Link href="/dashboard/settings" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 12, color: '#d94e18', textDecoration: 'none',
              }}>
                Adicionar habilidades <ArrowRight size={11} />
              </Link>
            </div>
          ) : availableJobs.length === 0 ? (
            <div style={{ padding: '40px 32px', textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: 'rgba(185,190,200,0.5)', margin: 0 }}>
                Nenhum trabalho disponível no momento. Você será notificado quando aparecer um novo.
              </p>
            </div>
          ) : (
            availableJobs.map((job: any, i: number) => (
              <div key={job.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                padding: '20px 24px',
                borderBottom: i < availableJobs.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: '0 0 4px' }}>{job.title}</p>
                  <p style={{ fontSize: 12, color: 'rgba(185,190,200,0.4)', margin: '0 0 8px' }}>
                    {job.profiles?.name} · {formatDate(job.created_at)}
                    {job.deadline_hours && ` · ${job.deadline_hours}h de prazo`}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {job.job_tags?.map((jt: any) => (
                      <span key={jt.tags?.name} style={{
                        fontSize: '0.58rem', fontWeight: 600, padding: '3px 8px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'rgba(185,190,200,0.6)',
                      }}>
                        {jt.tags?.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}>
                    {formatCurrency(job.value)}
                  </span>
                  <button
                    onClick={() => setConfirmJob(job)}
                    disabled={!!accepting}
                    style={{
                      padding: '10px 20px',
                      background: accepting ? 'rgba(217,78,24,0.4)' : '#d94e18',
                      color: '#fff', border: 'none',
                      cursor: accepting ? 'not-allowed' : 'pointer',
                      fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                      fontFamily: 'inherit', transition: 'background 0.15s',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                    onMouseOver={e => { if (!accepting) (e.currentTarget as HTMLButtonElement).style.background = '#c04010' }}
                    onMouseOut={e => { if (!accepting) (e.currentTarget as HTMLButtonElement).style.background = '#d94e18' }}>
                    <Zap size={12} /> Aceitar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal de confirmação de aceite */}
      {confirmJob && (() => {
        const freelancerReceives = calcFreelancerReceives(confirmJob.value)
        const fee = confirmJob.value - freelancerReceives
        return (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }} onClick={e => { if (e.target === e.currentTarget) setConfirmJob(null) }}>
            <div style={{ width: '100%', maxWidth: 500, background: '#0f1219', border: '1px solid rgba(255,255,255,0.1)', padding: 32 }}>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                  <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#d94e18', margin: '0 0 6px' }}>
                    Confirmar aceite
                  </p>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
                    {confirmJob.title}
                  </h3>
                  <p style={{ fontSize: 12, color: 'rgba(185,190,200,0.4)', margin: 0 }}>
                    {confirmJob.profiles?.name}
                    {confirmJob.deadline_hours && ` · ${confirmJob.deadline_hours}h de prazo`}
                  </p>
                </div>
                <button onClick={() => setConfirmJob(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(185,190,200,0.4)', padding: 4 }}>
                  <X size={18} />
                </button>
              </div>

              {/* Tipo: remoto ou presencial */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                {confirmJob.work_type === 'presential' ? (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontSize: 11, fontWeight: 700, padding: '4px 10px',
                    background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)',
                    color: '#fbbf24',
                  }}>
                    <MapPin size={10} /> Presencial
                  </span>
                ) : (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontSize: 11, fontWeight: 700, padding: '4px 10px',
                    background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
                    color: '#60a5fa',
                  }}>
                    <Wifi size={10} /> Remoto
                  </span>
                )}
              </div>

              {/* Descrição do job */}
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(185,190,200,0.4)', margin: '0 0 8px' }}>
                  Descrição
                </p>
                <div style={{
                  padding: '12px 14px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  fontSize: 13, color: 'rgba(185,190,200,0.75)',
                  lineHeight: 1.6,
                  maxHeight: 100,
                  overflowY: 'auto',
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(255,255,255,0.1) transparent',
                }}>
                  {confirmJob.description}
                </div>
              </div>

              {/* Endereço — só aparece se for presencial */}
              {confirmJob.work_type === 'presential' && confirmJob.address && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(251,191,36,0.6)', margin: '0 0 8px' }}>
                    Endereço do trabalho
                  </p>
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    padding: '12px 14px',
                    background: 'rgba(251,191,36,0.06)',
                    border: '1px solid rgba(251,191,36,0.2)',
                    fontSize: 13, color: '#fbbf24', lineHeight: 1.5,
                  }}>
                    <MapPin size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>{confirmJob.address}</span>
                  </div>
                </div>
              )}

              {/* Breakdown financeiro */}
              <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(185,190,200,0.4)', margin: '0 0 8px' }}>
                Quanto você vai receber
              </p>
              <div style={{ border: '1px solid rgba(255,255,255,0.08)', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: 13, color: 'rgba(185,190,200,0.6)' }}>Valor do trabalho</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{formatCurrency(confirmJob.value)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: 13, color: 'rgba(185,190,200,0.6)' }}>Taxa da plataforma ({Math.round(PLATFORM_FEE_FREELANCER * 100)}%)</span>
                  <span style={{ fontSize: 13, color: '#ef4444' }}>− {formatCurrency(fee)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 16px', background: 'rgba(34,197,94,0.05)' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#22c55e' }}>Você recebe</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: '#22c55e', fontFamily: 'var(--font-heading)' }}>{formatCurrency(freelancerReceives)}</span>
                </div>
              </div>

              <p style={{ fontSize: 12, color: 'rgba(185,190,200,0.4)', margin: '0 0 20px', lineHeight: 1.5 }}>
                Ao aceitar, você se compromete a entregar o trabalho dentro do prazo combinado. O valor será creditado após o pagamento da empresa.
              </p>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setConfirmJob(null)} style={{
                  flex: 1, padding: '12px', background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(185,190,200,0.6)',
                  cursor: 'pointer', fontSize: '0.65rem', fontWeight: 700,
                  letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'inherit',
                }}>
                  Recusar
                </button>
                <button onClick={confirmAccept} style={{
                  flex: 2, padding: '12px', background: '#d94e18', border: 'none', color: '#fff',
                  cursor: 'pointer', fontSize: '0.65rem', fontWeight: 700,
                  letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  <Zap size={13} /> Aceitar trabalho
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Modal confirmação cancelamento (freelancer) */}
      {cancelJobId && (() => {
        const job = myJobs.find(j => j.id === cancelJobId)
        if (!job) return null
        return (
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
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>{job.title}</h3>
                </div>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(185,190,200,0.6)', margin: '0 0 24px', lineHeight: 1.5 }}>
                Tem certeza que deseja cancelar este trabalho? A empresa será notificada e o job será removido. Esta ação não pode ser desfeita.
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
                  {cancelling ? 'Cancelando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* My Jobs */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(185,190,200,0.5)', margin: 0 }}>
            Meus trabalhos
          </p>
          <Link href="/dashboard/freelancer/jobs" style={{ fontSize: 12, color: '#d4783a', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            Ver todos <ArrowRight size={11} />
          </Link>
        </div>

        <div style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
          {myJobs.length === 0 ? (
            <div style={{ padding: '48px 32px', textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: 'rgba(185,190,200,0.5)', margin: 0 }}>
                Nenhum trabalho aceito ainda.
              </p>
            </div>
          ) : (
            myJobs.map((job: any, i: number) => (
              <div key={job.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: i < myJobs.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                transition: 'background 0.15s',
              }}
                onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: '0 0 3px' }}>{job.title}</p>
                  <p style={{ fontSize: 12, color: 'rgba(185,190,200,0.4)', margin: 0 }}>
                    {job.profiles?.name} · {formatDate(job.created_at)}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-heading)' }}>
                    {formatCurrency(job.value)}
                  </span>
                  <span style={{
                    fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                    padding: '4px 10px',
                    background: `${statusMap[job.status]?.color}18`,
                    border: `1px solid ${statusMap[job.status]?.color}40`,
                    color: statusMap[job.status]?.color,
                  }}>
                    {statusMap[job.status]?.label ?? job.status}
                  </span>
                  {job.status === 'in_progress' && (
                    <button
                      onClick={() => setCancelJobId(job.id)}
                      title="Cancelar trabalho"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '5px 10px',
                        background: 'rgba(239,68,68,0.08)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        color: '#ef4444', cursor: 'pointer',
                        fontSize: '0.6rem', fontWeight: 700,
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                        fontFamily: 'inherit', transition: 'all 0.15s',
                      }}
                      onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.18)' }}
                      onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)' }}>
                      <Trash2 size={10} /> Cancelar
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
