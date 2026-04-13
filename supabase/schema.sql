-- =============================================
-- FreelaBR - Schema completo do banco de dados
-- Execute este arquivo no SQL Editor do Supabase
-- =============================================

-- Habilitar extensão UUID
create extension if not exists "uuid-ossp";

-- =============================================
-- TABELA: profiles
-- =============================================
create table profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  role text not null check (role in ('company', 'freelancer')),
  name text not null,
  bio text,
  avatar_url text,
  rating numeric(3,2) default 5.0,
  rating_count integer default 0,
  -- Somente empresa
  website text,
  cnpj text,
  -- Somente freelancer
  cpf text,
  pix_key text,
  portfolio_url text,
  balance numeric(10,2) default 0.0 check (balance >= 0),
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Usuário pode ver qualquer perfil" on profiles
  for select using (true);

create policy "Usuário pode editar só o próprio perfil" on profiles
  for update using (auth.uid() = user_id);

create policy "Usuário pode criar seu próprio perfil" on profiles
  for insert with check (auth.uid() = user_id);

-- =============================================
-- TABELA: tags
-- =============================================
create table tags (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  slug text not null unique
);

alter table tags enable row level security;
create policy "Qualquer um pode ver tags" on tags for select using (true);

-- Tags iniciais da plataforma
insert into tags (name, slug) values
  ('Design Gráfico', 'design-grafico'),
  ('Programação', 'programacao'),
  ('Desenvolvimento Web', 'dev-web'),
  ('Desenvolvimento Mobile', 'dev-mobile'),
  ('Excel / Planilhas', 'excel'),
  ('Edição de Vídeo', 'edicao-video'),
  ('Redação', 'redacao'),
  ('Tradução', 'traducao'),
  ('Social Media', 'social-media'),
  ('Marketing Digital', 'marketing-digital'),
  ('Ilustração', 'ilustracao'),
  ('Fotografia', 'fotografia'),
  ('Música / Áudio', 'musica-audio'),
  ('Animação', 'animacao'),
  ('Suporte / Atendimento', 'suporte'),
  ('Análise de Dados', 'dados'),
  ('Roteiro', 'roteiro'),
  ('SEO', 'seo'),
  ('Vendas', 'vendas'),
  ('Gestão de Projetos', 'gestao');

-- =============================================
-- TABELA: user_tags (freelancer → tags)
-- =============================================
create table user_tags (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles(id) on delete cascade not null,
  tag_id uuid references tags(id) on delete cascade not null,
  unique(profile_id, tag_id)
);

alter table user_tags enable row level security;
create policy "Qualquer um pode ver user_tags" on user_tags for select using (true);
create policy "Freelancer pode gerenciar suas tags" on user_tags
  for all using (
    exists (
      select 1 from profiles
      where id = profile_id and user_id = auth.uid()
    )
  );

-- =============================================
-- TABELA: jobs
-- =============================================
create table jobs (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references profiles(id) on delete cascade not null,
  freelancer_id uuid references profiles(id) on delete set null,
  title text not null,
  description text not null,
  value numeric(10,2) not null check (value > 0),
  deadline_hours integer,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'delivered', 'completed', 'cancelled')),
  delivery_url text,
  delivery_message text,
  accepted_at timestamptz,
  delivered_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
);

alter table jobs enable row level security;

create policy "Empresa vê seus próprios jobs" on jobs
  for select using (
    exists (select 1 from profiles where id = company_id and user_id = auth.uid())
    or
    exists (select 1 from profiles where id = freelancer_id and user_id = auth.uid())
    or status = 'open'
  );

create policy "Empresa cria jobs" on jobs
  for insert with check (
    exists (select 1 from profiles where id = company_id and user_id = auth.uid() and role = 'company')
  );

create policy "Empresa ou freelancer atualiza job" on jobs
  for update using (
    exists (select 1 from profiles where id = company_id and user_id = auth.uid())
    or
    exists (select 1 from profiles where id = freelancer_id and user_id = auth.uid())
  );

-- =============================================
-- TABELA: job_tags
-- =============================================
create table job_tags (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid references jobs(id) on delete cascade not null,
  tag_id uuid references tags(id) on delete cascade not null,
  unique(job_id, tag_id)
);

alter table job_tags enable row level security;
create policy "Qualquer um pode ver job_tags" on job_tags for select using (true);
create policy "Empresa gerencia tags do job" on job_tags
  for all using (
    exists (
      select 1 from jobs j
      join profiles p on p.id = j.company_id
      where j.id = job_id and p.user_id = auth.uid()
    )
  );

-- =============================================
-- TABELA: chats
-- =============================================
create table chats (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid references jobs(id) on delete cascade not null unique,
  company_id uuid references profiles(id) not null,
  freelancer_id uuid references profiles(id) not null,
  created_at timestamptz default now()
);

alter table chats enable row level security;

