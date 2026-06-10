'use client'

import { useState } from 'react'
import { ShieldCheck, Loader, X } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  role: 'company' | 'freelancer'
  onDone: () => void   // chamado após salvar com sucesso (para retomar a ação)
  onClose: () => void
}

export function DocumentGateModal({ role, onDone, onClose }: Props) {
  // Empresa pode escolher CPF ou CNPJ; freelancer só CPF.
  const [type, setType] = useState<'cpf' | 'cnpj'>('cpf')
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  const isCompany = role === 'company'
  const maxLen = type === 'cnpj' ? 18 : 14

  function format(v: string) {
    const d = v.replace(/\D/g, '')
    if (type === 'cnpj') {
      return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2').slice(0, 18)
    }
    return d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2').slice(0, 14)
  }

  async function handleSave() {
    const digits = value.replace(/\D/g, '')
    if (type === 'cpf' && digits.length !== 11) { toast.error('CPF deve ter 11 dígitos.'); return }
    if (type === 'cnpj' && digits.length !== 14) { toast.error('CNPJ deve ter 14 dígitos.'); return }

    setSaving(true)
    const res = await fetch('/api/account/document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, document: digits }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error(json.error ?? 'Erro ao salvar documento.'); return }
    toast.success('Documento cadastrado!')
    onDone()
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 6000,
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ width: '100%', maxWidth: 440, background: '#0f1219', border: '1px solid rgba(217,78,24,0.25)', padding: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: -8 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(185,190,200,0.5)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(217,78,24,0.12)', border: '1px solid rgba(217,78,24,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShieldCheck size={18} style={{ color: '#d94e18' }} />
          </div>
          <div>
            <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#d94e18', margin: '0 0 2px' }}>Verificação</p>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>
              {isCompany ? 'Cadastre CPF ou CNPJ' : 'Cadastre seu CPF'}
            </h3>
          </div>
        </div>

        <p style={{ fontSize: 13, color: 'rgba(185,190,200,0.6)', lineHeight: 1.55, margin: '0 0 20px' }}>
          {isCompany
            ? 'Para publicar trabalhos, sua empresa precisa de um CPF ou CNPJ válido cadastrado. Usado só para verificação — fica privado.'
            : 'Para aceitar trabalhos, você precisa cadastrar um CPF válido. Usado só para verificação e para o saque — fica privado.'}
        </p>

        {/* Seletor CPF/CNPJ (só empresa) */}
        {isCompany && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {(['cpf', 'cnpj'] as const).map(t => (
              <button key={t} type="button"
                onClick={() => { setType(t); setValue('') }}
                style={{
                  flex: 1, padding: '9px', fontFamily: 'inherit', cursor: 'pointer',
                  fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                  background: type === t ? 'rgba(217,78,24,0.15)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${type === t ? '#d94e18' : 'rgba(255,255,255,0.1)'}`,
                  color: type === t ? '#fff' : 'rgba(185,190,200,0.6)',
                }}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        <input
          value={value}
          onChange={e => setValue(format(e.target.value))}
          inputMode="numeric"
          placeholder={type === 'cnpj' ? '00.000.000/0000-00' : '000.000.000-00'}
          maxLength={maxLen}
          style={{
            width: '100%', boxSizing: 'border-box', padding: '13px 16px', marginBottom: 20,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
            color: '#fff', fontSize: 15, outline: 'none', fontFamily: 'inherit', letterSpacing: '0.04em',
          }}
          onFocus={e => (e.target.style.borderColor = '#d94e18')}
          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
        />

        <button onClick={handleSave} disabled={saving} style={{
          width: '100%', padding: '13px', background: saving ? 'rgba(217,78,24,0.5)' : '#d94e18',
          border: 'none', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
          fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
          fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          {saving ? <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Salvando...</> : 'Cadastrar e continuar'}
        </button>
      </div>
    </div>
  )
}
