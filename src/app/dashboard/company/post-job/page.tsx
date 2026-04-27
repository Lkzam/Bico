'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast, Toaster } from 'sonner'
import { Check, ArrowRight, Wifi, MapPin } from 'lucide-react'

export default function PostJobPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [allTags, setAllTags] = useState<any[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set())
  const [workType, setWorkType] = useState<'remote' | 'presential'>('remote')
  const [form, setForm] = useState({ title: '', description: '', value: '', deadline_hours: '' })

  useEffect(() => {
    supabase.from('tags').select('*').order('name').then(({ data }) => setAllTags(data ?? []))
  }, [])

  function toggleTag(id: string) {
    setSelectedTagIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selectedTagIds.size === 0) { toast.error('Selecione pelo menos uma habilidade.'); return }

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profile } = await supabase
      .from('profiles').select('id').eq('user_id', user.id).single()
    if (!profile) { toast.error('Perfil não encontrado.'); setLoading(false); return }

    const { data: job, error } = await supabase
      .from('jobs')
      .insert({
        company_id: profile.id,
        title: form.title,
        description: form.description,
        value: parseFloat(form.value),
        deadline_hours: form.deadline_hours ? parseInt(form.deadline_hours) : null,
        work_type: workType,
        status: 'open',
      })
      .select().single()

    if (error || !job) { toast.error('Erro ao publicar trabalho.'); setLoading(false); return }

    await supabase.from('job_tags').insert(
      Array.from(selectedTagIds).map(tag_id => ({ job_id: job.id, tag_id }))
    )

    toast.success('Trabalho publicado! Freelancers compatíveis serão notificados.')
    setTimeout(() => router.push('/dashboard/company'), 1200)
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

  return (
    <div style={{ color: '#fff' }}>
      <Toaster position="top-right" richColors />

      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#d94e18', boxShadow: '0 0 6px rgba(217,78,24,0.9)' }} />
          <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#d94e18' }}>
            Publicar trabalho
          </span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 6px' }}>
          Novo trabalho
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(185,190,200,0.5)', margin: 0 }}>
          Freelancers com as habilidades compatíveis serão notificados em tempo real.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' }}>

          {/* Left: Job details */}
          <div style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', padding: 28 }}>
            <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(185,190,200,0.5)', margin: '0 0 24px' }}>
              Detalhes do trabalho
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Presencial / Remoto */}
              <div>
                <label style={labelStyle}>Tipo de trabalho</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {([
                    { value: 'remote',     label: 'Remoto',     sub: 'Pode ser feito de qualquer lugar', icon: Wifi },
                    { value: 'presential', label: 'Presencial', sub: 'Exige presença física',           icon: MapPin },
                  ] as { value: 'remote' | 'presential'; label: string; sub: string; icon: any }[]).map(opt => {
                    const active = workType === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setWorkType(opt.value)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '12px 14px', textAlign: 'left',
                          background: active ? 'rgba(217,78,24,0.12)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${active ? '#d94e18' : 'rgba(255,255,255,0.1)'}`,
                          cursor: 'pointer', transition: 'all 0.15s',
                          fontFamily: 'inherit',
                        }}>
                        <opt.icon size={15} color={active ? '#d94e18' : 'rgba(185,190,200,0.4)'} style={{ flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: active ? '#fff' : 'rgba(185,190,200,0.7)', marginBottom: 2 }}>
                            {opt.label}
                          </div>
                          <div style={{ fontSize: 11, color: active ? 'rgba(212,120,58,0.8)' : 'rgba(185,190,200,0.35)' }}>
                            {opt.sub}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Título</label>
                <input
                  placeholder="Ex: Criar logo para startup"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  required
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = '#d94e18')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
              </div>

              <div>
                <label style={labelStyle}>Descrição</label>
                <textarea
                  placeholder="Descreva o que precisa ser feito, referências, estilo desejado..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={5}
                  required
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                  onFocus={e => (e.target.style.borderColor = '#d94e18')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Valor (R$)</label>
                  <input
                    type="number" min="10" step="0.01" placeholder="150.00"
                    value={form.value}
                    onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                    required
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#d94e18')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Prazo (horas)</label>
                  <input
                    type="number" min="1" placeholder="48"
                    value={form.deadline_hours}
                    onChange={e => setForm(f => ({ ...f, deadline_hours: e.target.value }))}
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#d94e18')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Tags */}
          <div style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', padding: 28 }}>
            <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(185,190,200,0.5)', margin: '0 0 8px' }}>
              Habilidades necessárias
            </p>
            <p style={{ fontSize: 12, color: 'rgba(185,190,200,0.35)', margin: '0 0 20px' }}>
              Freelancers com essas tags serão notificados automaticamente.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {allTags.map(tag => {
                const active = selectedTagIds.has(tag.id)
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
                      cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                    }}>
                    {active && <Check size={11} />}
                    {tag.name}
                  </button>
                )
              })}
            </div>

            {selectedTagIds.size > 0 && (
              <p style={{ fontSize: 11, color: 'rgba(185,190,200,0.35)', marginTop: 16, marginBottom: 0 }}>
                {selectedTagIds.size} {selectedTagIds.size === 1 ? 'habilidade selecionada' : 'habilidades selecionadas'}
              </p>
            )}
          </div>
        </div>

        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button type="button" onClick={() => router.back()}
            style={{
              padding: '13px 24px', background: 'transparent',
              border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(185,190,200,0.6)',
              cursor: 'pointer', fontSize: '0.65rem', fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'inherit',
            }}>
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '13px 32px',
              background: loading ? 'rgba(217,78,24,0.4)' : '#d94e18',
              color: '#fff', border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
              transition: 'background 0.2s', fontFamily: 'inherit',
            }}
            onMouseOver={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#c04010' }}
            onMouseOut={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#d94e18' }}>
            <ArrowRight size={13} />
            {loading ? 'Publicando...' : 'Publicar trabalho'}
          </button>
        </div>
      </form>
    </div>
  )
}
