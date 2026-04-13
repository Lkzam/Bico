import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Star } from 'lucide-react'

export default async function FreelancerReviewsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('user_id', user.id).single()
  if (profile?.role !== 'freelancer') redirect('/dashboard/company')

  const { data: reviews } = await supabase
    .from('reviews')
    .select('*, reviewer:profiles!reviews_reviewer_id_fkey(name, role), job:jobs(title)')
    .eq('reviewee_id', profile.id)
    .order('created_at', { ascending: false })

  return (
    <div style={{ color: '#fff' }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#d94e18', boxShadow: '0 0 6px rgba(217,78,24,0.9)' }} />
          <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#d94e18' }}>
            Avaliações
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, flexWrap: 'wrap' }}>
          <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: 900, letterSpacing: '-0.03em', margin: 0 }}>
            Minhas avaliações
          </h1>
          {(profile.rating_count ?? 0) > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 4 }}>
              <div style={{ display: 'flex', gap: 3 }}>
                {[1,2,3,4,5].map(n => (
                  <Star key={n} size={16} fill={n <= Math.round(profile.rating) ? '#d94e18' : 'none'} style={{ color: n <= Math.round(profile.rating) ? '#d94e18' : 'rgba(185,190,200,0.3)' }} />
                ))}
              </div>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#fff', fontFamily: 'var(--font-heading)' }}>
                {Number(profile.rating).toFixed(1)}
              </span>
              <span style={{ fontSize: 12, color: 'rgba(185,190,200,0.4)' }}>
                ({profile.rating_count} avaliações)
              </span>
            </div>
          )}
        </div>
      </div>

      <ReviewList reviews={reviews ?? []} emptyMessage="Nenhuma avaliação recebida ainda. Conclua trabalhos para receber avaliações das empresas." />
    </div>
  )
}

function ReviewList({ reviews, emptyMessage }: { reviews: any[], emptyMessage: string }) {
  if (reviews.length === 0) {
    return (
      <div style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', padding: '64px 32px', textAlign: 'center' }}>
        <Star size={40} style={{ color: 'rgba(185,190,200,0.15)', margin: '0 auto 16px', display: 'block' }} />
        <p style={{ fontSize: 14, color: 'rgba(185,190,200,0.5)', margin: 0 }}>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {reviews.map((r: any) => (
        <div key={r.id} style={{
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.02)',
          padding: '24px',
          transition: 'border-color 0.2s, background 0.2s',
        }}
          onMouseOver={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = 'rgba(193,143,107,0.3)'; el.style.background = 'rgba(193,143,107,0.05)' }}
          onMouseOut={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = 'rgba(255,255,255,0.08)'; el.style.background = 'rgba(255,255,255,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: r.comment ? 16 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #d94e18, #1e2535)',
                border: '1px solid rgba(217,78,24,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: '#fff',
              }}>
                {r.reviewer?.name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: '0 0 2px' }}>{r.reviewer?.name ?? 'Usuário'}</p>
                <p style={{ fontSize: 11, color: 'rgba(185,190,200,0.4)', margin: 0 }}>
                  {r.job?.title} · {new Date(r.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
              {[1,2,3,4,5].map(n => (
                <Star key={n} size={14} fill={n <= r.stars ? '#d94e18' : 'none'} style={{ color: n <= r.stars ? '#d94e18' : 'rgba(185,190,200,0.3)' }} />
              ))}
            </div>
          </div>
          {r.comment && (
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(255,255,255,0.7)', margin: 0, fontStyle: 'italic', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              "{r.comment}"
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
