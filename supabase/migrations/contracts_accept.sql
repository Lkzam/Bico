-- ============================================================================
-- Fase 3C: empresa escolhe a proposta de contrato e paga o total upfront.
-- Rodar no SQL Editor do Supabase.
--
-- Fluxo do contrato:
--   open            -> aceitando propostas
--   awaiting_payment-> empresa escolheu freelancer; milestones sincronizadas;
--                      job.value = total da proposta; aguardando pagamento PIX
--   in_progress     -> escrow financiado (PIX confirmado); chat aberto;
--                      primeira milestone em andamento (execução = Fase 3D)
--
-- Duas RPCs:
--   accept_contract_proposal -> escolha + sync de milestones (NÃO cria chat)
--   fund_contract            -> chamada após PIX confirmado (webhook/status):
--                               job -> in_progress, cria chat, inicia milestone 1
-- ============================================================================

-- 1. Permite 'awaiting_payment' em jobs.status. Recria o CHECK com TODOS os
--    estados conhecidos (o constraint atual já inclui payment_received/disputed,
--    adicionados direto no banco em fases anteriores).
do $$
begin
  alter table jobs drop constraint if exists jobs_status_check;
  alter table jobs
    add constraint jobs_status_check
    check (status in (
      'open', 'awaiting_payment', 'in_progress', 'delivered',
      'payment_received', 'completed', 'disputed', 'cancelled'
    ));
end $$;

