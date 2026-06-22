'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, Loader, X, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { calcFreelancerReceives } from '@/lib/fees'

interface Props {
  job: { id: string; title: string; value: number; profiles?: { name?: string } | null }
  onClose: () => void
  onSent: () => void
  onNeedsDocument?: () => void
}

type MS = { title: string; description: string; value: string; deadline_hours: string }

export function ContractProposalModal({ job, onClose, onSent, onNeedsDocument }: Props) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [milestones, setMilestones] = useState<MS[]>([])
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [edited, setEdited] = useState(false)  // freelancer alterou o plano original?

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('contract_milestones')
        .select('position, title, description, value, deadline_hours')
        .eq('job_id', job.id)
        .order('position', { ascending: true })
      setMilestones((data ?? []).map((m: any) => ({
        title:          m.title ?? '',
        description:    m.description ?? '',
        value:          String(m.value ?? ''),
        deadline_hours: m.deadline_hours ? String(m.deadline_hours) : '',
      })))
      setLoading(false)
    }
    load()
  }, [job.id])

  const total = milestones.reduce((s, m) => s + (parseFloat(m.value) || 0), 0)
  const receives = calcFreelancerReceives(total)

  function update(idx: number, patch: Partial<MS>) {
    setMilestones(arr => arr.map((m, i) => i === idx ? { ...m, ...patch } : m))
    setEdited(true)
  }

  async function handleSend() {
    const cleaned = milestones.filter(m => m.title.trim() && parseFloat(m.value) > 0)
    if (cleaned.length === 0) { toast.error('Inclua ao menos uma etapa válida.'); return }

    setSending(true)
    const res = await fetch('/api/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: job.id,
        message: message.trim() || null,
        proposedMilestones: cleaned.map(m => ({
          title:          m.title.trim(),
          description:    m.description.trim() || null,
          value:          parseFloat(m.value),
          deadline_hours: m.deadline_hours ? parseInt(m.deadline_hours) : null,
        })),
      }),
    })
    const json = await res.json()
    setSending(false)
    if (!res.ok) {
      if (json.needsDocument && onNeedsDocument) { onNeedsDocument(); return }
      toast.error(json.error ?? 'Erro ao enviar proposta.')
      return
    }
    toast.success('Proposta enviada!')
    onSent()
  }

  const inputStyle = {
    width: '100%', boxSizing: 'border-box' as const, padding: '10px 12px',
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'inherit',
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 6000,
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        overflowY: 'auto',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto',
        background: '#0f1219', border: '1px solid rgba(167,139,250,0.25)', padding: 28,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#a78bfa', margin: '0 0 4px' }}>
              Proposta de contrato
            </p>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>{job.title}</h2>
            {job.profiles?.name && <p style={{ fontSize: 12, color: 'rgba(185,190,200,0.5)', margin: '4px 0 0' }}>{job.profiles.name}</p>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(185,190,200,0.5)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'rgba(185,190,200,0.5)' }}>
            <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          <>
            <p style={{ fontSize: 12, color: 'rgba(185,190,200,0.6)', margin: '0 0 14px', lineHeight: 1.5 }}>
              Plano de etapas sugerido pela empresa. Você pode <strong style={{ color: '#a78bfa' }}>ajustar valores, prazos ou descrições</strong> antes de enviar.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
              {milestones.map((m, idx) => (
                <div key={idx} style={{ border: '1px solid rgba(167,139,250,0.2)', background: 'rgba(167,139,250,0.04)', padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#a78bfa' }}>Etapa {idx + 1}</span>
                    {milestones.length > 1 && (
                      <button type="button" onClick={() => { setMilestones(a => a.filter((_, i) => i !== idx)); setEdited(true) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(239,68,68,0.7)', fontSize: 11, padding: 4, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <X size={11} /> Remover
                      </button>
                    )}
                  </div>
                  <input value={m.title} onChange={e => update(idx, { title: e.target.value })}
                    placeholder="Título da etapa" style={{ ...inputStyle, marginBottom: 8 }}
                    onFocus={e => (e.target.style.borderColor = '#a78bfa')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')} />
                  <textarea value={m.description} onChange={e => update(idx, { description: e.target.value })}
                    placeholder="Descrição (opcional)" rows={2} style={{ ...inputStyle, marginBottom: 8, resize: 'vertical', lineHeight: 1.5 }}
                    onFocus={e => (e.target.style.borderColor = '#a78bfa')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <input type="number" min="1" step="0.01" value={m.value} onChange={e => update(idx, { value: e.target.value })}
                      placeholder="Valor R$" style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = '#a78bfa')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')} />
                    <input type="number" min="1" value={m.deadline_hours} onChange={e => update(idx, { deadline_hours: e.target.value })}
                      placeholder="Prazo (horas)" style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = '#a78bfa')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')} />
                  </div>
                </div>
              ))}
            </div>

            <button type="button" onClick={() => { setMilestones(a => [...a, { title: '', description: '', value: '', deadline_hours: '' }]); setEdited(true) }}
              style={{ width: '100%', padding: '9px', marginBottom: 14, background: 'transparent', border: '1px dashed rgba(167,139,250,0.4)', color: '#a78bfa', cursor: 'pointer', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Plus size={11} /> Adicionar etapa
            </button>

            {/* Total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', marginBottom: 14, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <div>
                <p style={{ fontSize: 11, color: 'rgba(185,190,200,0.6)', margin: 0 }}>Total da sua proposta</p>
                <p style={{ fontSize: 10.5, color: 'rgba(34,197,94,0.8)', margin: '2px 0 0' }}>Você recebe {formatCurrency(receives)} (após taxa 7%)</p>
              </div>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#22c55e', fontFamily: 'var(--font-heading)' }}>{formatCurrency(total)}</span>
            </div>

            {edited && Math.abs(total - job.value) >= 0.01 && (
              <p style={{ fontSize: 11, color: '#f59e0b', margin: '0 0 14px' }}>
                Sugerido pela empresa: {formatCurrency(job.value)} · sua proposta: {formatCurrency(total)}
              </p>
            )}

            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} maxLength={2000}
              placeholder="Mensagem para a empresa (opcional)"
              style={{ ...inputStyle, marginBottom: 16, resize: 'vertical', lineHeight: 1.5 }}
              onFocus={e => (e.target.style.borderColor = '#a78bfa')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')} />

            <button onClick={handleSend} disabled={sending || total <= 0}
              style={{ width: '100%', padding: '13px', background: sending || total <= 0 ? 'rgba(167,139,250,0.25)' : '#a78bfa', border: 'none', color: sending || total <= 0 ? 'rgba(255,255,255,0.5)' : '#0f1219', cursor: sending || total <= 0 ? 'not-allowed' : 'pointer', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {sending ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={13} />}
              {sending ? 'Enviando...' : (edited ? 'Enviar proposta ajustada' : 'Aceitar plano e enviar')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
