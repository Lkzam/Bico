-- ============================================================
-- MIGRAÇÃO DE SEGURANÇA v1
-- Execute no Supabase SQL Editor
-- ============================================================

-- ── 1. CORRIGIR VIEW jobs_with_tags (SECURITY DEFINER → SECURITY INVOKER) ──
-- A view estava executando com permissões do criador, não do usuário logado.
-- Isso bypassa o RLS e pode expor dados indevidos.
ALTER VIEW IF EXISTS public.jobs_with_tags SET (security_invoker = true);


-- ── 2. CORRIGIR search_path mutável nas funções ─────────────────────────────
-- Funções sem search_path fixo são vulneráveis a ataques de schema injection.
-- Um atacante poderia criar objetos em outro schema com o mesmo nome.

ALTER FUNCTION public.update_profile_rating()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.get_matching_freelancers(uuid)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.rls_auto_enable()
  SET search_path = public, pg_temp;


-- ── 3. REVOGAR EXECUTE em funções SECURITY DEFINER de anon/authenticated ────
-- Essas funções rodam com permissões elevadas e não devem ser chamáveis
-- pelo endpoint /rest/v1/rpc por usuários anônimos ou autenticados.

REVOKE EXECUTE ON FUNCTION public.rls_auto_enable()
  FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.update_profile_rating()
  FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.get_matching_freelancers(uuid)
  FROM anon, authenticated;


-- ── 4. CORRIGIR política ampla no bucket chat-files ─────────────────────────
-- Remove a política irrestrita e cria uma restrita via RLS em storage.objects.

DROP POLICY IF EXISTS "Public read chat files" ON storage.objects;

DROP POLICY IF EXISTS "Participantes do chat leem arquivos" ON storage.objects;
CREATE POLICY "Participantes do chat leem arquivos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat-files'
    AND (storage.foldername(name))[1] IN (
      SELECT c.id::text
      FROM public.chats c
      JOIN public.profiles p
        ON p.id = c.company_id OR p.id = c.freelancer_id
      WHERE p.user_id = auth.uid()
    )
  );


-- ── 5. POLÍTICA PARA cancelled_job_logs (tabela sem policies) ───────────────
-- A tabela tem RLS habilitado mas nenhuma policy → nenhum cliente consegue ler.
-- Isso é o comportamento CORRETO (só devs via service_role acessam).
-- Adicionamos um comentário explícito para silenciar o aviso do Supabase
-- e uma policy de SELECT bloqueada para tornar a intenção clara.

COMMENT ON TABLE public.cancelled_job_logs IS
  'Arquivo de conversas de jobs cancelados. Acesso apenas via service_role (devs). Nenhum acesso público permitido.';

-- Policy que nega explicitamente acesso público (só service_role bypassa RLS)
DROP POLICY IF EXISTS "Sem acesso público" ON public.cancelled_job_logs;
CREATE POLICY "Sem acesso público" ON public.cancelled_job_logs
  FOR ALL USING (false);


-- ── 6. PROTEÇÃO CONTRA SENHAS VAZADAS (HaveIBeenPwned) ─────────────────────
-- Isso não pode ser feito via SQL — ative manualmente no Supabase Dashboard:
-- Authentication → Providers → Email → Enable "Leaked Password Protection"
-- Também recomendado: ativar "Email OTP" e aumentar senhas mínimas para 8 chars.

-- ── 7. PROTEÇÃO EXTRA: rate limit por IP no nível do banco ──────────────────
-- O rate limiting principal está no middleware Next.js (src/middleware.ts).
-- Como reforço, limitamos quantas conexões simultâneas o role `anon` pode abrir.
-- (Opcional — descomente se quiser aplicar)
-- ALTER ROLE anon CONNECTION LIMIT 50;
