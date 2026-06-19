-- ============================================================================
-- Sistema de propostas (Fase 2A).
-- Rodar no SQL Editor do Supabase.
--
-- O modo 'fast' (atual) continua sendo o padrão. 'proposal' habilita o fluxo
-- onde freelancers enviam propostas e a empresa escolhe.
-- ============================================================================

-- 1. Modo de recebimento do job. Default 'fast' para não quebrar nada existente.
alter table jobs add column if not exists mode text
  not null default 'fast'
  check (mode in ('fast', 'proposal'));

create index if not exists jobs_mode_idx on jobs (mode) where status = 'open';

-- 2. Valor sugerido pela empresa em jobs 'proposal'.
--    Para jobs 'fast', 'value' é o preço final. Para 'proposal', 'value' é a
--    REFERÊNCIA — o freelancer pode contra-propor outro valor na proposta.
--    Mantemos 'value' obrigatório nos dois casos (no fast vira preço, no
--    proposal vira orçamento sugerido).

-- 3. Tabela de propostas.
create table if not exists proposals (
  id              uuid primary key default gen_random_uuid(),
  job_id          uuid not null references jobs(id) on delete cascade,
  freelancer_id   uuid not null references profiles(id) on delete cascade,
  value           numeric(10,2) not null check (value > 0),
  deadline_hours  int,
  message         text,
  status          text not null default 'pending'
                  check (status in ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Impede o mesmo freelancer ter duas propostas PENDENTES no mesmo job
-- (já tendo 'rejected' ou 'withdrawn' pode reenviar)
create unique index if not exists proposals_one_pending_per_freelancer_per_job
  on proposals (job_id, freelancer_id)
  where status = 'pending';

create index if not exists proposals_job_idx       on proposals (job_id);
create index if not exists proposals_freelancer_idx on proposals (freelancer_id);
create index if not exists proposals_status_idx    on proposals (status);

-- 4. RLS.
alter table proposals enable row level security;

-- SELECT: a empresa dona do job vê todas as propostas; o freelancer vê só as dele.
create policy "empresa do job ve propostas" on proposals
  for select
  using (
    exists (
      select 1 from jobs j join profiles p on p.id = j.company_id
      where j.id = proposals.job_id and p.user_id = auth.uid()
    )
  );

create policy "freelancer ve suas propostas" on proposals
  for select
  using (
    exists (
      select 1 from profiles p
      where p.id = proposals.freelancer_id and p.user_id = auth.uid()
    )
  );

-- INSERT: apenas o próprio freelancer cria, e só em jobs abertos no modo 'proposal'
create policy "freelancer envia proposta" on proposals
  for insert
  with check (
    exists (
      select 1 from profiles p
      where p.id = proposals.freelancer_id and p.user_id = auth.uid() and p.role = 'freelancer'
    )
    and
    exists (
      select 1 from jobs j
      where j.id = proposals.job_id
        and j.status = 'open'
        and j.mode = 'proposal'
        and j.company_id <> proposals.freelancer_id  -- não pode propor para si mesmo
    )
  );

-- UPDATE: só o freelancer dono pode retirar (status='pending' → 'withdrawn')
-- e só pode ajustar message/value/deadline_hours enquanto ainda 'pending'.
-- Aceitar/rejeitar é feito via RPC (service_role), não por esta policy.
create policy "freelancer atualiza propria proposta pendente" on proposals
  for update
  using (
    exists (
      select 1 from profiles p
      where p.id = proposals.freelancer_id and p.user_id = auth.uid()
    )
    and status = 'pending'
  )
  with check (
    -- Só pode setar status para 'withdrawn' (não pode auto-aceitar)
    status in ('pending', 'withdrawn')
  );

-- DELETE: nunca via cliente (apaga histórico de auditoria)
-- (sem policy → bloqueado pelo RLS)
