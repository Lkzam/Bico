'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import LiquidEther from '@/components/LiquidEther'

export default function Home() {
  return (
    <div style={{ background: '#0b0e17', color: '#fff', fontFamily: 'var(--font-body), Inter, sans-serif' }}>

      {/* ── NAVBAR ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 1000,
        background: '#0b0e17',
        borderBottom: '1px solid rgba(185,190,200,0.15)',
      }}>
        <div style={{
          maxWidth: 1400, margin: '0 auto',
          padding: '0 48px', height: 72,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontFamily: 'var(--font-heading), DM Sans, sans-serif', fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
            Bico
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="/login" style={{ fontSize: 14, color: 'rgba(185,190,200,0.78)', textDecoration: 'none', padding: '8px 16px', transition: 'color 0.2s' }}
              onMouseOver={e => (e.currentTarget.style.color = '#d4783a')}
              onMouseOut={e => (e.currentTarget.style.color = 'rgba(185,190,200,0.78)')}>
              Entrar
            </Link>
            <Link href="/register" style={{
              fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
              padding: '11px 24px', borderRadius: 40,
              background: '#1e2535', color: '#fff', textDecoration: 'none',
              transition: 'background 0.2s, box-shadow 0.2s',
            }}
              onMouseOver={e => { e.currentTarget.style.background = '#d94e18'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(217,78,24,0.35)'; }}
              onMouseOut={e => { e.currentTarget.style.background = '#1e2535'; e.currentTarget.style.boxShadow = 'none'; }}>
              Começar grátis
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', width: '100%', minHeight: '100vh', background: '#0b0808', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>

        {/* LiquidEther fundo */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <LiquidEther
            colors={['#d94e18', '#c04010', '#d4783a']}
            mouseForce={20}
            cursorSize={100}
            isViscous={true}
            viscous={30}
            autoDemo={true}
            autoSpeed={0.5}
            autoIntensity={2.2}
          />
        </div>

        {/* Overlay escuro suave para legibilidade do texto */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'linear-gradient(to right, rgba(11,8,8,0.82) 0%, rgba(11,8,8,0.55) 55%, rgba(11,8,8,0.1) 100%)' }} />

        {/* Logo SVG direita */}
        <div style={{
          position: 'absolute',
          top: '50%', left: '62%',
          transform: 'translateY(-50%)',
          zIndex: 5,
          opacity: 0.92,
          pointerEvents: 'none',
        }}>
          <Image src="/logo.svg" alt="Bico" width={340} height={192} style={{ objectFit: 'contain', filter: 'drop-shadow(0 0 40px rgba(217,78,24,0.35))' }} />
        </div>

        {/* Texto esquerda */}
        <div style={{
          position: 'relative', zIndex: 10,
          maxWidth: '46%', paddingLeft: '8%', paddingRight: 24, paddingTop: 80, paddingBottom: 80,
        }}>

          {/* Eyebrow */}
          <div className="animate-fade-up-1" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
            <div className="animate-dot-pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: '#d94e18' }} />
            <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#d94e18' }}>
              Trabalhos em tempo real
            </span>
          </div>

          {/* Headline */}
          <h1 className="animate-fade-up-2" style={{
            fontFamily: 'var(--font-body), Inter, sans-serif',
            fontSize: 'clamp(3rem, 6.5vw, 7rem)',
            fontWeight: 900, lineHeight: 0.95,
            letterSpacing: '-0.03em', color: '#fff',
            margin: '0 0 24px',
          }}>
            Ganhe mais<br />
            <span style={{ color: 'rgba(160,152,148,0.88)' }}>fazendo o que<br />você sabe</span>
          </h1>

          {/* Sub */}
          <p className="animate-fade-up-3" style={{
            fontSize: 'clamp(0.85rem, 1.1vw, 1rem)',
            lineHeight: 1.72, color: 'rgba(160,152,148,0.88)',
            maxWidth: 400, margin: '0 0 36px', fontWeight: 400,
          }}>
            Conectamos profissionais a empresas que precisam de bicos.
            Receba uma notificação, aceite na hora
            e receba via PIX direto no app.
          </p>

          {/* CTAs */}
          <div className="animate-fade-up-4" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <Link href="/register" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
              padding: '15px 32px', background: '#d94e18', color: '#fff',
              textDecoration: 'none', borderRadius: 4,
              transition: 'background 0.2s, box-shadow 0.2s',
            }}
              onMouseOver={e => { e.currentTarget.style.background = '#c04010'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(217,78,24,0.4)'; }}
              onMouseOut={e => { e.currentTarget.style.background = '#d94e18'; e.currentTarget.style.boxShadow = 'none'; }}>
              Quero fazer bicos <ArrowRight size={13} />
            </Link>
            <Link href="/register" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
              padding: '14px 32px',
              border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.8)',
              textDecoration: 'none', borderRadius: 4,
              transition: 'border-color 0.2s, color 0.2s',
            }}
              onMouseOver={e => { e.currentTarget.style.borderColor = '#d94e18'; e.currentTarget.style.color = '#fff'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}>
              Sou empresa
            </Link>
          </div>
        </div>
      </section>

      {/* ── STATS CARDS ── */}
      <section style={{ background: '#0b0e17', padding: '80px 0' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 48px' }}>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { num: '01', title: 'Crie seu perfil', sub: 'Adicione tags de habilidades', label: 'PASSO' },
              { num: '02', title: 'Receba notificações', sub: 'Jobs compatíveis em tempo real', label: 'PASSO' },
              { num: '03', title: 'Aceite na hora', sub: 'Primeiro a aceitar fica com o job', label: 'PASSO' },
              { num: 'PIX', title: 'Saque quando quiser', sub: 'Dinheiro direto na sua chave PIX', label: 'PAGAMENTO' },
            ].map((card) => (
              <StatsCard key={card.num} {...card} />
            ))}
          </div>
        </div>
      </section>

      {/* ── COMO FUNCIONA ── */}
      <section style={{ background: '#0b0e17', padding: '80px 0', borderTop: '1px solid rgba(185,190,200,0.08)' }}>
        <div style={{ maxWidth: 1320, margin: '0 auto', padding: '0 60px', display: 'grid', gridTemplateColumns: '42% 1fr', gap: 80, alignItems: 'center' }}>

          {/* Esquerda — visual */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(217,78,24,0.08) 0%, rgba(255,255,255,0.02) 100%)',
            border: '1px solid rgba(217,78,24,0.2)',
            borderRadius: 16, padding: '48px 40px',
            display: 'flex', flexDirection: 'column', gap: 20,
          }}>
            {['Empresa posta um bico', 'Freelancer recebe notificação', 'Freelancer aceita', 'Trabalho é realizado', 'Entrega + pagamento via app'].map((step, i) => (
              <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: i === 4 ? '#d94e18' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${i === 4 ? '#d94e18' : 'rgba(255,255,255,0.12)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: '#fff',
                }}>
                  {i + 1}
                </div>
                <span style={{ fontSize: 14, color: i === 4 ? '#fff' : 'rgba(185,190,200,0.78)', fontWeight: i === 4 ? 600 : 400 }}>
                  {step}
                </span>
                {i < 4 && <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)', marginLeft: 'auto' }} />}
              </div>
            ))}
          </div>

          {/* Direita — texto */}
          <div>
            <p style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#d4783a', marginBottom: 18 }}>
              Como funciona
            </p>
            <h2 style={{
              fontFamily: 'var(--font-body), Inter, sans-serif',
              fontSize: 'clamp(2rem, 3.6vw, 3.2rem)',
              fontWeight: 800, lineHeight: 1.08,
              letterSpacing: '-0.02em', color: '#fff',
              margin: '0 0 24px',
            }}>
              Simples como<br />pedir um Uber
            </h2>
            <p style={{ fontSize: 'clamp(0.88rem, 1.1vw, 1rem)', lineHeight: 1.72, color: 'rgba(185,190,200,0.78)', maxWidth: 460, marginBottom: 40 }}>
              A empresa publica um trabalho com as habilidades necessárias.
              Quem tem as tags certas recebe a notificação e pode aceitar na hora.
              O pagamento fica retido no app e só é liberado após a entrega — seguro para os dois lados.
            </p>
            <Link href="/register" style={{
              display: 'inline-block',
              fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
              padding: '15px 32px', background: '#1e2535', color: '#fff',
              textDecoration: 'none', transition: 'background 0.2s',
            }}
              onMouseOver={e => (e.currentTarget.style.background = '#d94e18')}
              onMouseOut={e => (e.currentTarget.style.background = '#1e2535')}>
              Criar conta grátis
            </Link>
          </div>
        </div>
      </section>

      {/* ── FEATURES / DIFERENCIAIS ── */}
      <section style={{ background: '#0b0e17', padding: '80px 0', borderTop: '1px solid rgba(185,190,200,0.08)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 48px' }}>
          <p style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#d4783a', marginBottom: 16, textAlign: 'center' }}>
            — Por que o Bico
          </p>
          <h2 style={{
            fontFamily: 'var(--font-heading), DM Sans, sans-serif',
            fontSize: '3.5rem', fontWeight: 600, lineHeight: 1.2,
            letterSpacing: '-0.02em', color: '#f5f5f5',
            textAlign: 'center', marginBottom: 56,
          }}>
            Feito para o brasileiro
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {[
              { icon: '⚡', title: 'Rápido como o Uber', desc: 'Job aparece como notificação. O primeiro a aceitar fica com ele — sem fila, sem leilão.' },
              { icon: '🔒', title: 'Pagamento protegido', desc: 'A empresa paga antes. O dinheiro só é liberado para o freelancer após a entrega aprovada.' },
              { icon: '⭐', title: 'Sistema de estrelas', desc: 'Quanto melhor sua nota, mais jobs aparecem. Empresa ruim atrai freelancer ruim — e vice-versa.' },
              { icon: '📱', title: 'Saque via PIX', desc: 'Informe sua chave PIX e saque quando quiser, direto do app. Sem criar conta em lugar nenhum.' },
            ].map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* ── DEPOIMENTOS ── */}
      <section style={{ background: '#0b0e17', padding: '96px 0', borderTop: '1px solid rgba(185,190,200,0.08)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 48px' }}>
          <div style={{
            fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.35em',
            textTransform: 'uppercase', color: '#C18F6B',
            borderTop: '1px solid #C18F6B', paddingTop: 12, marginBottom: 48,
            display: 'inline-block',
          }}>
            Confiado por profissionais
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 32 }}>
            {[
              { text: '"Fiz R$1.200 no primeiro mês sem sair de casa. Só precisei cadastrar minhas habilidades de design e os jobs começaram a aparecer."', name: 'Ana Lima', role: 'Designer Gráfica, São Paulo' },
              { text: '"Contratei um dev para um projeto urgente em menos de 10 minutos. O trabalho foi entregue no prazo e o pagamento foi totalmente seguro pelo app."', name: 'Ricardo Matos', role: 'CEO, Startup de Marketing' },
              { text: '"Trabalho com Excel avançado e nunca imaginei que conseguiria bicos com isso. Já são 8 clientes atendidos pelo Bico."', name: 'Fernanda Costa', role: 'Analista Financeira, Belo Horizonte' },
              { text: '"A nota de estrelas fez toda diferença. Mantemos nosso padrão alto e só recebemos freelancers realmente comprometidos."', name: 'Carlos Souza', role: 'Gerente de Projetos, Rio de Janeiro' },
            ].map((t) => (
              <TestimonialCard key={t.name} {...t} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section style={{ background: '#0b0808', padding: '96px 0', borderTop: '1px solid rgba(185,190,200,0.08)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 64, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <p style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#d4783a', marginBottom: 16 }}>
              Comece agora
            </p>
            <h2 style={{
              fontFamily: 'var(--font-body), Inter, sans-serif',
              fontSize: 'clamp(2rem, 3.6vw, 3.2rem)',
              fontWeight: 800, lineHeight: 1.08,
              letterSpacing: '-0.02em', color: '#fff', margin: 0,
            }}>
              Pronto para o<br />
              <span style={{ color: 'rgba(160,152,148,0.88)' }}>seu primeiro bico?</span>
            </h2>
          </div>
          <div style={{ flex: 1, minWidth: 280 }}>
            <p style={{ fontSize: 'clamp(0.88rem, 1.1vw, 1rem)', lineHeight: 1.72, color: 'rgba(185,190,200,0.78)', marginBottom: 32 }}>
              Crie sua conta em menos de 1 minuto. Grátis para sempre.
              Só cobramos uma taxa de 15% quando você receber — ou seja, só ganhamos se você ganhar.
            </p>
            <Link href="/register" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
              padding: '16px 36px', background: '#d94e18', color: '#fff',
              textDecoration: 'none', transition: 'background 0.2s, box-shadow 0.2s',
            }}
              onMouseOver={e => { e.currentTarget.style.background = '#c04010'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(217,78,24,0.4)'; }}
              onMouseOut={e => { e.currentTarget.style.background = '#d94e18'; e.currentTarget.style.boxShadow = 'none'; }}>
              Criar conta grátis <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#0b0e17', borderTop: '1px solid rgba(185,190,200,0.1)', padding: '48px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, color: '#fff' }}>Bico</span>
          <p style={{ fontSize: '0.85rem', color: 'rgba(185,190,200,0.5)' }}>©NovaIris. Todos os direitos reservados.</p>
          <div style={{ display: 'flex', gap: 24 }}>
            <Link href="/login" style={{ fontSize: '0.95rem', color: 'rgba(185,190,200,0.6)', textDecoration: 'none' }}>Entrar</Link>
            <Link href="/register" style={{ fontSize: '0.95rem', color: 'rgba(185,190,200,0.6)', textDecoration: 'none' }}>Cadastrar</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}

/* ── SUB-COMPONENTES ── */

function StatsCard({ num, title, sub, label }: { num: string, title: string, sub: string, label: string }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 16, padding: '40px 32px',
      display: 'flex', flexDirection: 'column', gap: 12,
      flex: 1, minWidth: 220, maxWidth: 280,
      alignItems: 'center', textAlign: 'center',
      cursor: 'default', transition: 'all 0.3s ease',
    }}
      onMouseOver={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = 'translateY(-8px)'
        el.style.boxShadow = '0 16px 48px rgba(217,78,24,0.15)'
        el.style.borderColor = 'rgba(217,78,24,0.3)'
      }}
      onMouseOut={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = 'translateY(0)'
        el.style.boxShadow = 'none'
        el.style.borderColor = 'rgba(255,255,255,0.12)'
      }}>
      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-heading), DM Sans, sans-serif', fontSize: 48, fontWeight: 700, lineHeight: 1, color: '#fff' }}>{num}</span>
      <span style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 600, color: '#fff' }}>{title}</span>
      <span style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.5 }}>{sub}</span>
    </div>
  )
}

