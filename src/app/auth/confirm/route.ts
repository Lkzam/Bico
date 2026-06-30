import { createClient } from '@/lib/supabase/server'
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
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      // Sessão (de recuperação) gravada nos cookies → segue p/ definir nova senha
      return NextResponse.redirect(new URL(safeNext, url.origin))
    }
  }

  // Link inválido/expirado/já usado → volta pro fluxo de recuperação com aviso
  return NextResponse.redirect(new URL('/esqueci-senha?error=link', url.origin))
}
