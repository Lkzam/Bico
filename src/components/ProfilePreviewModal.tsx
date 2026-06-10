'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Star, X, ExternalLink, Loader } from 'lucide-react'

interface Props {
  profileId: string
  onClose: () => void
}

export function ProfilePreviewModal({ profileId, onClose }: Props) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [reviews, setReviews] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, name, role, bio, avatar_url, rating, rating_count, website, portfolio_url')
        .eq('id', profileId)
        .single()
      setProfile(prof)

      const { data: revs } = await supabase
        .from('reviews')
        .select('stars, comment, created_at, reviewer:profiles!reviews_reviewer_id_fkey(name)')
        .eq('reviewee_id', profileId)
        .order('created_at', { ascending: false })
      // Só comentários (estrela-só fica no total)
      setReviews((revs ?? []).filter((r: any) => r.comment && r.comment.trim()))
      setLoading(false)
    }
    load()
  }, [profileId])

  const isCompany = profile?.role === 'company'
  const link = profile?.portfolio_url?.trim() || profile?.website?.trim() || ''
  const linkLabel = isCompany ? 'Site da empresa' : 'Portfólio'

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 6000,
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: '100%', maxWidth: 460, maxHeight: '85vh', overflowY: 'auto',
        background: '#0f1219', border: '1px solid rgba(255,255,255,0.1)', padding: 28,
      }}>
        {/* Fechar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: -8 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(185,190,200,0.5)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'rgba(185,190,200,0.5)' }}>
            <Loader size={22} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : !profile ? (
          <p style={{ textAlign: 'center', color: 'rgba(185,190,200,0.5)', padding: '32px 0' }}>Perfil não encontrado.</p>
        ) : (
          <>
            {/* Cabeçalho */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 20 }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%', marginBottom: 14,
                background: 'linear-gradient(135deg, #d94e18, #1e2535)',
                border: '1px solid rgba(217,78,24,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, fontWeight: 800, color: '#fff', overflow: 'hidden',
              }}>
                {profile.avatar_url
                  ? <img src={profile.avatar_url} alt={profile.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (profile.name?.[0]?.toUpperCase() ?? '?')}
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 4px' }}>{profile.name}</h2>
              <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#d4783a' }}>
                {isCompany ? 'Empresa' : 'Freelancer'}
              </span>

              {/* Rating */}
              {(profile.rating_count ?? 0) > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {[1,2,3,4,5].map(n => (
                      <Star key={n} size={14} fill={n <= Math.round(profile.rating) ? '#d94e18' : 'none'} style={{ color: n <= Math.round(profile.rating) ? '#d94e18' : 'rgba(185,190,200,0.3)' }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{Number(profile.rating).toFixed(1)}</span>
                  <span style={{ fontSize: 12, color: 'rgba(185,190,200,0.4)' }}>({profile.rating_count})</span>
                </div>
              ) : (
                <p style={{ fontSize: 12, color: 'rgba(185,190,200,0.4)', marginTop: 10 }}>Ainda sem avaliações</p>
              )}
            </div>

            {/* Bio */}
            {profile.bio?.trim() && (
              <p style={{ fontSize: 13, lineHeight: 1.6, color: 'rgba(185,190,200,0.7)', textAlign: 'center', margin: '0 0 16px' }}>
                {profile.bio}
              </p>
            )}

            {/* Link portfólio/site */}
            {link && (
              <a href={link.startsWith('http') ? link : `https://${link}`} target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '11px', marginBottom: 20,
                  background: 'rgba(217,78,24,0.1)', border: '1px solid rgba(217,78,24,0.35)',
                  color: '#d4783a', textDecoration: 'none', fontSize: 13, fontWeight: 700,
                }}>
                <ExternalLink size={14} /> {linkLabel}
              </a>
            )}

            {/* Avaliações com comentário */}
            <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(185,190,200,0.5)', margin: '0 0 12px' }}>
              Comentários
            </p>
            {reviews.length === 0 ? (
              <p style={{ fontSize: 13, color: 'rgba(185,190,200,0.4)', margin: 0 }}>Nenhum comentário ainda.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {reviews.map((r: any, i: number) => (
                  <div key={i} style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{r.reviewer?.name ?? 'Usuário'}</span>
                      <div style={{ display: 'flex', gap: 2 }}>
                        {[1,2,3,4,5].map(n => (
                          <Star key={n} size={12} fill={n <= r.stars ? '#d94e18' : 'none'} style={{ color: n <= r.stars ? '#d94e18' : 'rgba(185,190,200,0.3)' }} />
                        ))}
                      </div>
                    </div>
                    <p style={{ fontSize: 13, lineHeight: 1.55, color: 'rgba(255,255,255,0.7)', margin: 0, fontStyle: 'italic' }}>"{r.comment}"</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
