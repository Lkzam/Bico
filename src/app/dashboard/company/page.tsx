'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Briefcase, CheckCircle, Clock, DollarSign, ArrowRight, Plus } from 'lucide-react'
import Link from 'next/link'

const statusMap: Record<string, { label: string; color: string }> = {
  open:        { label: 'Aberto',       color: '#3b82f6' },
  in_progress: { label: 'Em andamento', color: '#d94e18' },
  delivered:   { label: 'Entregue',     color: '#C18F6B' },
  completed:   { label: 'Concluído',    color: '#22c55e' },
  cancelled:   { label: 'Cancelado',    color: '#ef4444' },
}

export default function CompanyDashboard() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [jobs, setJobs] = useState<any[]>([])
  const [allJobs, setAllJobs] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: prof } = await supabase
        .from('profiles').select('*').eq('user_id', user.id).single()
      if (!prof || prof.role !== 'company') { router.push('/dashboard/freelancer'); return }
      setProfile(prof)

      const { data: recentJobs } = await supabase
        .from('jobs')
        .select('*, job_tags(tags(name))')
        .eq('company_id', prof.id)
        .order('created_at', { ascending: false })
        .limit(8)
      setJobs(recentJobs ?? [])

      const { data: all } = await supabase
        .from('jobs').select('status, value').eq('company_id', prof.id)
      setAllJobs(all ?? [])
    }
    load()
  }, [])

  const totalJobs     = allJobs.length
  const completedJobs = allJobs.filter(j => j.status === 'completed').length
  const activeJobs    = allJobs.filter(j => ['open', 'in_progress'].includes(j.status)).length
  const totalSpent    = allJobs.filter(j => j.status === 'completed').reduce((s, j) => s + (j.value ?? 0), 0)

  const stats = [
    { icon: Briefcase,   label: 'Total publicados', value: String(totalJobs)          },
    { icon: Clock,       label: 'Ativos',           value: String(activeJobs)         },
    { icon: CheckCircle, label: 'Concluídos',       value: String(completedJobs)      },
    { icon: DollarSign,  label: 'Total investido',  value: formatCurrency(totalSpent) },
  ]

  if (!profile) return null

  return (
    <div style={{ color: '#fff' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#d94e18', boxShadow: '0 0 6px rgba(217,78,24,0.9)' }} />
            <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#d94e18' }}>
              Painel da empresa
            </span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 6px', color: '#fff' }}>
            Olá, {profile.name.split(' ')[0]}
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(185,190,200,0.6)', margin: 0 }}>
            Gerencie seus trabalhos e contratações
          </p>
        </div>
        <Link href="/dashboard/company/post-job" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '13px 24px',
          background: '#d94e18', color: '#fff', textDecoration: 'none',
          fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
          transition: 'background 0.2s',
        }}
          onMouseOver={e => (e.currentTarget.style.background = '#c04010')}
          onMouseOut={e => (e.currentTarget.style.background = '#d94e18')}>
          <Plus size={13} /> Publicar trabalho
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 40 }}>
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '24px 20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Icon size={14} style={{ color: 'rgba(185,190,200,0.4)' }} />
              <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(185,190,200,0.4)' }}>
                {label}
              </span>
            </div>
            <p style={{ fontSize: 32, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.02em', fontFamily: 'var(--font-heading)' }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Jobs */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(185,190,200,0.5)', margin: 0 }}>
            Trabalhos recentes
          </p>
          <Link href="/dashboard/company/jobs" style={{ fontSize: 12, color: '#d4783a', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            Ver todos <ArrowRight size={11} />
          </Link>
        </div>

        <div style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
          {jobs.length === 0 ? (
            <div style={{ padding: '48px 32px', textAlign: 'center' }}>
              <Briefcase size={36} style={{ color: 'rgba(185,190,200,0.15)', margin: '0 auto 16px', display: 'block' }} />
              <p style={{ fontSize: 14, color: 'rgba(185,190,200,0.5)', margin: '0 0 6px' }}>
                Nenhum trabalho publicado ainda.
              </p>
              <Link href="/dashboard/company/post-job" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16,
                padding: '10px 20px',
                border: '1px solid rgba(217,78,24,0.4)', color: '#d94e18',
                textDecoration: 'none', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>
                Publicar primeiro trabalho <ArrowRight size={11} />
              </Link>
            </div>
          ) : (
            jobs.map((job: any, i: number) => (
              <div key={job.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: i < jobs.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                transition: 'background 0.15s',
              }}
                onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: '0 0 3px' }}>{job.title}</p>
                  <p style={{ fontSize: 12, color: 'rgba(185,190,200,0.4)', margin: 0 }}>
                    {formatDate(job.created_at)}
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
