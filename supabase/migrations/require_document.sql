-- ============================================================================
-- CPF/CNPJ obrigatório + único por conta. Rodar no SQL Editor do Supabase.
-- ============================================================================

-- 1. Únicos por conta → impede criar contas infinitas com o mesmo documento.
--    Parcial (ignora NULL): só vale quando o campo está preenchido.
create unique index if not exists account_private_cpf_unique
  on account_private (cpf)  where cpf  is not null;
create unique index if not exists account_private_cnpj_unique
  on account_private (cnpj) where cnpj is not null;

-- 2. Empresa só publica job se tiver CPF ou CNPJ (enforcement real no banco).
--    RESTRICTIVE = soma (AND) com as políticas de INSERT já existentes em jobs.
drop policy if exists "empresa precisa de documento para publicar" on jobs;
create policy "empresa precisa de documento para publicar"
  on jobs as restrictive for insert to authenticated
  with check (
    exists (
      select 1
      from account_private ap
      join profiles p on p.id = ap.profile_id
      where p.id = company_id           -- company_id = coluna da linha sendo inserida
        and p.user_id = auth.uid()
        and (coalesce(ap.cpf, '') <> '' or coalesce(ap.cnpj, '') <> '')
    )
  );
