import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/sidebar'
import { Toaster } from 'sonner'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // Se não tem perfil, vai para página de completar cadastro (não para /login — evita loop)
  if (!profile) redirect('/complete-profile')

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0b0e17', fontFamily: 'var(--font-body), Inter, sans-serif' }}>
      <Sidebar profile={profile} />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 48px' }}>
          {children}
        </div>
      </main>
      <Toaster position="top-right" richColors />
    </div>
  )
}
