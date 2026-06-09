-- ============================================================================
-- Funções atômicas de dinheiro (resolve crédito duplo, lost-update e atomicidade)
-- Rodar no SQL Editor do Supabase.
-- Todas são SECURITY DEFINER + search_path fixo, e SÓ podem ser executadas pelo
-- service_role (admin client). anon/authenticated NÃO podem chamar.
-- ============================================================================

-- 1. Aprovar entrega + creditar freelancer (atômico e idempotente)
--    Retorna o freelancer_id se processou; NULL se já tinha sido processado.
create or replace function approve_and_credit(p_job_id uuid, p_auto boolean default false)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment    payments;
  v_freelancer uuid;
begin
  -- Trava + idempotência: só processa se ainda estiver pendente de aprovação.
  update payments
     set status = 'paid', approved_at = now(), auto_approved = p_auto
   where job_id = p_job_id and status = 'paid_pending_approval'
   returning * into v_payment;

  if not found then
    return null;  -- já processado (duplo-clique, ou approve + auto-approve) → no-op
  end if;

  update jobs
     set status = 'completed',
         completed_at = now(),
         auto_approved_at = case when p_auto then now() else auto_approved_at end
   where id = p_job_id
   returning freelancer_id into v_freelancer;

  -- Incremento ATÔMICO (sem read-modify-write) + arredondamento de centavos.
  update account_private
     set balance = balance + round(v_payment.job_value * 0.93, 2)
   where profile_id = v_freelancer;

  return v_freelancer;
end;
$$;

-- 2. Débito de saque (atômico, com checagem de saldo). Retorna true se debitou.
create or replace function withdraw_debit(p_profile_id uuid, p_amount numeric)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update account_private
     set balance = balance - p_amount
   where profile_id = p_profile_id
     and balance >= p_amount;   -- impede saldo negativo e duplo-saque
  return found;
end;
$$;

-- 3. Crédito genérico (usado para reverter saque que falhou na Efí).
create or replace function credit_balance(p_profile_id uuid, p_amount numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update account_private
     set balance = balance + p_amount
   where profile_id = p_profile_id;
end;
$$;

-- ============================================================================
-- CRÍTICO: revogar execução de todo mundo e liberar só para o service_role.
-- Sem isto, qualquer um com a anon key poderia se creditar saldo.
-- ============================================================================
revoke execute on function approve_and_credit(uuid, boolean) from public, anon, authenticated;
revoke execute on function withdraw_debit(uuid, numeric)      from public, anon, authenticated;
revoke execute on function credit_balance(uuid, numeric)      from public, anon, authenticated;

grant execute on function approve_and_credit(uuid, boolean) to service_role;
grant execute on function withdraw_debit(uuid, numeric)      to service_role;
grant execute on function credit_balance(uuid, numeric)      to service_role;