create policy "Participantes veem o chat" on chats
  for select using (
    exists (select 1 from profiles where id = company_id and user_id = auth.uid())
    or
    exists (select 1 from profiles where id = freelancer_id and user_id = auth.uid())
  );

-- =============================================
-- TABELA: messages
-- =============================================
create table messages (
  id uuid primary key default uuid_generate_v4(),
  chat_id uuid references chats(id) on delete cascade not null,
  sender_id uuid references profiles(id) not null,
  content text not null,
  created_at timestamptz default now()
);

alter table messages enable row level security;

create policy "Participantes veem mensagens" on messages
  for select using (
    exists (
      select 1 from chats c
      join profiles p on (p.id = c.company_id or p.id = c.freelancer_id)
      where c.id = chat_id and p.user_id = auth.uid()
    )
  );

create policy "Participante envia mensagem" on messages
  for insert with check (
    exists (select 1 from profiles where id = sender_id and user_id = auth.uid())
    and
    exists (
      select 1 from chats c
      join profiles p on (p.id = c.company_id or p.id = c.freelancer_id)
      where c.id = chat_id and p.user_id = auth.uid()
    )
  );

-- =============================================
-- TABELA: payments
-- =============================================
create table payments (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid references jobs(id) on delete cascade not null unique,
  amount numeric(10,2) not null,
  fee numeric(10,2) not null,
  freelancer_amount numeric(10,2) not null,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'released', 'withdrawn')),
  abacatepay_id text,
  abacatepay_pix_code text,
  abacatepay_pix_qr text,
  paid_at timestamptz,
  released_at timestamptz,
  created_at timestamptz default now()
);

alter table payments enable row level security;

create policy "Empresa e freelancer veem pagamento do job" on payments
  for select using (
    exists (
      select 1 from jobs j
      join profiles p on (p.id = j.company_id or p.id = j.freelancer_id)
      where j.id = job_id and p.user_id = auth.uid()
    )
  );

-- =============================================
-- TABELA: withdrawals (saques do freelancer)
-- =============================================
create table withdrawals (
  id uuid primary key default uuid_generate_v4(),
  freelancer_id uuid references profiles(id) not null,
  amount numeric(10,2) not null check (amount > 0),
  pix_key text not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  abacatepay_transfer_id text,
  created_at timestamptz default now()
);

alter table withdrawals enable row level security;

create policy "Freelancer vê seus saques" on withdrawals
  for select using (
    exists (select 1 from profiles where id = freelancer_id and user_id = auth.uid())
  );

create policy "Freelancer solicita saque" on withdrawals
  for insert with check (
    exists (select 1 from profiles where id = freelancer_id and user_id = auth.uid())
  );

-- =============================================
-- TABELA: reviews (avaliações)
-- =============================================
create table reviews (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid references jobs(id) on delete cascade not null,
  reviewer_id uuid references profiles(id) not null,
  reviewee_id uuid references profiles(id) not null,
  stars integer not null check (stars between 1 and 5),
  comment text,
  created_at timestamptz default now(),
  unique(job_id, reviewer_id)
);

alter table reviews enable row level security;

create policy "Qualquer um pode ver avaliações" on reviews
  for select using (true);

create policy "Participante do job avalia" on reviews
  for insert with check (
    exists (select 1 from profiles where id = reviewer_id and user_id = auth.uid())
    and
    exists (
      select 1 from jobs j
      where j.id = job_id
        and j.status = 'completed'
        and (j.company_id = reviewer_id or j.freelancer_id = reviewer_id)
    )
  );

-- =============================================
-- FUNÇÃO: atualizar rating ao inserir review
-- =============================================
create or replace function update_profile_rating()
returns trigger as $$
begin
  update profiles
  set
    rating = (
      select round(avg(stars)::numeric, 2)
      from reviews
      where reviewee_id = new.reviewee_id
    ),
    rating_count = (
      select count(*)
      from reviews
      where reviewee_id = new.reviewee_id
    )
  where id = new.reviewee_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_review_insert
  after insert on reviews
  for each row execute function update_profile_rating();

-- =============================================
-- VIEW: jobs com tags (facilita queries)
-- =============================================
create or replace view jobs_with_tags as
select
  j.*,
  array_agg(t.name) filter (where t.name is not null) as tag_names,
  array_agg(t.slug) filter (where t.slug is not null) as tag_slugs
from jobs j
left join job_tags jt on jt.job_id = j.id
left join tags t on t.id = jt.tag_id
group by j.id;

-- =============================================
-- FUNÇÃO: freelancers compatíveis com um job
-- Retorna freelancers que têm pelo menos 1 tag em comum
-- =============================================
create or replace function get_matching_freelancers(p_job_id uuid)
returns table(profile_id uuid, match_count bigint) as $$
  select
    ut.profile_id,
    count(*) as match_count
  from user_tags ut
  join job_tags jt on jt.tag_id = ut.tag_id
  where jt.job_id = p_job_id
  group by ut.profile_id
  order by match_count desc;
$$ language sql security definer;
