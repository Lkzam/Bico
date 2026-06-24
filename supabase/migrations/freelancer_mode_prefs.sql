-- ============================================================================
-- Preferência do freelancer: quais TIPOS de trabalho ele quer ver no feed.
-- Rodar no SQL Editor do Supabase.
--
-- Valores possíveis: 'fast' (rápido), 'proposal' (por propostas), 'contract'.
-- Default: os três. O freelancer pode desmarcar os que não tem interesse e
-- esses jobs deixam de aparecer/ notificar.
-- ============================================================================
alter table profiles
  add column if not exists job_mode_prefs text[]
  not null default array['fast','proposal','contract'];
