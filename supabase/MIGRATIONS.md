# Migrations — estado de aplicação

Este projeto aplica SQL **manualmente** no SQL Editor do Supabase (não usa o
Supabase CLI). Para evitar "drift" (código assumindo colunas/funções que não
existem no banco), este arquivo é a **fonte de verdade do que já foi aplicado**.

> Regra: ao criar um novo `.sql`, adicione-o à tabela abaixo como ⬜ pendente.
> Depois de rodar no Supabase, marque ✅ e preencha a data. Nunca edite um SQL já
> aplicado — crie um novo (ex.: `*_v2.sql`).

**Auditoria em 2026-06-30:** todos os arquivos abaixo foram confirmados como
aplicados em produção pelo dono do projeto.

## `supabase/migrations/`

| Arquivo | O que faz | Status |
|---|---|---|
| `schema.sql` (raiz) | Schema base: profiles, jobs, chats, messages, etc. | ✅ aplicado |
| `payments_table.sql` (raiz) | Tabela `payments` (cobranças PIX) | ✅ aplicado |
| `migration_cancel_v1.sql` (raiz) | Cancelamento de job + `cancelled_job_logs` | ✅ aplicado |
| `migration_security_v1.sql` (raiz) | Endurecimento inicial de RLS | ✅ aplicado |
| `migration_tags_v2.sql` (raiz) | Tags de jobs (`job_tags`/`tags`) | ✅ aplicado |
| `atomic_money_functions.sql` | RPCs de dinheiro: `withdraw_debit`, `credit_balance`, `approve_and_credit` | ✅ aplicado |
| `add_cancel_reason_and_notif_metadata.sql` | `cancelled_job_logs.cancel_reason` + `notifications.metadata` | ✅ aplicado |
| `add_terms_accepted_at.sql` | `profiles.terms_accepted_at` | ✅ aplicado |
| `require_document.sql` | Exige CPF (`account_private.cpf`) p/ aceitar/propor | ✅ aplicado |
| `proposals.sql` | Tabela `proposals` + coluna `jobs.mode` | ✅ aplicado |
| `proposals_accept.sql` | RPC `accept_proposal` (atômica) | ✅ aplicado |
| `proposals_milestones.sql` | `proposals.proposed_milestones` (jsonb) | ✅ aplicado |
| `contracts.sql` | Modo `contract` + `contract_milestones` | ✅ aplicado |
| `contracts_accept.sql` | `accept_contract_proposal` + `fund_contract` + status `awaiting_payment` | ✅ aplicado |
| `contracts_exec.sql` | `approve_milestone` (credita 93% por etapa) | ✅ aplicado |
| `contracts_disputes.sql` | Disputa por etapa + `release_milestone`/`refund_milestone` | ✅ aplicado |
| `contracts_auto_approve.sql` | `auto_approve_milestone` (cron 7 dias) | ✅ aplicado |
| `dispute_resolution.sql` | `dispute_resolutions` + arbitragem admin | ✅ aplicado |
| `freelancer_mode_prefs.sql` | `profiles.job_mode_prefs` (filtro de modos) | ✅ aplicado |
| `harden_jobs_and_chatfiles.sql` | Revoke UPDATE em `jobs`; política de upload chat-files por participante | ✅ aplicado |
| `harden_proposals.sql` | Revoke INSERT/UPDATE em `proposals` (escrita via API) | ✅ aplicado |
| `harden_deliveries_storage.sql` | Políticas do bucket `deliveries` escopadas | ✅ aplicado |

## Endurecimentos aplicados via SQL avulso (sem arquivo dedicado)

Rodados direto no SQL Editor durante as auditorias de segurança — registrados
aqui para não se perderem:

- **H1 — `profiles`:** `revoke update on profiles from authenticated` +
  `grant update (name, bio, avatar_url, website, portfolio_url, job_mode_prefs)`.
  Impede o cliente de forjar `role`/`rating`/`balance`.
- **account_private:** confirmado SELECT-only para `authenticated` (sem
  UPDATE/INSERT) — impossível auto-creditar saldo.

## Testes

- `supabase/tests/money_functions_test.sql` — script de verificação manual dos
  RPCs de dinheiro (rodar sob demanda no SQL Editor, não é migration).
