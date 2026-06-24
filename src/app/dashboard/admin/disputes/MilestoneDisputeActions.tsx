'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ThumbsUp, Undo2, Download, Loader } from 'lucide-react'
import { toast } from 'sonner'

export function MilestoneDisputeActions({ milestoneId, hasDelivery }: { milestoneId: string; hasDelivery: boolean }) {
  const router = useRouter()
  const [note, setNote] = useState('')
  const [acting, setActing] = useState<'release' | 'refund' | null>(null)
  const [downloading, setDownloading] = useState(false)

  async function resolve(action: 'release' | 'refund') {
    const label = action === 'release' ? 'liberar para o freelancer' : 'reembolsar a empresa'
    if (!confirm(`Confirma ${label} esta etapa?`)) return

    setActing(action)
    const res = await fetch(`/api/admin/disputes/milestones/${milestoneId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, note: note.trim() || undefined }),
    })
    const json = await res.json()
    setActing(null)
    if (!res.ok) { toast.error(json.error ?? 'Erro ao resolver disputa.'); return }
    toast.success(action === 'release' ? 'Etapa liberada.' : 'Reembolso aprovado.')
    router.refresh()
  }

  async function downloadDelivery() {
    setDownloading(true)
    const res = await fetch(`/api/contracts/milestones/${milestoneId}/delivery-url`)
    const json = await res.json()
    setDownloading(false)
    if (!res.ok) { toast.error(json.error ?? 'Erro ao gerar link.'); return }
    window.open(json.url, '_blank')
  }

  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(185,190,200,0.45)', marginBottom: 6 }}>
        Nota da decisão (opcional)
      </label>
      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        rows={2}
        placeholder="Justificativa interna — vai pro log de auditoria"
        style={{
          width: '100%', boxSizing: 'border-box', padding: '10px 12px', marginBottom: 14,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
          color: '#fff', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit', resize: 'vertical', outline: 'none',
        }}
      />

      <div className="dash-btn-group" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {hasDelivery && (
          <button type="button" onClick={downloadDelivery} disabled={downloading} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px',
            background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.35)',
            color: '#a78bfa', cursor: downloading ? 'not-allowed' : 'pointer',
            fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'inherit',
          }}>
            {downloading ? <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={11} />}
            Baixar entrega
          </button>
        )}

        <button type="button" onClick={() => resolve('release')} disabled={acting !== null} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
          background: acting ? 'rgba(34,197,94,0.25)' : 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.45)',
          color: '#22c55e', cursor: acting ? 'not-allowed' : 'pointer',
          fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'inherit',
        }}>
          {acting === 'release' ? <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <ThumbsUp size={11} />}
          Liberar para freelancer
        </button>

        <button type="button" onClick={() => resolve('refund')} disabled={acting !== null} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
          background: acting ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)',
          color: '#ef4444', cursor: acting ? 'not-allowed' : 'pointer',
          fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'inherit',
        }}>
          {acting === 'refund' ? <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Undo2 size={11} />}
          Reembolsar empresa
        </button>
      </div>

      <p style={{ fontSize: 10, color: 'rgba(185,190,200,0.3)', marginTop: 12, margin: 0 }}>
        ⚠️ "Reembolsar empresa" estorna o valor da etapa + 10% (o que a empresa pagou nela). A devolução do PIX é processada manualmente no painel da Efí.
      </p>
    </div>
  )
}
