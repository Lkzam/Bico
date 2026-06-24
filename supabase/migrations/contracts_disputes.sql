-- ============================================================================
-- Contratos v2: disputa POR ETAPA + snapshot das etapas no arquivo.
-- Rodar no SQL Editor do Supabase.
--
-- Fluxo de disputa de uma etapa:
--   delivered --(empresa contesta)--> disputed --(admin arbitra)-->
--       release_milestone -> approved  (credita 93% ao freelancer)
--       refund_milestone   -> refunded (estorno value*1.10 à empresa, PIX manual)
--
-- Estados terminais de uma etapa: 'approved' e 'refunded'. O contrato conclui
-- quando NENHUMA etapa está em estado não-terminal (pending/in_progress/
-- delivered/disputed).
-- ============================================================================

-- 1. Novas colunas e estados em contract_milestones.
alter table contract_milestones add column if not exists dispute_reason text;
alter table contract_milestones add column if not exists disputed_at    timestamptz;

do $$
begin
  alter table contract_milestones drop constraint if exists contract_milestones_status_check;
  alter table contract_milestones
    add constraint contract_milestones_status_check
    check (status in ('pending','in_progress','delivered','approved','disputed','refunded','cancelled'));
end $$;

-- 2. dispute_resolutions ganha milestone_id (disputas de etapa).
alter table dispute_resolutions add column if not exists milestone_id uuid;

-- 3. job_archives guarda o snapshot das etapas (some com o cascade ao deletar o job).
alter table job_archives add column if not exists milestones jsonb;

