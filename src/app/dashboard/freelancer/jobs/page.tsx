'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Briefcase, ArrowRight, Upload, X, FileText, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { toast, Toaster } from 'sonner'

const statusMap: Record<string, { label: string; color: string }> = {
  open:        { label: 'Aberto',       color: '#3b82f6' },
  in_progress: { label: 'Em andamento', color: '#d94e18' },
  delivered:   { label: 'Entregue',     color: '#C18F6B' },
  completed:   { label: 'Concluído',    color: '#22c55e' },
  cancelled:   { label: 'Cancelado',    color: '#ef4444' },
}

export default function FreelancerJobsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [jobs, setJobs] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loaded, setLoaded] = useState(false)
  const [deliverJobId, setDeliverJobId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase
        .from('profiles').select('*').eq('user_id', user.id).single()
      if (!prof || prof.role !== 'freelancer') { router.push('/dashboard/company'); return }
      setProfile(prof)
      const { data } = await supabase
        .from('jobs')
        .select('*, profiles!jobs_company_id_fkey(name)')
        .eq('freelancer_id', prof.id)
        .order('created_at', { ascending: false })
      setJobs(data ?? [])
      setLoaded(true)
    }
    load()
  }, [])

  function refreshJobs() {
    if (!profile) return
    supabase
      .from('jobs')
      .select('*, profiles!jobs_company_id_fkey(name)')
      .eq('freelancer_id', profile.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setJobs(data ?? []))
  }

  if (!loaded) return null

  const deliverJob = jobs.find(j => j.id === deliverJobId)

  return (
    <div style={{ color: '#fff' }}>
      <Toaster position="top-right" richColors />

      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#d94e18', boxShadow: '0 0 6px rgba(217,78,24,0.9)' }} />
          <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#d94e18' }}>
            Meus trabalhos
          </span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: 900, letterSpacing: '-0.03em', margin: 0, color: '#fff' }}>
          Trabalhos aceitos
        </h1>
      </div>

      <div style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
        {jobs.length === 0 ? (
          <div style={{ padding: '64px 32px', textAlign: 'center' }}>
            <Briefcase size={40} style={{ color: 'rgba(185,190,200,0.15)', margin: '0 auto 16px', display: 'block' }} />
            <p style={{ fontSize: 14, color: 'rgba(185,190,200,0.5)', margin: '0 0 6px' }}>Nenhum trabalho aceito ainda.</p>
            <p style={{ fontSize: 12, color: 'rgba(185,190,200,0.3)', margin: 0 }}>
              Quando uma empresa publicar um trabalho compatível com suas tags, você receberá uma notificação.
            </p>
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
                    {job.profiles?.name} · {formatDate(job.created_at)}
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
                  {job.status === 'in_progress' && (
                    <>
                      <button
                        onClick={() => setDeliverJobId(job.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '7px 14px',
                          background: 'rgba(34,197,94,0.12)',
                          border: '1px solid rgba(34,197,94,0.35)',
                          color: '#22c55e', cursor: 'pointer',
                          fontSize: '0.62rem', fontWeight: 700,
                          letterSpacing: '0.08em', textTransform: 'uppercase',
                          fontFamily: 'inherit', transition: 'all 0.15s',
                          whiteSpace: 'nowrap',
                        }}
                        onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(34,197,94,0.2)' }}
                        onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(34,197,94,0.12)' }}>
                        <Upload size={11} /> Entregar
                      </button>
                      <Link href="/dashboard/messages" style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        fontSize: 12, color: '#d4783a', textDecoration: 'none',
                      }}>
                        Chat <ArrowRight size={11} />
                      </Link>
                    </>
                  )}
                  {job.status === 'delivered' && (
                    <span style={{ fontSize: 11, color: '#C18F6B', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle size={12} /> Aguardando pagamento
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal de entrega */}
      {deliverJobId && deliverJob && (
        <DeliveryModal
          job={deliverJob}
          profile={profile}
          supabase={supabase}
          onClose={() => setDeliverJobId(null)}
          onSuccess={() => { setDeliverJobId(null); refreshJobs(); }}
        />
      )}
    </div>
  )
}

function DeliveryModal({ job, profile, supabase, onClose, onSuccess }: {
  job: any
  profile: any
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

    // Upload para Supabase Storage
    const filePath = `${job.id}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage
      .from('deliveries')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      toast.error('Erro ao enviar arquivo: ' + uploadError.message)
      setUploading(false)
      return
    }

    // Atualiza o job para 'delivered' — salva o PATH (não URL pública) para bucket privado
    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        status: 'delivered',
        delivery_url: filePath,
        delivery_note: note.trim() || null,
        delivered_at: new Date().toISOString(),
      })
      .eq('id', job.id)

    if (updateError) {
      toast.error('Erro ao registrar entrega: ' + updateError.message)
      setUploading(false)
      return
    }

    toast.success('Trabalho entregue! Aguardando pagamento da empresa.')
    onSuccess()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        width: '100%', maxWidth: 520,
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
                Entrega de trabalho
              </span>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
              {job.title}
            </h2>
            <p style={{ fontSize: 12, color: 'rgba(185,190,200,0.4)', margin: '4px 0 0' }}>
              O arquivo ficará retido até o pagamento ser confirmado pela empresa.
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(185,190,200,0.4)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Upload */}
          <div>
            <label style={{ display: 'block', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(185,190,200,0.55)', marginBottom: 8 }}>
              Arquivo do trabalho
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${file ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.1)'}`,
                background: file ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.02)',
                padding: '28px 20px', textAlign: 'center', cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={e => { (e.currentTarget as HTMLDivElement).style.borderColor = file ? 'rgba(34,197,94,0.6)' : 'rgba(255,255,255,0.25)' }}
              onMouseOut={e => { (e.currentTarget as HTMLDivElement).style.borderColor = file ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.1)' }}>
              {file ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <FileText size={18} style={{ color: '#22c55e' }} />
                  <span style={{ fontSize: 13, color: '#22c55e', fontWeight: 600 }}>{file.name}</span>
                  <span style={{ fontSize: 11, color: 'rgba(185,190,200,0.4)' }}>({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
              ) : (
                <>
                  <Upload size={24} style={{ color: 'rgba(185,190,200,0.3)', margin: '0 auto 10px', display: 'block' }} />
                  <p style={{ fontSize: 13, color: 'rgba(185,190,200,0.5)', margin: 0 }}>Clique para selecionar o arquivo</p>
                  <p style={{ fontSize: 11, color: 'rgba(185,190,200,0.3)', margin: '4px 0 0' }}>PDF, ZIP, PNG, MP4, PSD, AI e outros</p>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] ?? null)} />
          </div>

          {/* Observação */}
          <div>
            <label style={{ display: 'block', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(185,190,200,0.55)', marginBottom: 8 }}>
              Observação (opcional)
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              placeholder="Descreva o que foi feito, instruções de uso, senhas, links extras..."
              style={{
                width: '100%', padding: '13px 16px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff', fontSize: 14, outline: 'none',
                resize: 'vertical', lineHeight: 1.6,
                fontFamily: 'inherit', boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => (e.target.style.borderColor = '#22c55e')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
          </div>

          {/* Aviso */}
          <div style={{
            padding: '12px 16px',
            background: 'rgba(193,143,107,0.08)',
            border: '1px solid rgba(193,143,107,0.2)',
            fontSize: 12, color: 'rgba(193,143,107,0.8)', lineHeight: 1.5,
          }}>
            🔒 O arquivo ficará bloqueado até a empresa confirmar o pagamento de <strong style={{ color: '#C18F6B' }}>{formatCurrency(job.value)}</strong>. Após o pagamento, o acesso é liberado automaticamente.
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '13px', background: 'transparent',
              border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(185,190,200,0.6)',
              cursor: 'pointer', fontSize: '0.65rem', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'inherit',
            }}>
              Cancelar
            </button>
            <button type="submit" disabled={uploading || !file} style={{
              flex: 2, padding: '13px',
              background: uploading || !file ? 'rgba(34,197,94,0.3)' : '#22c55e',
              border: 'none', color: uploading || !file ? 'rgba(255,255,255,0.5)' : '#000',
              cursor: uploading || !file ? 'not-allowed' : 'pointer',
              fontSize: '0.65rem', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s',
            }}>
              <Upload size={13} />
              {uploading ? 'Enviando...' : 'Entregar trabalho'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