-- ============================================================================
-- 2. accept_contract_proposal
--    Atômica: trava proposta + job, valida dono, sincroniza milestones a partir
--    do plano proposto pelo freelancer, marca vencedora/rejeitadas, deixa o job
--    em 'awaiting_payment'. Não cria chat (isso acontece após o pagamento).
-- ============================================================================
create or replace function accept_contract_proposal(
  p_proposal_id uuid,
  p_company_profile_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal proposals;
  v_job      jobs;
  v_total    numeric(10,2);
begin
  -- 1. Trava a proposta (pendente).
  select * into v_proposal
    from proposals
   where id = p_proposal_id and status = 'pending'
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Proposta não está pendente.');
  end if;

  -- 2. Valida o plano de milestones da proposta.
  if v_proposal.proposed_milestones is null
     or jsonb_typeof(v_proposal.proposed_milestones) <> 'array'
     or jsonb_array_length(v_proposal.proposed_milestones) = 0 then
    return jsonb_build_object('ok', false, 'error', 'Proposta sem plano de etapas.');
  end if;

  -- 3. Trava o job e valida.
  select * into v_job
    from jobs
   where id = v_proposal.job_id
   for update;

  if v_job.company_id <> p_company_profile_id then
    return jsonb_build_object('ok', false, 'error', 'Sem permissão.');
  end if;
  if v_job.status <> 'open' or v_job.mode <> 'contract' then
    return jsonb_build_object('ok', false, 'error', 'Contrato não está mais aberto para propostas.');
  end if;

  -- 4. Recalcula o total a partir do plano proposto (não confia no value salvo).
  select coalesce(sum((elem.value->>'value')::numeric), 0)
    into v_total
    from jsonb_array_elements(v_proposal.proposed_milestones) as elem(value);

  if v_total <= 0 then
    return jsonb_build_object('ok', false, 'error', 'Total do contrato inválido.');
  end if;

  -- 5. Sincroniza contract_milestones: remove o plano sugerido pela empresa e
  --    insere o plano (possivelmente ajustado) do freelancer escolhido.
  delete from contract_milestones where job_id = v_job.id;

  insert into contract_milestones
    (job_id, position, title, description, value, deadline_hours, status)
  select
    v_job.id,
    elem.ord,
    coalesce(nullif(elem.value->>'title', ''), 'Etapa ' || elem.ord),
    nullif(elem.value->>'description', ''),
    (elem.value->>'value')::numeric,
    nullif(elem.value->>'deadline_hours', '')::int,
    'pending'
  from jsonb_array_elements(v_proposal.proposed_milestones)
       with ordinality as elem(value, ord);

  -- 6. Atualiza o job: freelancer escolhido, valor final, aguardando pagamento.
  update jobs
     set status        = 'awaiting_payment',
         freelancer_id = v_proposal.freelancer_id,
         value         = v_total
   where id = v_job.id;

  -- 7. Marca a proposta vencedora e rejeita as outras pendentes.
  update proposals set status = 'accepted', updated_at = now()
   where id = v_proposal.id;

  update proposals set status = 'rejected', updated_at = now()
   where job_id = v_job.id
     and id <> v_proposal.id
     and status = 'pending';

  -- 8. Notifica o vencedor (chat só abre após pagamento).
  insert into notifications (profile_id, title, body, metadata)
  values (
    v_proposal.freelancer_id,
    'Proposta de contrato aceita!',
    'Sua proposta para "' || v_job.title || '" foi escolhida. Assim que a empresa pagar, o contrato começa.',
    jsonb_build_object('job_id', v_job.id, 'proposal_id', v_proposal.id)
  );

  -- 9. Notifica os rejeitados.
  insert into notifications (profile_id, title, body, metadata)
  select
    p.freelancer_id,
    'Sua proposta não foi selecionada',
    'A empresa escolheu outra proposta para "' || v_job.title || '". Boa sorte nos próximos!',
    jsonb_build_object('job_id', v_job.id, 'proposal_id', p.id)
  from proposals p
   where p.job_id = v_job.id
     and p.id <> v_proposal.id
     and p.status = 'rejected'
     and p.updated_at >= now() - interval '10 seconds';

  return jsonb_build_object('ok', true, 'job_id', v_job.id, 'value', v_total);
end;
$$;

revoke execute on function accept_contract_proposal(uuid, uuid) from public, anon, authenticated;
grant  execute on function accept_contract_proposal(uuid, uuid) to service_role;

-- ============================================================================
-- 3. fund_contract
--    Chamada pelo backend (webhook / reconciliação) DEPOIS que o PIX do contrato
--    é confirmado. Idempotente: só age se o job estiver em 'awaiting_payment'.
--    Avança para 'in_progress', cria o chat e inicia a primeira milestone.
-- ============================================================================
create or replace function fund_contract(p_job_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job     jobs;
  v_chat_id uuid;
begin
  select * into v_job from jobs where id = p_job_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Job não encontrado.');
  end if;

  -- Idempotência: se já saiu de awaiting_payment, nada a fazer.
  if v_job.status <> 'awaiting_payment' then
    return jsonb_build_object('ok', true, 'already', true);
  end if;

  update jobs
     set status              = 'in_progress',
         payment_received_at = now()
   where id = v_job.id and status = 'awaiting_payment';

  -- Inicia a primeira etapa.
  update contract_milestones
     set status = 'in_progress', updated_at = now()
   where job_id = v_job.id and position = 1 and status = 'pending';

  -- Cria o chat (idempotente).
  insert into chats (job_id, company_id, freelancer_id)
  values (v_job.id, v_job.company_id, v_job.freelancer_id)
  on conflict (job_id) do nothing
  returning id into v_chat_id;
  if v_chat_id is null then
    select id into v_chat_id from chats where job_id = v_job.id;
  end if;

  insert into notifications (profile_id, title, body, metadata)
  values (
    v_job.freelancer_id,
    'Contrato iniciado!',
    'A empresa pagou o contrato "' || v_job.title || '". O chat está aberto e a primeira etapa já pode começar.',
    jsonb_build_object('job_id', v_job.id, 'chat_id', v_chat_id)
  );

  return jsonb_build_object('ok', true, 'chat_id', v_chat_id);
end;
$$;

revoke execute on function fund_contract(uuid) from public, anon, authenticated;
grant  execute on function fund_contract(uuid) to service_role;