-- ============================================================================
-- 4. Helper: ativa a próxima etapa pendente e conclui o contrato se acabou.
--    Retorna true se o contrato foi concluído nesta chamada.
-- ============================================================================
create or replace function advance_contract(p_job_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_completed boolean := false;
begin
  -- Ativa a próxima etapa pendente, se não houver nenhuma etapa ativa.
  update contract_milestones
     set status = 'in_progress', updated_at = now()
   where id = (
     select id from contract_milestones
      where job_id = p_job_id and status = 'pending'
      order by position asc
      limit 1
   )
   and not exists (
     select 1 from contract_milestones
      where job_id = p_job_id and status in ('in_progress','delivered','disputed')
   );

  -- Conclui o contrato se não restou nada não-terminal.
  if not exists (
    select 1 from contract_milestones
     where job_id = p_job_id and status in ('pending','in_progress','delivered','disputed')
  ) then
    update jobs set status = 'completed', completed_at = now()
     where id = p_job_id and status = 'in_progress';
    update payments set status = 'paid', approved_at = now()
     where job_id = p_job_id and status = 'paid_pending_approval';
    v_completed := true;
  end if;

  return v_completed;
end;
$$;

revoke execute on function advance_contract(uuid) from public, anon, authenticated;
grant  execute on function advance_contract(uuid) to service_role;

-- ============================================================================
-- 5. approve_milestone — recriada para usar advance_contract (conclusão correta
--    mesmo com etapas reembolsadas).
-- ============================================================================
create or replace function approve_milestone(
  p_milestone_id uuid,
  p_company_profile_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ms        contract_milestones;
  v_job       jobs;
  v_credit    numeric(10,2);
  v_completed boolean;
begin
  select * into v_ms from contract_milestones where id = p_milestone_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Etapa não encontrada.');
  end if;

  select * into v_job from jobs where id = v_ms.job_id for update;
  if v_job.company_id <> p_company_profile_id then
    return jsonb_build_object('ok', false, 'error', 'Sem permissão.');
  end if;
  if v_job.mode <> 'contract' or v_job.status <> 'in_progress' then
    return jsonb_build_object('ok', false, 'error', 'Contrato não está em andamento.');
  end if;
  if v_ms.status <> 'delivered' then
    return jsonb_build_object('ok', false, 'error', 'Esta etapa não está aguardando aprovação.');
  end if;

  v_credit := round(v_ms.value * 0.93, 2);

  update contract_milestones
     set status = 'approved', approved_at = now(), updated_at = now()
   where id = v_ms.id;

  update account_private
     set balance = balance + v_credit
   where profile_id = v_job.freelancer_id;

  insert into notifications (profile_id, title, body, metadata)
  values (
    v_job.freelancer_id,
    'Etapa aprovada!',
    'A etapa "' || v_ms.title || '" foi aprovada. R$ ' || to_char(v_credit, 'FM999990D00') ||
      ' foi liberado no seu saldo.',
    jsonb_build_object('job_id', v_job.id, 'milestone_id', v_ms.id, 'credited', v_credit)
  );

  v_completed := advance_contract(v_job.id);

  return jsonb_build_object(
    'ok', true, 'credited', v_credit, 'all_approved', v_completed,
    'job_id', v_job.id, 'freelancer_id', v_job.freelancer_id
  );
end;
$$;

revoke execute on function approve_milestone(uuid, uuid) from public, anon, authenticated;
grant  execute on function approve_milestone(uuid, uuid) to service_role;

-- ============================================================================
-- 6. release_milestone — admin decide a favor do freelancer (etapa em disputa).
--    Credita 93% e segue o contrato.
-- ============================================================================
create or replace function release_milestone(
  p_milestone_id uuid,
  p_admin_profile_id uuid,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ms        contract_milestones;
  v_job       jobs;
  v_credit    numeric(10,2);
  v_completed boolean;
begin
  select * into v_ms from contract_milestones where id = p_milestone_id for update;
  if not found or v_ms.status <> 'disputed' then
    return jsonb_build_object('ok', false, 'error', 'Etapa não está em disputa.');
  end if;

  select * into v_job from jobs where id = v_ms.job_id for update;

  v_credit := round(v_ms.value * 0.93, 2);

  update contract_milestones
     set status = 'approved', approved_at = now(), updated_at = now()
   where id = v_ms.id;

  update account_private
     set balance = balance + v_credit
   where profile_id = v_job.freelancer_id;

  insert into dispute_resolutions (job_id, milestone_id, action, resolved_by, admin_note)
  values (v_job.id, v_ms.id, 'release', p_admin_profile_id, p_note);

  v_completed := advance_contract(v_job.id);

  return jsonb_build_object(
    'ok', true, 'credited', v_credit, 'completed', v_completed,
    'job_id', v_job.id, 'company_id', v_job.company_id, 'freelancer_id', v_job.freelancer_id
  );
end;
$$;

-- ============================================================================
-- 7. refund_milestone — admin decide a favor da empresa (etapa em disputa).
--    Estorno = value * 1.10 (valor da etapa + a taxa de 10% que a empresa pagou
--    nela). O estorno PIX em si é manual no painel do PSP.
-- ============================================================================
create or replace function refund_milestone(
  p_milestone_id uuid,
  p_admin_profile_id uuid,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ms        contract_milestones;
  v_job       jobs;
  v_refund    numeric(10,2);
  v_completed boolean;
begin
  select * into v_ms from contract_milestones where id = p_milestone_id for update;
  if not found or v_ms.status <> 'disputed' then
    return jsonb_build_object('ok', false, 'error', 'Etapa não está em disputa.');
  end if;

  select * into v_job from jobs where id = v_ms.job_id for update;

  v_refund := round(v_ms.value * 1.10, 2);

  update contract_milestones
     set status = 'refunded', updated_at = now()
   where id = v_ms.id;

  insert into dispute_resolutions (job_id, milestone_id, action, resolved_by, admin_note)
  values (v_job.id, v_ms.id, 'refund', p_admin_profile_id, p_note);

  v_completed := advance_contract(v_job.id);

  return jsonb_build_object(
    'ok', true, 'refunded', v_refund, 'completed', v_completed,
    'job_id', v_job.id, 'company_id', v_job.company_id, 'freelancer_id', v_job.freelancer_id
  );
end;
$$;

revoke execute on function release_milestone(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function refund_milestone(uuid, uuid, text)  from public, anon, authenticated;
grant  execute on function release_milestone(uuid, uuid, text) to service_role;
grant  execute on function refund_milestone(uuid, uuid, text)  to service_role;
