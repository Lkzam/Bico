'use client'

import { useState } from 'react'
import { Star, Loader, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

interface ReviewModalProps {
  jobArchiveId: string
  jobTitle:     string
  reviewedName: string   // nome de quem está sendo avaliado
  reviewerRole: 'company' | 'freelancer'
  onDone: () => void     // chamado após submit com sucesso — NÃO tem onClose
}

const STAR_LABELS = ['', 'Muito ruim', 'Ruim', 'Regular', 'Bom', 'Excelente']

const roleLabels = {
  company:    { title: 'Avalie o freelancer',  subtitle: 'Como foi trabalhar com este profissional?' },
  freelancer: { title: 'Avalie a empresa',     subtitle: 'Como foi a experiência neste projeto?' },
}

export function ReviewModal({ jobArchiveId, jobTitle, reviewedName, reviewerRole, onDone }: ReviewModalProps) {
  const [hovered,   setHovered]   = useState(0)
  const [selected,  setSelected]  = useState(0)
  const [comment,   setComment]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done,       setDone]      = useState(false)

  const { title, subtitle } = roleLabels[reviewerRole]
  const displayStar = hovered || selected

  async function handleSubmit() {
    if (!selected) return
    setSubmitting(true)

    const res = await fetch('/api/reviews/submit', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ jobArchiveId, rating: selected, comment }),
    })
    const json = await res.json()
    setSubmitting(false)

    if (!res.ok) {
      toast.error(json.error ?? 'Erro ao enviar avaliação.')
      return
    }

    setDone(true)
    setTimeout(() => onDone(), 1800)
  }

  return (
    <div style={{
      position:      'fixed',
      inset:         0,
      zIndex:        2000,
      background:    'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(6px)',
      display:       'flex',
      alignItems:    'center',
      justifyContent: 'center',
      padding:       24,
      // SEM onClick no overlay — modal não pode ser fechado
    }}>
      <div style={{
        width:      '100%',
        maxWidth:   460,
        background: '#0f1219',
        border:     '1px solid rgba(255,255,255,0.1)',
        padding:    40,
        textAlign:  'center',
      }}>

        {/* Tela de sucesso */}
        {done ? (
          <div style={{ padding: '16px 0' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
              background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CheckCircle size={28} style={{ color: '#22c55e' }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
              Avaliação enviada!
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(185,190,200,0.5)', margin: 0 }}>
              Obrigado pelo seu feedback.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#d94e18', boxShadow: '0 0 6px rgba(217,78,24,0.9)' }} />
                <span style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#d94e18' }}>
                  Avaliação obrigatória
                </span>
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.03em' }}>
                {title}
              </h2>
              <p style={{ fontSize: 13, color: 'rgba(185,190,200,0.5)', margin: '0 0 4px' }}>
                {subtitle}
              </p>
              <p style={{ fontSize: 12, color: 'rgba(185,190,200,0.35)', margin: 0 }}>
                Trabalho: <strong style={{ color: 'rgba(185,190,200,0.6)' }}>{jobTitle}</strong>
              </p>
            </div>

            {/* Nome de quem é avaliado */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '10px 18px', marginBottom: 28,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(217,78,24,0.15)', border: '1px solid rgba(217,78,24,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: '#d94e18', flexShrink: 0,
              }}>
                {reviewedName.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{reviewedName}</span>
            </div>

            {/* Estrelas */}
            <div style={{ marginBottom: 12 }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                marginBottom: 10,
              }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onMouseEnter={() => setHovered(n)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => setSelected(n)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: 4, transition: 'transform 0.1s',
                      transform: hovered >= n || selected >= n ? 'scale(1.15)' : 'scale(1)',
                    }}
                  >
                    <Star
                      size={36}
                      fill={displayStar >= n ? '#f59e0b' : 'none'}
                      stroke={displayStar >= n ? '#f59e0b' : 'rgba(185,190,200,0.25)'}
                      style={{ transition: 'all 0.12s' }}
                    />
                  </button>
                ))}
              </div>
              <p style={{
                fontSize: 12, fontWeight: 600, margin: 0,
                color: displayStar ? '#f59e0b' : 'rgba(185,190,200,0.3)',
                minHeight: 18, transition: 'color 0.15s',
              }}>
                {displayStar ? STAR_LABELS[displayStar] : 'Selecione uma nota'}
              </p>
            </div>

            {/* Comentário opcional */}
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Deixe um comentário (opcional)..."
              rows={3}
              maxLength={500}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '12px 14px', marginBottom: 24,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff', fontSize: 13, lineHeight: 1.5,
                fontFamily: 'inherit', resize: 'none',
                outline: 'none',
              }}
            />

            {/* Aviso de obrigatoriedade */}
            {!selected && (
              <p style={{ fontSize: 11, color: 'rgba(239,68,68,0.6)', margin: '-12px 0 16px' }}>
                ⚠ Selecione uma nota para continuar
              </p>
            )}

            {/* Botão */}
            <button
              onClick={handleSubmit}
              disabled={!selected || submitting}
              style={{
                width: '100%', padding: '14px',
                background: !selected ? 'rgba(217,78,24,0.2)' : submitting ? 'rgba(217,78,24,0.5)' : '#d94e18',
                border: 'none',
                color: !selected ? 'rgba(255,255,255,0.25)' : '#fff',
                cursor: !selected || submitting ? 'not-allowed' : 'pointer',
                fontSize: '0.68rem', fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.2s',
              }}
            >
              {submitting
                ? <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Enviando...</>
                : <>Enviar avaliação {selected ? `— ${STAR_LABELS[selected]}` : ''}</>
              }
            </button>

            <p style={{ fontSize: 10, color: 'rgba(185,190,200,0.25)', margin: '14px 0 0', letterSpacing: '0.05em' }}>
              Esta janela será fechada automaticamente após avaliar
            </p>
          </>
        )}
      </div>
    </div>
  )
}
