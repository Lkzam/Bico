-- ============================================================================
-- 2ª auditoria — N1 (jobs) e N2 (chat-files).
-- Rodar no SQL Editor do Supabase.
-- ============================================================================

-- ── N1: travar update direto de jobs pelo client ───────────────────────────
-- A policy de UPDATE deixava empresa/freelancer alterarem QUALQUER coluna do
-- job (value, freelancer_id, status, timestamps) via PostgREST — tampering
-- financeiro. A única escrita legítima do client (entrega do freelancer) foi
-- movida para /api/jobs/[id]/deliver (admin). Então revogamos o UPDATE do
-- client por completo. service_role (backend) não é afetado.
revoke update on public.jobs from authenticated, anon;

-- ── N2: upload do chat-files só para participantes do chat ──────────────────
-- Antes: qualquer autenticado gravava em qualquer pasta de chat (a leitura já
-- era restrita; o upload não). Agora espelha a policy de SELECT.
drop policy if exists "Authenticated users can upload chat files" on storage.objects;

create policy "chat-files: participante envia"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chat-files'
    and (storage.foldername(name))[1] in (
      select c.id::text
      from public.chats c
      join public.profiles p on (p.id = c.company_id or p.id = c.freelancer_id)
      where p.user_id = auth.uid()
    )
  );