function FeatureCard({ icon, title, desc }: { icon: string, title: string, desc: string }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 16, padding: '36px 32px',
      transition: 'all 0.3s ease',
    }}
      onMouseOver={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = 'rgba(217,78,24,0.3)'
        el.style.transform = 'translateY(-4px)'
        el.style.boxShadow = '0 16px 48px rgba(217,78,24,0.1)'
      }}
      onMouseOut={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = 'rgba(255,255,255,0.1)'
        el.style.transform = 'translateY(0)'
        el.style.boxShadow = 'none'
      }}>
      <div style={{ fontSize: 28, marginBottom: 16 }}>{icon}</div>
      <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 10 }}>{title}</h3>
      <p style={{ fontSize: 14, lineHeight: 1.65, color: 'rgba(185,190,200,0.78)' }}>{desc}</p>
    </div>
  )
}

function TestimonialCard({ text, name, role }: { text: string, name: string, role: string }) {
  return (
    <div style={{
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8, padding: '40px',
      background: 'rgba(255,255,255,0.02)',
      display: 'flex', flexDirection: 'column', gap: 28,
      transition: 'all 0.3s ease',
    }}
      onMouseOver={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = 'rgba(193,143,107,0.3)'
        el.style.background = 'rgba(193,143,107,0.05)'
        el.style.transform = 'translateY(-4px)'
      }}
      onMouseOut={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = 'rgba(255,255,255,0.1)'
        el.style.background = 'rgba(255,255,255,0.02)'
        el.style.transform = 'translateY(0)'
      }}>
      <p style={{ fontSize: 15, lineHeight: 1.6, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' }}>{text}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #d94e18, #1e2535)',
          border: '2px solid rgba(193,143,107,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 700, color: '#fff',
        }}>
          {name[0]}
        </div>
        <div>
          <p style={{ fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 600, color: '#f5f5f5', margin: 0 }}>{name}</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0 }}>{role}</p>
        </div>
      </div>
    </div>
  )
}
