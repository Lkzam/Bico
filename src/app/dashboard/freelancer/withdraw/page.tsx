'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { Wallet, ArrowRight, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { Toaster } from 'sonner'

export default function WithdrawPage() {
  const supabase = createClient()
  const router = useRouter()

  const [profile, setProfile] = useState<any>(null)
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [amount, setAmount] = useState('')
  const [pixKey, setPixKey] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: prof } = await supabase
        .from('profiles').select('*').eq('user_id', user.id).single()
      if (!prof || prof.role !== 'freelancer') { router.push('/dashboard'); return }
      setProfile(prof)
      if (prof.pix_key) setPixKey(prof.pix_key)

      const { data: hist } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('freelancer_id', prof.id)
        .order('created_at', { ascending: false })
      setWithdrawals(hist ?? [])
    }
    load()
  }, [])

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return

    const value = parseFloat(amount.replace(',', '.'))
    if (isNaN(value) || value <= 0) { toast.error('Valor inválido.'); return }
    if (value > (profile.balance ?? 0)) { toast.error('Saldo insuficiente.'); return }
    if (!pixKey.trim()) { toast.error('Informe sua chave PIX.'); return }

    setLoading(true)

    const res = await fetch('/api/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: value, pixKey }),
    })
    const json = await res.json()

    if (!res.ok) {
      toast.error(json.error ?? 'Erro ao solicitar saque. Tente novamente.')
      setLoading(false)
      return
    }

    toast.success('PIX enviado com sucesso! O dinheiro já está a caminho.')
    setAmount('')
    setProfile((p: any) => ({ ...p, balance: (p.balance ?? 0) - value }))

    const { data: hist } = await supabase
      .from('withdrawals').select('*')
      .eq('freelancer_id', profile.id)
      .order('created_at', { ascending: false })
    setWithdrawals(hist ?? [])
    setLoading(false)
  }

  const statusMap: Record<string, { label: string; color: string }> = {
    pending:    { label: 'Pendente',    color: '#C18F6B' },
    processing: { label: 'Processando', color: '#3b82f6' },
    completed:  { label: 'Concluído',   color: '#22c55e' },
    failed:     { label: 'Falhou',      color: '#ef4444' },
  }

  const inputStyle = {
    width: '100%', padding: '14px 18px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff', fontSize: 14, outline: 'none',
    transition: 'border-color 0.2s', fontFamily: 'inherit',
  }

  const labelStyle = {
    display: 'block' as const,
    fontSize: '0.65rem', fontWeight: 700,
    letterSpacing: '0.14em', textTransform: 'uppercase' as const,
    color: 'rgba(185,190,200,0.6)', marginBottom: 10,
  }

  return (
    <div style={{ color: '#fff' }}>
      <Toaster position="top-right" richColors />

      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#d94e18', boxShadow: '0 0 6px rgba(217,78,24,0.9)' }} />
          <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#d94e18' }}>
            Saque
          </span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: 900, letterSpacing: '-0.03em', margin: 0 }}>
          Sacar via PIX
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' }}>

        {/* Formulário */}
        <div>
          {/* Saldo */}
          <div style={{
            padding: '24px', marginBottom: 24,
            background: 'rgba(217,78,24,0.08)',
            border: '1px solid rgba(217,78,24,0.25)',
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <Wallet size={24} style={{ color: '#d94e18', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(185,190,200,0.5)', margin: '0 0 4px' }}>
                Saldo disponível
              </p>
              <p style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: 0, fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}>
                {profile ? formatCurrency(profile.balance ?? 0) : '—'}
              </p>
            </div>
          </div>

          <div style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', padding: '28px' }}>
            <form onSubmit={handleWithdraw} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={labelStyle}>Valor do saque (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="0,00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  required
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = '#d94e18')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
                {profile && (
                  <button type="button" onClick={() => setAmount(String(profile.balance ?? 0))}
                    style={{ marginTop: 8, fontSize: 11, color: '#d4783a', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                    Sacar tudo ({formatCurrency(profile?.balance ?? 0)})
                  </button>
                )}
              </div>

              <div>
                <label style={labelStyle}>Chave PIX</label>
                <input
                  placeholder="CPF, email, telefone ou chave aleatória"
                  value={pixKey}
                  onChange={e => setPixKey(e.target.value)}
                  required
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = '#d94e18')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
                <p style={{ fontSize: 11, color: 'rgba(185,190,200,0.35)', margin: '8px 0 0' }}>
                  A integração com Efí Bank para pagamento automático está em configuração.
                </p>
              </div>

              <button type="submit" disabled={loading || !profile || (profile?.balance ?? 0) <= 0}
                style={{
                  padding: '15px 32px',
                  background: loading || (profile?.balance ?? 0) <= 0 ? 'rgba(217,78,24,0.3)' : '#d94e18',
                  color: '#fff', border: 'none',
                  cursor: loading || (profile?.balance ?? 0) <= 0 ? 'not-allowed' : 'pointer',
                  fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'background 0.2s', fontFamily: 'inherit',
                }}>
                {loading ? 'Solicitando...' : <><ArrowRight size={13} /> Solicitar saque</>}
              </button>
            </form>
          </div>
        </div>

        {/* Histórico */}
        <div>
          <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(185,190,200,0.5)', marginBottom: 16 }}>
            Histórico de saques
          </p>
          <div style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
            {withdrawals.length === 0 ? (
              <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                <Clock size={32} style={{ color: 'rgba(185,190,200,0.15)', margin: '0 auto 12px', display: 'block' }} />
                <p style={{ fontSize: 13, color: 'rgba(185,190,200,0.4)', margin: 0 }}>Nenhum saque realizado ainda.</p>
              </div>
            ) : (
              withdrawals.map((w, i) => {
                const s = statusMap[w.status] ?? { label: w.status, color: '#9ca3af' }
                return (
                  <div key={w.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderBottom: i < withdrawals.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: '0 0 3px' }}>
                        {formatCurrency(w.amount)}
                      </p>
                      <p style={{ fontSize: 11, color: 'rgba(185,190,200,0.4)', margin: 0 }}>
                        {w.pix_key} · {new Date(w.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <span style={{
                      fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                      padding: '4px 10px',
                      background: `${s.color}18`, border: `1px solid ${s.color}40`, color: s.color,
                    }}>
                      {s.label}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
