'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Loader, User } from 'lucide-react'
import { toast } from 'sonner'
import { ProfilePreviewModal } from '@/components/ProfilePreviewModal'
import { formatCurrency } from '@/lib/utils'
import { calcCompanyTotal } from '@/lib/fees'

interface Props {
  proposalId: string
  freelancerName: string
  freelancerId?: string
  /** Total da proposta (soma das etapas), sem a taxa da plataforma. */
  value: number
}

export function AcceptContractProposalButton({ proposalId, freelancerName, freelancerId, value }: Props) {
  const router = useRouter()
  const [accepting, setAccepting] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  const total = calcCompanyTotal(value)

  async function handleAccept() {
    if (!confirm(
      `Escolher ${freelancerName} para este contrato?\n\n` +
      `As outras propostas serão recusadas. Em seguida você paga o total ` +
      `de ${formatCurrency(total)} (com taxa) via PIX, que fica retido em escrow ` +
      `e é liberado etapa por etapa.`
    )) return

    setAccepting(true)
    const res = await fetch(`/api/proposals/${proposalId}/accept-contract`, { method: 'POST' })
    const json = await res.json()
    setAccepting(false)
    if (!res.ok) {
      toast.error(json.error ?? 'Erro ao escolher proposta.')
      return
    }
    toast.success('Proposta aceita! Agora realize o pagamento do contrato.')
    router.push('/dashboard/company/jobs')
  }

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {freelancerId && (
        <button
          type="button"
          onClick={() => setShowProfile(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 16px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(185,190,200,0.75)', cursor: 'pointer',
            fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
            fontFamily: 'inherit',
          }}>
          <User size={11} /> Ver perfil
        </button>
      )}

      <button
        type="button"
        onClick={handleAccept}
        disabled={accepting}
        style={{
          flex: 1, minWidth: 220,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '10px 16px',
          background: accepting ? 'rgba(167,139,250,0.3)' : '#a78bfa',
          border: 'none', color: '#0f1219',
          cursor: accepting ? 'not-allowed' : 'pointer',
          fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
          fontFamily: 'inherit',
        }}>
        {accepting ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={12} />}
        {accepting ? 'Escolhendo...' : 'Escolher e ir para o pagamento'}
      </button>

      {showProfile && freelancerId && (
        <ProfilePreviewModal profileId={freelancerId} onClose={() => setShowProfile(false)} />
      )}
    </div>
  )
}
