'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast, Toaster } from 'sonner'
import { User, Tag, Save, Check, Lightbulb, Send, ShieldCheck, Loader } from 'lucide-react'

function maskDoc(type: 'cpf' | 'cnpj', v: string) {
  const d = v.replace(/\D/g, '')
  if (type === 'cnpj') {
    return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2').slice(0, 18)
  }
  return d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2').slice(0, 14)
}

function DocumentField({ type, current, onSaved }: { type: 'cpf' | 'cnpj'; current: string | null; onSaved: (v: string) => void }) {
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const label = type.toUpperCase()
  const len = type === 'cnpj' ? 14 : 11

  async function save() {
    const digits = value.replace(/\D/g, '')
    if (digits.length !== len) { toast.error(`${label} deve ter ${len} dígitos.`); return }
    setSaving(true)
    const res = await fetch('/api/account/document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, document: digits }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error(json.error ?? 'Erro ao salvar.'); return }
    toast.success(`${label} salvo!`)
    onSaved(digits)
    setValue('')
  }

  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(185,190,200,0.55)', marginBottom: 8 }}>
        {label}
        {current && (
          <span style={{ marginLeft: 8, color: '#22c55e', textTransform: 'none', letterSpacing: 0, fontWeight: 600 }}>
            <Check size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> {maskDoc(type, current)}
          </span>
        )}
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={value}
          onChange={e => setValue(maskDoc(type, e.target.value))}
          inputMode="numeric"
          placeholder={current ? `Atualizar ${label}...` : (type === 'cnpj' ? '00.000.000/0000-00' : '000.000.000-00')}
          style={{
            flex: 1, boxSizing: 'border-box', padding: '13px 16px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff', fontSize: 14, outline: 'none', fontFamily: 'inherit',
          }}
          onFocus={e => (e.target.style.borderColor = '#d94e18')}
          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
        />
        <button type="button" onClick={save} disabled={saving || !value} style={{
          padding: '0 18px', flexShrink: 0,
          background: saving || !value ? 'rgba(217,78,24,0.3)' : '#d94e18',
          border: 'none', color: '#fff', cursor: saving || !value ? 'not-allowed' : 'pointer',
          fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
          fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {saving ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> : 'Salvar'}
        </button>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const supabase = createClient()
  const router = useRouter()

  const [profile, setProfile] = useState<any>(null)
  const [allTags, setAllTags] = useState<any[]>([])
  const [userTagIds, setUserTagIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  // Form fields
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [website, setWebsite] = useState('')
  const [cpf, setCpf] = useState<string | null>(null)
  const [cnpj, setCnpj] = useState<string | null>(null)

  // Tag suggestion
  const [suggestionText, setSuggestionText] = useState('')
  const [sendingSuggestion, setSendingSuggestion] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: prof } = await supabase
        .from('profiles').select('*').eq('user_id', user.id).single()
      if (!prof) { router.push('/login'); return }

      setProfile(prof)
      setName(prof.name ?? '')
      setBio(prof.bio ?? '')
      setPortfolioUrl(prof.portfolio_url ?? '')
      setWebsite(prof.website ?? '')

      const { data: tags } = await supabase
        .from('tags').select('*').order('name')
      setAllTags(tags ?? [])

      const { data: ut } = await supabase
        .from('user_tags').select('tag_id').eq('profile_id', prof.id)
      setUserTagIds(new Set((ut ?? []).map((r: any) => r.tag_id)))

      // Documento (CPF/CNPJ) vive em account_private (RLS owner-only)
      const { data: priv } = await supabase
        .from('account_private').select('cpf, cnpj').eq('profile_id', prof.id).single()
      setCpf(priv?.cpf ?? null)
      setCnpj(priv?.cnpj ?? null)
    }
    load()
  }, [])

  function toggleTag(tagId: string) {
    setUserTagIds(prev => {
      const next = new Set(prev)
      next.has(tagId) ? next.delete(tagId) : next.add(tagId)
      return next
    })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSaving(true)

    const updates: any = { name: name.trim(), bio: bio.trim() }
    if (profile.role === 'freelancer') {
      updates.portfolio_url = portfolioUrl.trim()
    } else {
      updates.website = website.trim()
    }

    const { error: profileError } = await supabase
      .from('profiles').update(updates).eq('id', profile.id)

    if (profileError) {
      toast.error('Erro ao salvar perfil.')
      setSaving(false)
      return
    }

    await supabase.from('user_tags').delete().eq('profile_id', profile.id)

    if (userTagIds.size > 0) {
      const rows = Array.from(userTagIds).map(tag_id => ({ profile_id: profile.id, tag_id }))
      const { error: tagError } = await supabase.from('user_tags').insert(rows)
      if (tagError) {
        toast.error('Erro ao salvar tags.')
        setSaving(false)
        return
      }
    }

    setProfile((p: any) => ({ ...p, ...updates }))
    toast.success('Perfil atualizado com sucesso!')
    setSaving(false)
  }

  async function handleSendSuggestion() {
    const trimmed = suggestionText.trim()
    if (!trimmed) return
    if (trimmed.length < 2) { toast.error('Digite um nome de tag válido.'); return }
    if (!profile) return

    setSendingSuggestion(true)
    const { error } = await supabase.from('tag_suggestions').insert({
      profile_id: profile.id,
      tag_name: trimmed,
    })

    if (error) {
      toast.error('Erro ao enviar sugestão. Tente novamente.')
    } else {
      toast.success('Sugestão enviada! Vamos analisar e adicionar em breve.')
      setSuggestionText('')
    }
    setSendingSuggestion(false)
  }

  const inputStyle = {
    width: '100%', padding: '13px 16px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff', fontSize: 14, outline: 'none',
    transition: 'border-color 0.2s', fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  }

  const labelStyle = {
    display: 'block' as const,
    fontSize: '0.62rem', fontWeight: 700,
    letterSpacing: '0.14em', textTransform: 'uppercase' as const,
    color: 'rgba(185,190,200,0.55)', marginBottom: 8,
  }

  if (!profile) return null

  return (
    <div style={{ color: '#fff' }}>
      <Toaster position="top-right" richColors />

      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#d94e18', boxShadow: '0 0 6px rgba(217,78,24,0.9)' }} />
          <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#d94e18' }}>
            Configurações
          </span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: 900, letterSpacing: '-0.03em', margin: 0 }}>
          Meu perfil
        </h1>
      </div>

      <form onSubmit={handleSave}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' }}>

          {/* Left: Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', padding: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                <User size={14} style={{ color: 'rgba(185,190,200,0.5)' }} />
                <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(185,190,200,0.5)' }}>
                  Informações pessoais
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={labelStyle}>Nome completo</label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#d94e18')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Bio / Sobre mim</label>
                  <textarea
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    rows={4}
                    placeholder={profile.role === 'freelancer'
                      ? 'Fale sobre sua experiência, projetos realizados...'
                      : 'Fale sobre sua empresa, segmento, projetos...'}
                    style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                    onFocus={e => (e.target.style.borderColor = '#d94e18')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                  />
                </div>

                {profile.role === 'freelancer' && (
                  <div>
                    <label style={labelStyle}>URL do portfólio</label>
                    <input
                      value={portfolioUrl}
                      onChange={e => setPortfolioUrl(e.target.value)}
                      placeholder="https://meuportfolio.com"
                      style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = '#d94e18')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                    />
                  </div>
                )}

                {profile.role === 'company' && (
                  <div>
                    <label style={labelStyle}>Website da empresa</label>
                    <input
                      value={website}
                      onChange={e => setWebsite(e.target.value)}
                      placeholder="https://minhaempresa.com.br"
                      style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = '#d94e18')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Documento (CPF/CNPJ) */}
            <div style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', padding: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <ShieldCheck size={14} style={{ color: 'rgba(185,190,200,0.5)' }} />
                <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(185,190,200,0.5)' }}>
                  Documento
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'rgba(185,190,200,0.4)', margin: '0 0 20px', lineHeight: 1.5 }}>
                {profile.role === 'company'
                  ? 'CPF ou CNPJ é obrigatório para publicar trabalhos. Fica privado.'
                  : 'CPF é obrigatório para aceitar trabalhos e sacar. Fica privado.'}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <DocumentField type="cpf" current={cpf} onSaved={setCpf} />
                {profile.role === 'company' && (
                  <DocumentField type="cnpj" current={cnpj} onSaved={setCnpj} />
                )}
              </div>
            </div>
          </div>

          {/* Right: Tags */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', padding: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Tag size={14} style={{ color: 'rgba(185,190,200,0.5)' }} />
                <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(185,190,200,0.5)' }}>
                  {profile.role === 'freelancer' ? 'Minhas habilidades' : 'Áreas de interesse'}
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'rgba(185,190,200,0.35)', margin: '0 0 20px' }}>
                {profile.role === 'freelancer'
                  ? 'Selecione as habilidades que você oferece. Você será notificado quando empresas publicarem trabalhos compatíveis.'
                  : 'Selecione as áreas em que sua empresa costuma contratar.'}
              </p>

              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 8,
                maxHeight: 280, overflowY: 'auto',
                paddingRight: 4,
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(217,78,24,0.4) rgba(255,255,255,0.04)',
              }}>
                {allTags.map(tag => {
                  const active = userTagIds.has(tag.id)
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '7px 14px',
                        background: active ? 'rgba(217,78,24,0.18)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${active ? '#d94e18' : 'rgba(255,255,255,0.1)'}`,
                        color: active ? '#d94e18' : 'rgba(185,190,200,0.6)',
                        fontSize: 12, fontWeight: active ? 600 : 400,
                        cursor: 'pointer', fontFamily: 'inherit',
                        transition: 'all 0.15s',
                      }}>
                      {active && <Check size={11} />}
                      {tag.name}
                    </button>
                  )
                })}
              </div>

              {userTagIds.size > 0 && (
                <p style={{ fontSize: 11, color: 'rgba(185,190,200,0.35)', marginTop: 16, marginBottom: 0 }}>
                  {userTagIds.size} {userTagIds.size === 1 ? 'habilidade selecionada' : 'habilidades selecionadas'}
                </p>
              )}

              {/* Botão de sugestão de tag */}
              <div style={{
                marginTop: 24,
                paddingTop: 20,
                borderTop: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Lightbulb size={13} style={{ color: '#d4783a' }} />
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#d4783a' }}>
                    Não achou sua área?
                  </span>
                </div>
                <p style={{ fontSize: 12, color: 'rgba(185,190,200,0.4)', margin: '0 0 12px', lineHeight: 1.5 }}>
                  Sugira uma tag e analisaremos para adicionar ao app.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={suggestionText}
                    onChange={e => setSuggestionText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSendSuggestion() } }}
                    placeholder="Ex: Culinária, Astrologia..."
                    maxLength={60}
                    style={{
                      flex: 1, padding: '9px 14px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff', fontSize: 13, outline: 'none',
                      fontFamily: 'inherit', transition: 'border-color 0.2s',
                    }}
                    onFocus={e => (e.target.style.borderColor = '#d4783a')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                  />
                  <button
                    type="button"
                    onClick={handleSendSuggestion}
                    disabled={sendingSuggestion || !suggestionText.trim()}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '9px 18px',
                      background: sendingSuggestion || !suggestionText.trim()
                        ? 'rgba(212,120,58,0.3)'
                        : 'rgba(212,120,58,0.15)',
                      border: '1px solid rgba(212,120,58,0.4)',
                      color: sendingSuggestion || !suggestionText.trim()
                        ? 'rgba(212,120,58,0.4)'
                        : '#d4783a',
                      fontSize: 12, fontWeight: 600,
                      cursor: sendingSuggestion || !suggestionText.trim() ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit', transition: 'all 0.15s',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseOver={e => {
                      if (!sendingSuggestion && suggestionText.trim()) {
                        e.currentTarget.style.background = 'rgba(212,120,58,0.25)'
                        e.currentTarget.style.borderColor = '#d4783a'
                      }
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.background = 'rgba(212,120,58,0.15)'
                      e.currentTarget.style.borderColor = 'rgba(212,120,58,0.4)'
                    }}
                  >
                    <Send size={12} />
                    {sendingSuggestion ? 'Enviando...' : 'Recomendar tag'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '13px 32px',
              background: saving ? 'rgba(217,78,24,0.4)' : '#d94e18',
              color: '#fff', border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
              transition: 'background 0.2s', fontFamily: 'inherit',
            }}
            onMouseOver={e => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = '#c04010' }}
            onMouseOut={e => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = '#d94e18' }}>
            <Save size={13} />
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </form>
    </div>
  )
}
