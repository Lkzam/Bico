-- ============================================================================
-- Teste das funções de dinheiro (withdraw_debit / credit_balance).
-- Rodar no SQL Editor do Supabase. É SEGURO: tudo roda dentro de uma transação
-- com ROLLBACK no final — o saldo real NÃO é alterado.
--
-- O teste auto-seleciona um perfil de freelancer existente, força um saldo
-- conhecido, exercita as funções e valida os invariantes:
--   1. withdraw_debit dentro do saldo  -> debita o valor exato
--   2. withdraw_debit acima do saldo   -> recusa (false) e NÃO altera saldo
--   3. dois saques que somam > saldo    -> o segundo é recusado (sem negativo)
--   4. credit_balance                   -> soma ao saldo
--
-- Falha em qualquer invariante => RAISE EXCEPTION (aborta com mensagem clara).
-- Sucesso => avisos "PASS ..." e ROLLBACK limpo.
-- ============================================================================

begin;

do $$
declare
  v_profile uuid;
  v_bal     numeric(12,2);
  v_ok      boolean;
begin
  -- Perfil de teste (qualquer freelancer existente).
  select id into v_profile from profiles where role = 'freelancer' limit 1;
  if v_profile is null then
    raise notice 'SKIP: nenhum perfil freelancer encontrado para testar.';
    return;
  end if;

  -- Garante linha em account_private e fixa saldo conhecido = 100.00
  insert into account_private (profile_id, balance)
  values (v_profile, 100.00)
  on conflict (profile_id) do update set balance = 100.00;

  -- 1. Saque dentro do saldo (30) -> true, saldo vira 70
  v_ok := withdraw_debit(v_profile, 30.00);
  select balance into v_bal from account_private where profile_id = v_profile;
  if not v_ok or v_bal <> 70.00 then
    raise exception 'FAIL #1 saque válido: ok=% saldo=% (esperado true / 70.00)', v_ok, v_bal;
  end if;
  raise notice 'PASS #1 saque dentro do saldo (saldo=%).', v_bal;

  -- 2. Saque acima do saldo (999) -> false, saldo continua 70
  v_ok := withdraw_debit(v_profile, 999.00);
  select balance into v_bal from account_private where profile_id = v_profile;
  if v_ok or v_bal <> 70.00 then
    raise exception 'FAIL #2 saque acima do saldo: ok=% saldo=% (esperado false / 70.00)', v_ok, v_bal;
  end if;
  raise notice 'PASS #2 saque acima do saldo recusado (sem negativo, saldo=%).', v_bal;

  -- 3. Dois saques: 50 (ok, saldo 20) e mais 50 (recusado, saldo 20)
  v_ok := withdraw_debit(v_profile, 50.00);
  select balance into v_bal from account_private where profile_id = v_profile;
  if not v_ok or v_bal <> 20.00 then
    raise exception 'FAIL #3a primeiro saque: ok=% saldo=%', v_ok, v_bal;
  end if;
  v_ok := withdraw_debit(v_profile, 50.00);
  select balance into v_bal from account_private where profile_id = v_profile;
  if v_ok or v_bal <> 20.00 then
    raise exception 'FAIL #3b segundo saque deveria ser recusado: ok=% saldo=%', v_ok, v_bal;
  end if;
  raise notice 'PASS #3 dois saques não furam o saldo (saldo=%).', v_bal;

  -- 4. credit_balance(+80) -> saldo vira 100
  perform credit_balance(v_profile, 80.00);
  select balance into v_bal from account_private where profile_id = v_profile;
  if v_bal <> 100.00 then
    raise exception 'FAIL #4 credit_balance: saldo=% (esperado 100.00)', v_bal;
  end if;
  raise notice 'PASS #4 credit_balance soma corretamente (saldo=%).', v_bal;

  raise notice '✅ TODOS OS TESTES PASSARAM (rollback a seguir — nada foi persistido).';
end $$;

rollback;
