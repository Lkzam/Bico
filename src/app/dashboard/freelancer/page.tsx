'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Wallet, Star, CheckCircle, Clock, ArrowRight, Zap, Tag } from 'lucide-react'
import Link from 'next/link'
import { toast, Toaster } from 'sonner'

const statusMap: Record<string, { label: string; color: string }> = {
  open:        { label: 'Aberto',       color: '#3b82f6' },
  in_progress: { label: 'Em andamento', color: '#d94e18' },
  delivered:   { label: 'Entregue',     color: '#C18F6B' },
  completed:   { label: 'Concluído',    color: '#22c55e' },
  cancelled:   { label: 'Cancelado',    color: '#ef4444' },
}

export default function FreelancerDashboard() {
  const supabase = createClient()
  const router = useRouter()

  const [profile, setProfile] = useState<any>(null)
  const [myJobs, setMyJobs] = useState<any[]>([])
  const [availableJobs, setAvailableJobs] = useState<any[]>([])
  const [userTagIds, setUserTagIds] = useState<string[]>([])
  const [accepting, setAccepting] = useState<string | null>(null)
  const userTagIdsRef = useRef<string[]>([])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: prof } = await supabase
        .from('profiles').select('*').eq('user_id', user.id).single()
      if (!prof || prof.role !== 'freelancer') { router.push('/dashboard/company'); return }
      setProfile(prof)

      // My accepted jobs
      const { data: jobs } = await supabase
        .from('jobs')
        .select('*, profiles!jobs_company_id_fkey(name)')
        .eq('freelancer_id', prof.id)
        .order('created_at', { ascending: false })
        .limit(8)
      setMyJobs(jobs ?? [])

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

  async function acceptJob(jobId: string) {
    if (!profile || accepting) return
    setAccepting(jobId)

    const res = await fetch(`/api/jobs/${jobId}/accept`, { method: 'POST' })
    const json = await res.json()

    if (!res.ok) {
      toast.error(json.error ?? 'Erro ao aceitar trabalho.')
      setAccepting(null)
      await loadAvailableJobs(userTagIds, profile.id)
      return
    }

    toast.success('Trabalho aceito! O chat foi aberto.')
    setAccepting(null)

    // Refresh
    const { data: jobs } = await supabase
      .from('jobs')
      .select('*, profiles!jobs_company_id_fkey(name)')
      .eq('freelancer_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(8)
    setMyJobs(jobs ?? [])
    await loadAvailableJobs(userTagIds, profile.id)

    if (json.chatId) router.push(`/dashboard/messages/${json.chatId}`)
  }

  if (!profile) return null

  const completedJobs = myJobs.filter(j => j.status === 'completed').length
  const activeJobs    = myJobs.filter(j => j.status === 'in_progress').length
  const balance       = profile.balance ?? 0

  const stats = [
    { icon: Wallet,       label: 'Saldo disponível', value: formatCurrency(balance), accent: true },
    { icon: Clock,        label: 'Em andamento',      value: String(activeJobs)                   },
    { icon: CheckCircle,  label: 'Concluídos',        value: String(completedJobs)                },
    { icon: Star,         label: 'Avaliação',         value: profile.rating_count > 0 ? Number(profile.rating).toFixed(1) : '—' },
  ]

  return (
    <div style={{ color: '#fff' }}>
      <Toaster position="top-right" richColors />

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
                    onClick={() => acceptJob(job.id)}
                    disabled={accepting === job.id}
                    style={{
                      padding: '10px 20px',
                      background: accepting === job.id ? 'rgba(217,78,24,0.4)' : '#d94e18',
                      color: '#fff', border: 'none',
                      cursor: accepting === job.id ? 'not-allowed' : 'pointer',
                      fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                      fontFamily: 'inherit', transition: 'background 0.15s',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                    onMouseOver={e => { if (accepting !== job.id) (e.currentTarget as HTMLButtonElement).style.background = '#c04010' }}
                    onMouseOut={e => { if (accepting !== job.id) (e.currentTarget as HTMLButtonElement).style.background = '#d94e18' }}>
                    <Zap size={12} />
                    {accepting === job.id ? 'Aceitando...' : 'Aceitar'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

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
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
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
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
