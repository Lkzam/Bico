-- ============================================================================
-- Resolução de disputas (atômica e auditável).
-- Rodar no SQL Editor do Supabase.
-- ============================================================================

-- 1. Tabela de log: histórico de resoluções (auditoria).
create table if not exists dispute_resolutions (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid not null,
  action      text not null check (action in ('release', 'refund', 'split')),
  resolved_by uuid not null,     -- profile_id do admin que decidiu
  admin_note  text,
  created_at  timestamptz default now()
);

create index if not exists dispute_resolutions_job_idx on dispute_resolutions (job_id);

alter table dispute_resolutions enable row level security;
-- Sem policy: ninguém lê via RLS; só service_role acessa.

-- 2. RELEASE — admin decide a favor do freelancer.
--    Credita 93% do valor do job no saldo do freelancer (mesma taxa do approve normal).
--    Marca job como completed e payment como paid.
create or replace function release_dispute(
  p_job_id uuid,
  p_admin_profile_id uuid,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment    payments;
  v_freelancer uuid;
begin
  update payments
     set status = 'paid', approved_at = now()
   where job_id = p_job_id and status = 'disputed'
   returning * into v_payment;
  if not found then
    return null;  -- já foi resolvido (idempotente)
  end if;

  update jobs
     set status = 'completed', completed_at = now()
   where id = p_job_id and status = 'disputed'
   returning freelancer_id into v_freelancer;

  -- Incremento atômico (mesma lógica do approve_and_credit)
  update account_private
     set balance = balance + round(v_payment.job_value * 0.93, 2)
   where profile_id = v_freelancer;

  insert into dispute_resolutions (job_id, action, resolved_by, admin_note)
  values (p_job_id, 'release', p_admin_profile_id, p_note);

  return v_freelancer;
end;
$$;

-- 3. REFUND — admin decide a favor da empresa.
--    Marca payment como refunded e job como cancelled. A devolução PIX em si
--    é processada MANUALMENTE no painel do PSP (não há devolução automatizada
--    via API neste primeiro momento).
create or replace function refund_dispute(
  p_job_id uuid,
  p_admin_profile_id uuid,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company uuid;
begin
  update payments
     set status = 'refunded'
   where job_id = p_job_id and status = 'disputed'
   returning 1 into v_company;  -- só pra checar found
  if not found then
    return null;  -- idempotente
  end if;

  update jobs
     set status = 'cancelled', completed_at = now()
   where id = p_job_id and status = 'disputed'
   returning company_id into v_company;

  insert into dispute_resolutions (job_id, action, resolved_by, admin_note)
  values (p_job_id, 'refund', p_admin_profile_id, p_note);

  return v_company;
end;
$$;

-- 4. CRÍTICO: revogar execução de público/anon/authenticated.
revoke execute on function release_dispute(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function refund_dispute(uuid, uuid, text)  from public, anon, authenticated;
grant  execute on function release_dispute(uuid, uuid, text) to service_role;
grant  execute on function refund_dispute(uuid, uuid, text)  to service_role;

-- 5. Permite o status 'refunded' em payments (se a CHECK constraint existir).
do $$
begin
  if exists (
    select 1 from information_schema.constraint_column_usage
     where table_name = 'payments' and constraint_name = 'payments_status_check'
  ) then
    alter table payments drop constraint payments_status_check;
    alter table payments
      add constraint payments_status_check
      check (status in ('pending', 'paid_pending_approval', 'paid', 'expired',
                        'disputed', 'refunded'));
  end if;
end $$;
