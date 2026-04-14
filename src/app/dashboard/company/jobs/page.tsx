'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Briefcase, ArrowRight, Plus, X, CreditCard, FileText, FileImage, FileArchive, FileCode, File, Lock, Copy, CheckCircle, Loader } from 'lucide-react'
import { calcCompanyTotal, calcFreelancerReceives, PLATFORM_FEE_COMPANY, PLATFORM_FEE_FREELANCER } from '@/lib/fees'
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
  const [step, setStep] = useState<'summary' | 'pix' | 'waiting'>('summary')
  const [pix, setPix] = useState<{ qrcode: string; imagemQrcode: string; valor: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const totalValue = calcCompanyTotal(job.value)
  const freelancerReceives = calcFreelancerReceives(job.value)
  const platformFeeCompany = totalValue - job.value
  const platformFeeFreelancer = job.value - freelancerReceives

  // Extrai nome e extensão do arquivo
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
    // Começa a verificar se pagou
    startPolling(json.txid ?? job.id.replace(/-/g, '').substring(0, 35))
  }

  function startPolling(txid: string) {
    setStep('waiting')
    const interval = setInterval(async () => {
      const res = await fetch(`/api/payments/status?txid=${txid}`)
      const json = await res.json()
      if (json.status === 'paid') {
        clearInterval(interval)
        toast.success('Pagamento confirmado! Arquivo liberado para download.')
        onSuccess()
      }
    }, 4000)
    // Para de checar após 1h
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
        {/* Header */}
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

        {/* STEP 1: Resumo */}
        {step === 'summary' && (<>
          {/* Arquivo entregue */}
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

          {/* Resumo financeiro — empresa */}
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

          {/* Resumo financeiro — freelancer */}
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
              <span style={{ fontSize: 13, fontWeight: 700, color: '#C18F6B' }}>Freelancer recebe</span>
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

        {/* STEP 2 / 3: QR Code + aguardando */}
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

            {/* Copia e cola */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              padding: '10px 14px', marginBottom: 20,
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

            {/* Status aguardando */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px 16px',
              background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)',
            }}>
              <Loader size={13} style={{ color: '#22c55e', animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 12, color: '#22c55e' }}>Aguardando confirmação do pagamento...</span>
            </div>

            <p style={{ fontSize: 11, color: 'rgba(185,190,200,0.35)', marginTop: 12 }}>
              Após o pagamento, o arquivo será liberado automaticamente.
            </p>
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
