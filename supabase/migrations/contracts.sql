-- ============================================================================
-- Contratos com milestones (Fase 3A).
-- Rodar no SQL Editor do Supabase.
--
-- Modelo: estender jobs.mode com 'contract'. Cada job 'contract' tem N linhas
-- em contract_milestones. O value do job é a soma dos valores dos milestones.
-- O escrow continua sendo 1 só pagamento PIX (total upfront), feito após a
-- empresa escolher um freelancer (Fase 3C). O sistema libera 93% por milestone
-- aprovada (Fase 3D).
-- ============================================================================

-- 1. Permite 'contract' em jobs.mode.
do $$
begin
  if exists (
    select 1 from information_schema.constraint_column_usage
     where table_name = 'jobs' and constraint_name like 'jobs_mode_check'
  ) then
    alter table jobs drop constraint if exists jobs_mode_check;
  end if;
  alter table jobs
    add constraint jobs_mode_check
    check (mode in ('fast', 'proposal', 'contract'));
end $$;

-- 2. Tabela de milestones.
create table if not exists contract_milestones (
  id              uuid primary key default gen_random_uuid(),
  job_id          uuid not null references jobs(id) on delete cascade,
  position        int  not null check (position >= 1),
  title           text not null,
  description     text,
  value           numeric(10,2) not null check (value > 0),
  deadline_hours  int check (deadline_hours is null or deadline_hours > 0),
  status          text not null default 'pending'
                  check (status in ('pending', 'in_progress', 'delivered', 'approved', 'cancelled')),
  delivery_url    text,
  delivery_note   text,
  delivered_at    timestamptz,
  approved_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Ordem é única por job (impede duas milestones na mesma posição)
create unique index if not exists contract_milestones_job_position_unique
  on contract_milestones (job_id, position);

create index if not exists contract_milestones_job_idx on contract_milestones (job_id);
create index if not exists contract_milestones_status_idx on contract_milestones (status);

-- 3. RLS.
alter table contract_milestones enable row level security;

-- SELECT: empresa do job, freelancer do job (após aceite), ou admin (via service_role)
create policy "empresa do job ve milestones" on contract_milestones
  for select
  using (
    exists (
      select 1 from jobs j join profiles p on p.id = j.company_id
      where j.id = contract_milestones.job_id and p.user_id = auth.uid()
    )
  );

create policy "freelancer do job ve milestones" on contract_milestones
  for select
  using (
    exists (
      select 1 from jobs j join profiles p on p.id = j.freelancer_id
      where j.id = contract_milestones.job_id and p.user_id = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE: nunca via cliente. Tudo via service_role + RPCs
-- atômicas (na Fase 3C/3D vamos adicionar RPCs específicas).
-- Sem policy de insert/update/delete → bloqueado para anon/authenticated.
