import { createClient } from '@/lib/supabase/server'
import { ensureProfile } from '@/lib/ensureProfile'
import { NextResponse } from 'next/server'

// Verifica o link de email do Supabase via token_hash (fluxo recomendado p/ SSR).
// Diferente do PKCE (?code=), o token_hash NÃO exige o mesmo navegador que pediu
// o reset — funciona quando o usuário abre o email no Gmail/Outlook/celular.
// O template aponta para cá:
//   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/redefinir-senha
type OtpType = 'recovery' | 'email' | 'signup' | 'invite' | 'magiclink' | 'email_change'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const token_hash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') as OtpType | null
  const next = url.searchParams.get('next') ?? '/dashboard'

  // Só permite redirecionos internos (evita open redirect)
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'

  if (token_hash && type) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      // Confirmação de cadastro: cria o perfil a partir do user_metadata gravado
      // no signUp (role/name/bio), já que sem sessão prévia o complete-profile
      // não roda. Idempotente — se já existir, não faz nada.
      if ((type === 'signup' || type === 'email') && data.user) {
        const m = data.user.user_metadata ?? {}
        await ensureProfile({
          userId: data.user.id,
          role: m.role,
          name: m.name,
          bio: m.bio,
        })
      }
      // Sessão gravada nos cookies → segue para o destino
      return NextResponse.redirect(new URL(safeNext, url.origin))
    }
  }

  // Link inválido/expirado/já usado → volta pro fluxo de recuperação com aviso
  return NextResponse.redirect(new URL('/esqueci-senha?error=link', url.origin))
}
