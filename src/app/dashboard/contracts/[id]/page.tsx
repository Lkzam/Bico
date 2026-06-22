'use client'

import { useEffect, useRef, useState } from 'react'
import { use as usePromise } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { calcFreelancerReceives } from '@/lib/fees'
import {
  ArrowLeft, Upload, X, FileText, CheckCircle, Loader, Download,
  ThumbsUp, Clock, Lock, MessageSquare,
} from 'lucide-react'
import Link from 'next/link'
import { toast, Toaster } from 'sonner'

const msStatus: Record<string, { label: string; color: string }> = {
  pending:     { label: 'Pendente',     color: '#9ca3af' },
  in_progress: { label: 'Em andamento', color: '#d94e18' },
  delivered:   { label: 'Entregue',     color: '#C18F6B' },
  approved:    { label: 'Aprovada',     color: '#22c55e' },
  cancelled:   { label: 'Cancelada',    color: '#ef4444' },
}

export default function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = usePromise(params)
  const supabase = createClient()
  const router = useRouter()

  const [loaded, setLoaded] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [job, setJob] = useState<any>(null)
  const [milestones, setMilestones] = useState<any[]>([])
  const [deliverMs, setDeliverMs] = useState<any>(null)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: prof } = await supabase
      .from('profiles').select('id, role, name').eq('user_id', user.id).single()
    if (!prof) { router.push('/dashboard'); return }
    setProfile(prof)

    const { data: j } = await supabase
      .from('jobs')
      .select('id, title, value, status, mode, company_id, freelancer_id, company:profiles!jobs_company_id_fkey(name), freelancer:profiles!jobs_freelancer_id_fkey(name)')
      .eq('id', jobId)
      .single()

    if (!j || j.mode !== 'contract' || (j.company_id !== prof.id && j.freelancer_id !== prof.id)) {
      router.push('/dashboard')
      return
    }
    setJob(j)

    const { data: ms } = await supabase
      .from('contract_milestones')
      .select('id, position, title, description, value, deadline_hours, status, delivery_note, delivered_at, approved_at')
      .eq('job_id', jobId)
      .order('position', { ascending: true })
    setMilestones(ms ?? [])
    setLoaded(true)
  }

  useEffect(() => { load() }, [jobId])

  if (!loaded || !job) return null

  const isCompany    = profile.id === job.company_id
  const isFreelancer = profile.id === job.freelancer_id
  const total        = milestones.reduce((s, m) => s + Number(m.value), 0)
  const approvedSum  = milestones.filter(m => m.status === 'approved').reduce((s, m) => s + Number(m.value), 0)
  const approvedCount = milestones.filter(m => m.status === 'approved').length
  const pct = total > 0 ? Math.round((approvedSum / total) * 100) : 0
  const otherName = isCompany ? (job.freelancer?.name ?? 'Freelancer') : (job.company?.name ?? 'Empresa')

  async function downloadMilestone(msId: string) {
    setDownloadingId(msId)
    const res = await fetch(`/api/contracts/milestones/${msId}/delivery-url`)
    const json = await res.json()
    setDownloadingId(null)
    if (!res.ok) { toast.error(json.error ?? 'Erro ao baixar arquivo.'); return }
    window.open(json.url, '_blank')
  }

  async function approveMilestone(msId: string) {
    if (!confirm('Aprovar esta etapa? O valor (93%) será liberado imediatamente para o freelancer.')) return
    setApprovingId(msId)
    const res = await fetch(`/api/contracts/milestones/${msId}/approve`, { method: 'POST' })
    const json = await res.json()
    setApprovingId(null)
    if (!res.ok) { toast.error(json.error ?? 'Erro ao aprovar etapa.'); return }
    if (json.allApproved) {
      toast.success('Última etapa aprovada! Contrato concluído.')
      router.push('/dashboard/company/jobs')
      return
    }
    toast.success('Etapa aprovada! Pagamento liberado.')
    load()
  }

  return (
    <div style={{ color: '#fff' }}>
      <Toaster position="top-right" richColors />

      <Link href={isCompany ? '/dashboard/company/jobs' : '/dashboard/freelancer/jobs'} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 12, color: 'rgba(185,190,200,0.5)', textDecoration: 'none', marginBottom: 18,
      }}>
        <ArrowLeft size={12} /> Voltar para trabalhos
      </Link>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', boxShadow: '0 0 6px rgba(167,139,250,0.85)' }} />
          <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#a78bfa' }}>
            Contrato {job.status === 'completed' ? '· concluído' : 'em andamento'}
          </span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(1.5rem, 2.6vw, 2.1rem)', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 6px' }}>
          {job.title}
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(185,190,200,0.55)', margin: 0 }}>
          {isCompany ? 'Freelancer' : 'Empresa'}: <strong style={{ color: '#fff' }}>{otherName}</strong>
        </p>
      </div>

      {/* Progresso */}
      <div style={{ border: '1px solid rgba(167,139,250,0.2)', background: 'rgba(167,139,250,0.04)', padding: 18, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'rgba(185,190,200,0.6)' }}>
            {approvedCount} de {milestones.length} etapas aprovadas
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa' }}>
            {formatCurrency(approvedSum)} <span style={{ color: 'rgba(185,190,200,0.4)', fontWeight: 400 }}>liberado de {formatCurrency(total)}</span>
          </span>
        </div>
        <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #a78bfa, #22c55e)', transition: 'width 0.4s' }} />
        </div>
        {isFreelancer && (
          <p style={{ fontSize: 11, color: 'rgba(34,197,94,0.7)', margin: '10px 0 0' }}>
            Você recebe 93% de cada etapa aprovada (taxa de 7% no recebimento).
          </p>
        )}
      </div>

      {/* Timeline de etapas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {milestones.map((m) => {
          const st = msStatus[m.status] ?? { label: m.status, color: '#9ca3af' }
          const receives = calcFreelancerReceives(Number(m.value))
          return (
            <div key={m.id} style={{
              border: `1px solid ${m.status === 'approved' ? 'rgba(34,197,94,0.3)' : m.status === 'in_progress' ? 'rgba(217,78,24,0.3)' : 'rgba(255,255,255,0.08)'}`,
              background: m.status === 'approved' ? 'rgba(34,197,94,0.04)' : 'rgba(255,255,255,0.02)',
              padding: 18,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#a78bfa' }}>Etapa {m.position}</span>
                    <span style={{
                      fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                      padding: '3px 8px', background: `${st.color}18`, border: `1px solid ${st.color}40`, color: st.color, whiteSpace: 'nowrap',
                    }}>{st.label}</span>
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>{m.title}</p>
                  {m.description && <p style={{ fontSize: 12.5, color: 'rgba(185,190,200,0.55)', margin: '2px 0 0', lineHeight: 1.5 }}>{m.description}</p>}
                  {m.delivery_note && (m.status === 'delivered' || m.status === 'approved') && (
                    <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(193,143,107,0.06)', border: '1px solid rgba(193,143,107,0.2)' }}>
                      <p style={{ fontSize: 10, color: 'rgba(193,143,107,0.8)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Observação da entrega</p>
                      <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: 1.5 }}>{m.delivery_note}</p>
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: 17, fontWeight: 800, color: '#fff', margin: 0, fontFamily: 'var(--font-heading)' }}>{formatCurrency(Number(m.value))}</p>
                  {isFreelancer && <p style={{ fontSize: 10.5, color: 'rgba(34,197,94,0.75)', margin: '2px 0 0' }}>recebe {formatCurrency(receives)}</p>}
                  {m.deadline_hours ? <p style={{ fontSize: 10.5, color: 'rgba(185,190,200,0.4)', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end' }}><Clock size={9} /> {m.deadline_hours}h</p> : null}
                </div>
              </div>

              {/* Ações */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                {/* Freelancer: entregar etapa ativa */}
                {isFreelancer && m.status === 'in_progress' && (
                  <button onClick={() => setDeliverMs(m)} style={btn('#22c55e')}>
                    <Upload size={11} /> Entregar etapa
                  </button>
                )}
                {isFreelancer && m.status === 'delivered' && (
                  <span style={{ fontSize: 11.5, color: '#C18F6B', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Clock size={12} /> Aguardando aprovação da empresa
                  </span>
                )}
                {isFreelancer && m.status === 'pending' && (
                  <span style={{ fontSize: 11.5, color: 'rgba(185,190,200,0.4)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Lock size={11} /> Aguardando etapas anteriores
                  </span>
                )}

                {/* Empresa: baixar + aprovar etapa entregue */}
                {isCompany && m.status === 'delivered' && (
                  <>
                    <button onClick={() => downloadMilestone(m.id)} disabled={downloadingId === m.id} style={btn('#a78bfa')}>
                      {downloadingId === m.id ? <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={11} />} Baixar
                    </button>
                    <button onClick={() => approveMilestone(m.id)} disabled={approvingId === m.id} style={btn('#22c55e')}>
                      {approvingId === m.id ? <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <ThumbsUp size={11} />} Aprovar etapa
                    </button>
                  </>
                )}
                {isCompany && m.status === 'in_progress' && (
                  <span style={{ fontSize: 11.5, color: 'rgba(185,190,200,0.45)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Clock size={12} /> Em andamento pelo freelancer
                  </span>
                )}

                {m.status === 'approved' && (
                  <span style={{ fontSize: 11.5, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <CheckCircle size={12} /> {isFreelancer ? `${formatCurrency(receives)} liberado no seu saldo` : 'Pagamento liberado'}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 20 }}>
        <Link href="/dashboard/messages" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#d4783a', textDecoration: 'none' }}>
          <MessageSquare size={13} /> Abrir chat do contrato
        </Link>
      </div>

      {deliverMs && (
        <MilestoneDeliveryModal
          milestone={deliverMs}
          jobId={job.id}
          supabase={supabase}
          onClose={() => setDeliverMs(null)}
          onSuccess={() => { setDeliverMs(null); load() }}
        />
      )}
    </div>
  )
}

function btn(color: string): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
    background: `${color}1f`, border: `1px solid ${color}66`, color,
    cursor: 'pointer', fontSize: '0.62rem', fontWeight: 700,
    letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'inherit', whiteSpace: 'nowrap',
  }
}

function MilestoneDeliveryModal({ milestone, jobId, supabase, onClose, onSuccess }: {
  milestone: any
  jobId: string
  supabase: any
  onClose: () => void
  onSuccess: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [note, setNote] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { toast.error('Selecione um arquivo para entregar.'); return }
    setUploading(true)

    const filePath = `${jobId}/milestone-${milestone.id}-${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage
      .from('deliveries')
      .upload(filePath, file, { upsert: true })
    if (uploadError) {
      toast.error('Erro ao enviar arquivo: ' + uploadError.message)
      setUploading(false)
      return
    }

    const res = await fetch(`/api/contracts/milestones/${milestone.id}/deliver`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deliveryUrl: filePath, deliveryNote: note.trim() || null }),
    })
    const json = await res.json()
    setUploading(false)
    if (!res.ok) { toast.error(json.error ?? 'Erro ao registrar entrega.'); return }
    toast.success('Etapa entregue! Aguardando aprovação da empresa.')
    onSuccess()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 6000,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto',
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ width: '100%', maxWidth: 480, background: '#0f1219', border: '1px solid rgba(34,197,94,0.25)', padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
          <div>
            <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#22c55e', margin: '0 0 4px' }}>
              Entregar etapa {milestone.position}
            </p>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>{milestone.title}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(185,190,200,0.5)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div onClick={() => fileRef.current?.click()} style={{
            border: `2px dashed ${file ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.1)'}`,
            background: file ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.02)',
            padding: '26px 20px', textAlign: 'center', cursor: 'pointer',
          }}>
            {file ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <FileText size={18} style={{ color: '#22c55e' }} />
                <span style={{ fontSize: 13, color: '#22c55e', fontWeight: 600 }}>{file.name}</span>
                <span style={{ fontSize: 11, color: 'rgba(185,190,200,0.4)' }}>({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
              </div>
            ) : (
              <>
                <Upload size={22} style={{ color: 'rgba(185,190,200,0.3)', margin: '0 auto 8px', display: 'block' }} />
                <p style={{ fontSize: 13, color: 'rgba(185,190,200,0.5)', margin: 0 }}>Clique para selecionar o arquivo</p>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] ?? null)} />

          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} maxLength={2000}
            placeholder="Observação (opcional): o que foi feito, instruções, links..."
            style={{
              width: '100%', boxSizing: 'border-box', padding: '12px 14px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
              color: '#fff', fontSize: 13, outline: 'none', resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit',
            }} />

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(185,190,200,0.6)', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'inherit',
            }}>Cancelar</button>
            <button type="submit" disabled={uploading || !file} style={{
              flex: 2, padding: '12px',
              background: uploading || !file ? 'rgba(34,197,94,0.3)' : '#22c55e',
              border: 'none', color: uploading || !file ? 'rgba(255,255,255,0.5)' : '#000',
              cursor: uploading || !file ? 'not-allowed' : 'pointer', fontSize: '0.65rem', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {uploading ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={13} />}
              {uploading ? 'Enviando...' : 'Entregar etapa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
