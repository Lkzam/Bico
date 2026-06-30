import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Recebe o redirect do link de email do Supabase (fluxo PKCE).
// Troca o `code` por uma sessão (grava cookies) e encaminha para `next`.
// Usado pela recuperação de senha: o link aponta para cá com
// ?code=...&next=/redefinir-senha
export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') ?? '/dashboard'

  // Só permite redirecionos internos (evita open redirect)
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(safeNext, url.origin))
    }
  }

  // Falha (código inválido/expirado) → volta pro fluxo de recuperação com aviso
  return NextResponse.redirect(new URL('/esqueci-senha?error=link', url.origin))
}
