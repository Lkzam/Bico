-- Tabela de pagamentos PIX
create table if not exists payments (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid not null references jobs(id) on delete cascade,
  txid          text not null unique,
  status        text not null default 'pending', -- pending | paid | expired
  job_value     numeric(10,2) not null,   -- valor original do trabalho
  total_value   numeric(10,2) not null,   -- valor que a empresa paga (com taxa)
  qrcode        text,                     -- copia e cola PIX
  qrcode_image  text,                     -- base64 PNG do QR code
  pix_end_to_end text,                    -- id da transação Efí
  paid_at       timestamptz,
  created_at    timestamptz default now()
);

-- RLS: só o sistema (service role) acessa
alter table payments enable row level security;

-- Adiciona coluna completed_at na tabela jobs se não existir
alter table jobs add column if not exists completed_at timestamptz;
