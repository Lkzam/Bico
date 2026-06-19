'use client'

import { useState } from 'react'
import { Send, Loader, X, Clock, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { calcFreelancerReceives } from '@/lib/fees'

interface Props {
  job: {
    id: string
    title: string
    value: number              // orçamento sugerido pela empresa
    deadline_hours: number | null
    profiles?: { name?: string } | null
  }
  onClose: () => void
  /** Chamado após enviar com sucesso. */
  onSent: () => void
  /** Se a API responder needsDocument, redireciona para abrir o gate de CPF. */
  onNeedsDocument?: () => void
}

export function ProposalModal({ job, onClose, onSent, onNeedsDocument }: Props) {
  const initialDays = job.deadline_hours && job.deadline_hours >= 24 && job.deadline_hours % 24 === 0
  const [unit, setUnit] = useState<'hours' | 'days'>(initialDays ? 'days' : 'hours')
  const [value, setValue] = useState<string>(String(job.value ?? ''))
  const [deadline, setDeadline] = useState<string>(
    job.deadline_hours
      ? String(initialDays ? job.deadline_hours / 24 : job.deadline_hours)
      : ''
  )
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const parsedValue = Number(value.replace(',', '.'))
  const validValue = Number.isFinite(parsedValue) && parsedValue > 0
  const receives = validValue ? calcFreelancerReceives(parsedValue) : 0

  async function handleSend() {
    if (!validValue) { toast.error('Informe um valor válido.'); return }
    setSending(true)
    const deadlineHours = deadline
      ? (unit === 'days' ? parseInt(deadline) * 24 : parseInt(deadline))
      : null

    const res = await fetch('/api/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: job.id,
        value: parsedValue,
        deadlineHours,
        message: message.trim() || null,
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
        width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto',
        background: '#0f1219', border: '1px solid rgba(167,139,250,0.25)', padding: 28,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
          <div>
            <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#a78bfa', margin: '0 0 4px' }}>
              Nova proposta
            </p>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>{job.title}</h2>
            {job.profiles?.name && (
              <p style={{ fontSize: 12, color: 'rgba(185,190,200,0.5)', margin: '4px 0 0' }}>{job.profiles.name}</p>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(185,190,200,0.5)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Sugestão */}
        <div style={{ padding: '10px 14px', marginBottom: 18, background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.18)' }}>
          <p style={{ fontSize: 12, color: 'rgba(185,190,200,0.7)', margin: 0, lineHeight: 1.5 }}>
            <strong style={{ color: '#a78bfa' }}>Sugerido pela empresa:</strong> {formatCurrency(job.value)}
            {job.deadline_hours ? ` · ${initialDays ? job.deadline_hours / 24 + 'd' : job.deadline_hours + 'h'} de prazo` : ''}.
            Você pode contra-propor.
          </p>
        </div>

        {/* Valor */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(185,190,200,0.55)', marginBottom: 8 }}>
            <DollarSign size={11} /> Seu valor (R$)
          </label>
          <input
            type="number" min="1" step="0.01"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="0,00"
            style={{
              width: '100%', boxSizing: 'border-box', padding: '12px 14px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
              color: '#fff', fontSize: 15, outline: 'none', fontFamily: 'inherit',
            }}
            onFocus={e => (e.target.style.borderColor = '#a78bfa')}
            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
          />
          {validValue && (
            <p style={{ fontSize: 11, color: 'rgba(34,197,94,0.75)', margin: '6px 2px 0' }}>
              Você recebe {formatCurrency(receives)} (após taxa de 7% no saque)
            </p>
          )}
        </div>

        {/* Prazo */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(185,190,200,0.55)', marginBottom: 8 }}>
            <Clock size={11} /> Prazo de entrega
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 0 }}>
            <input
              type="number" min="1"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              placeholder={unit === 'hours' ? '48' : '3'}
              style={{
                boxSizing: 'border-box', padding: '12px 14px',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRight: 'none',
                color: '#fff', fontSize: 14, outline: 'none', fontFamily: 'inherit',
              }}
              onFocus={e => (e.target.style.borderColor = '#a78bfa')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
            />
            <div style={{ display: 'flex', border: '1px solid rgba(255,255,255,0.12)' }}>
              {(['hours', 'days'] as const).map(u => (
                <button
                  key={u} type="button" onClick={() => setUnit(u)}
                  style={{
                    padding: '0 12px',
                    background: unit === u ? 'rgba(167,139,250,0.18)' : 'rgba(255,255,255,0.03)',
                    border: 'none', borderLeft: u === 'days' ? '1px solid rgba(255,255,255,0.12)' : 'none',
                    color: unit === u ? '#a78bfa' : 'rgba(185,190,200,0.45)',
                    fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.06em',
                  }}>
                  {u === 'hours' ? 'h' : 'd'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mensagem */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(185,190,200,0.55)', marginBottom: 8 }}>
            Mensagem (opcional)
          </label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Conte por que você é o ideal pra esse trabalho..."
            rows={4} maxLength={2000}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '12px 14px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
              color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'inherit',
              resize: 'vertical', lineHeight: 1.5,
            }}
            onFocus={e => (e.target.style.borderColor = '#a78bfa')}
            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
          />
        </div>

        <button
          onClick={handleSend} disabled={sending || !validValue}
          style={{
            width: '100%', padding: '13px',
            background: sending || !validValue ? 'rgba(167,139,250,0.25)' : '#a78bfa',
            border: 'none', color: sending || !validValue ? 'rgba(255,255,255,0.5)' : '#0f1219',
            cursor: sending || !validValue ? 'not-allowed' : 'pointer',
            fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
            fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
          {sending ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={13} />}
          {sending ? 'Enviando...' : 'Enviar proposta'}
        </button>
      </div>
    </div>
  )
}
