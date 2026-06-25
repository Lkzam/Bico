-- ============================================================================
-- M4: blindar o bucket 'deliveries'.
-- Rodar no SQL Editor do Supabase.
--
-- Antes: políticas frouxas (e duplicadas) deixavam QUALQUER usuário autenticado
--   - LER qualquer entrega (furava o escrow: empresa só deveria baixar após pagar,
--     e um freelancer não deveria ver a entrega de outro)
--   - GRAVAR em qualquer pasta de job (sobrescrever/poluir entrega alheia)
--
-- Depois:
--   - SELECT: nenhuma policy no client. Os downloads do app usam signed URL
--     gerada no server (service_role, que ignora RLS) — então não precisam de
--     SELECT no client. Isso mantém o gate de escrow 100% no backend.
--   - INSERT: só o freelancer do job, e só na pasta do próprio job.
--   - UPDATE/DELETE: nenhuma policy → só service_role (limpeza no arquivamento).
--     Os paths incluem Date.now(), então upsert nunca sobrescreve (INSERT basta).
-- ============================================================================

drop policy if exists "Autenticados visualizam entregas" on storage.objects;
drop policy if exists "Participantes podem ver entrega"   on storage.objects;
drop policy if exists "Freelancer faz upload"             on storage.objects;
drop policy if exists "Freelancer pode fazer upload"      on storage.objects;

create policy "deliveries: freelancer envia entrega do seu job"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'deliveries'
    and exists (
      select 1 from public.jobs j
      join public.profiles p on p.id = j.freelancer_id
      where j.id::text = (storage.foldername(name))[1]
        and p.user_id = auth.uid()
    )
  );
