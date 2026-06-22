-- ============================================================================
-- Fase 3D: execução do contrato etapa por etapa.
-- Rodar no SQL Editor do Supabase.
--
-- Fluxo de cada milestone (contract_milestones.status):
--   pending     -> aguardando etapas anteriores
--   in_progress -> ativa (freelancer trabalhando nela)
--   delivered   -> freelancer entregou; empresa precisa aprovar
--   approved    -> empresa aprovou; 93% do valor da etapa creditado ao freelancer
--
-- A entrega (deliver) é feita por uma rota de API com admin client (a tabela
-- contract_milestones não tem policy de UPDATE para o cliente). A aprovação
-- envolve dinheiro -> RPC atômica SECURITY DEFINER, só service_role.
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
  v_remaining int;
begin
  -- 1. Trava a etapa.
  select * into v_ms from contract_milestones where id = p_milestone_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Etapa não encontrada.');
  end if;

  -- 2. Trava o job e valida.
  select * into v_job from jobs where id = v_ms.job_id for update;
  if v_job.company_id <> p_company_profile_id then
    return jsonb_build_object('ok', false, 'error', 'Sem permissão.');
  end if;
  if v_job.mode <> 'contract' or v_job.status <> 'in_progress' then
    return jsonb_build_object('ok', false, 'error', 'Contrato não está em andamento.');
  end if;

  -- 3. Idempotência: só aprova quem está entregue.
  if v_ms.status <> 'delivered' then
    return jsonb_build_object('ok', false, 'error', 'Esta etapa não está aguardando aprovação.');
  end if;

  -- 4. Crédito do freelancer: 93% do valor DESTA etapa (taxa de 7% no recebimento).
  v_credit := round(v_ms.value * 0.93, 2);

  update contract_milestones
     set status = 'approved', approved_at = now(), updated_at = now()
   where id = v_ms.id;

  -- Incremento ATÔMICO no saldo.
  update account_private
     set balance = balance + v_credit
   where profile_id = v_job.freelancer_id;

  -- 5. Ativa a próxima etapa pendente (menor position).
  update contract_milestones
     set status = 'in_progress', updated_at = now()
   where id = (
     select id from contract_milestones
      where job_id = v_job.id and status = 'pending'
      order by position asc
      limit 1
   );

  -- 6. Falta alguma para aprovar?
  select count(*) into v_remaining
    from contract_milestones
   where job_id = v_job.id and status <> 'approved';

  -- 7. Notifica o freelancer do crédito.
  insert into notifications (profile_id, title, body, metadata)
  values (
    v_job.freelancer_id,
    'Etapa aprovada!',
    'A etapa "' || v_ms.title || '" foi aprovada. R$ ' || to_char(v_credit, 'FM999990D00') ||
      ' foi liberado no seu saldo.',
    jsonb_build_object('job_id', v_job.id, 'milestone_id', v_ms.id, 'credited', v_credit)
  );

  -- 8. Se foi a última, conclui o contrato (o arquivamento/limpeza fica a cargo
  --    da rota de API, que precisa do Storage).
  if v_remaining = 0 then
    update jobs set status = 'completed', completed_at = now() where id = v_job.id;
    update payments set status = 'paid', approved_at = now()
     where job_id = v_job.id and status = 'paid_pending_approval';
  end if;

  return jsonb_build_object(
    'ok', true,
    'credited', v_credit,
    'all_approved', v_remaining = 0,
    'job_id', v_job.id,
    'freelancer_id', v_job.freelancer_id
  );
end;
$$;

revoke execute on function approve_milestone(uuid, uuid) from public, anon, authenticated;
grant  execute on function approve_milestone(uuid, uuid) to service_role;
