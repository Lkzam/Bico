-- Migration: adiciona motivo de cancelamento e metadata nas notificações
-- Execute no SQL Editor do Supabase

-- 1. Campo cancel_reason na tabela de logs de cancelamento
ALTER TABLE cancelled_job_logs
  ADD COLUMN IF NOT EXISTS cancel_reason text;

-- 2. Campo metadata (jsonb) nas notificações para dados estruturados
--    (motivo cancelamento, quem cancelou, título do job, etc.)
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS metadata jsonb;
