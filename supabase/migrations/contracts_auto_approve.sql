-- ============================================================================
-- M3: auto-aprovação de etapa de contrato.
-- Rodar no SQL Editor do Supabase.
--
-- Problema: contrato não tinha o cron de auto-aprovação que o job rápido tem.
-- Se a empresa some depois da entrega de uma etapa (nem aprova, nem contesta),
-- os 93% daquela etapa ficariam presos no escrow pra sempre.
--
-- Esta RPC é igual à approve_milestone, mas SEM a checagem de empresa (é o
-- sistema agindo). Só age em etapa 'delivered'. Idempotente.
-- ============================================================================
create or replace function auto_approve_milestone(p_milestone_id uuid)
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
  if not found or v_ms.status <> 'delivered' then
    return jsonb_build_object('ok', false, 'error', 'Etapa não está entregue.');
  end if;

  select * into v_job from jobs where id = v_ms.job_id for update;
  if v_job.status <> 'in_progress' or v_job.mode <> 'contract' then
    return jsonb_build_object('ok', false, 'error', 'Contrato não está em andamento.');
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
    'Etapa aprovada automaticamente',
    'A etapa "' || v_ms.title || '" foi aprovada automaticamente por falta de resposta da empresa. R$ ' ||
      to_char(v_credit, 'FM999990D00') || ' foi liberado no seu saldo.',
    jsonb_build_object('job_id', v_job.id, 'milestone_id', v_ms.id, 'credited', v_credit, 'auto', true)
  );

  v_completed := advance_contract(v_job.id);

  return jsonb_build_object(
    'ok', true, 'credited', v_credit, 'completed', v_completed,
    'job_id', v_job.id, 'freelancer_id', v_job.freelancer_id
  );
end;
$$;

revoke execute on function auto_approve_milestone(uuid) from public, anon, authenticated;
grant  execute on function auto_approve_milestone(uuid) to service_role;
