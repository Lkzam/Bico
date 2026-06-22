-- ============================================================================
-- Fase 3B: propostas em contratos guardam o plano de milestones proposto.
-- Rodar no SQL Editor do Supabase.
--
-- Para jobs 'proposal' comuns, proposed_milestones fica NULL (a proposta é só
-- valor/prazo). Para jobs 'contract', a proposta carrega o plano de milestones
-- (espelho do contrato ou versão ajustada pelo freelancer).
--
-- Formato esperado de cada item do array:
--   { "title": "...", "description": "...", "value": 200.00, "deadline_hours": 48 }
-- ============================================================================

alter table proposals add column if not exists proposed_milestones jsonb;

-- Freelancers precisam ver os milestones de um contrato ABERTO para propor
-- (antes de serem escolhidos, eles não são job.freelancer_id ainda).
drop policy if exists "milestones de contratos abertos sao visiveis" on contract_milestones;
create policy "milestones de contratos abertos sao visiveis" on contract_milestones
  for select
  using (
    exists (
      select 1 from jobs j
      where j.id = contract_milestones.job_id
        and j.status = 'open'
        and j.mode = 'contract'
    )
  );
