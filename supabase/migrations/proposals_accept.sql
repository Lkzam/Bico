-- ============================================================================
-- Empresa aceita uma proposta (Fase 2C).
-- Operação atômica: marca vencedora, rejeita as outras, atualiza job, cria chat.
-- Rodar no SQL Editor do Supabase.
-- ============================================================================

create or replace function accept_proposal(
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
  v_chat_id  uuid;
  v_inserted_chat boolean := false;
begin
  -- 1. Trava a proposta (FOR UPDATE) — serializa com outras tentativas.
  select * into v_proposal
    from proposals
   where id = p_proposal_id and status = 'pending'
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Proposta não está pendente.');
  end if;

  -- 2. Trava o job (FOR UPDATE) — bloqueia escolhas concorrentes.
  select * into v_job
    from jobs
   where id = v_proposal.job_id
   for update;

  if v_job.company_id <> p_company_profile_id then
    return jsonb_build_object('ok', false, 'error', 'Sem permissão.');
  end if;
  if v_job.status <> 'open' or v_job.mode <> 'proposal' then
    return jsonb_build_object('ok', false, 'error', 'Trabalho não está mais aberto para propostas.');
  end if;

  -- 3. Atualiza o job: valor e prazo passam a ser os da proposta vencedora.
  update jobs
     set status         = 'in_progress',
         freelancer_id  = v_proposal.freelancer_id,
         value          = v_proposal.value,
         deadline_hours = coalesce(v_proposal.deadline_hours, deadline_hours)
   where id = v_job.id;

  -- 4. Marca a proposta vencedora como accepted.
  update proposals
     set status = 'accepted', updated_at = now()
   where id = v_proposal.id;

  -- 5. Rejeita as outras propostas pendentes do mesmo job.
  update proposals
     set status = 'rejected', updated_at = now()
   where job_id = v_job.id
     and id <> v_proposal.id
     and status = 'pending';

  -- 6. Cria chat (idempotente; já existe unique em chats.job_id).
  insert into chats (job_id, company_id, freelancer_id)
  values (v_job.id, v_job.company_id, v_proposal.freelancer_id)
  on conflict (job_id) do nothing
  returning id into v_chat_id;

  if v_chat_id is null then
    select id into v_chat_id from chats where job_id = v_job.id;
  else
    v_inserted_chat := true;
  end if;

  -- 7. Notifica o freelancer vencedor.
  insert into notifications (profile_id, title, body, metadata)
  values (
    v_proposal.freelancer_id,
    'Proposta aceita!',
    'Sua proposta para "' || v_job.title || '" foi escolhida. O chat já está aberto.',
    jsonb_build_object('job_id', v_job.id, 'chat_id', v_chat_id, 'proposal_id', v_proposal.id)
  );

  -- 8. Notifica os freelancers rejeitados (uma notif por proposta).
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

  return jsonb_build_object(
    'ok', true,
    'chat_id', v_chat_id,
    'chat_created', v_inserted_chat,
    'freelancer_id', v_proposal.freelancer_id
  );
end;
$$;

revoke execute on function accept_proposal(uuid, uuid) from public, anon, authenticated;
grant  execute on function accept_proposal(uuid, uuid) to service_role;
