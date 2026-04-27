-- ============================================================
-- MIGRAÇÃO: Cancelamento de jobs + notificações
-- Execute no Supabase SQL Editor
-- ============================================================

-- 1. Tabela de log de jobs cancelados (arquivo de conversas)
CREATE TABLE IF NOT EXISTS cancelled_job_logs (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_job_id  uuid NOT NULL,
  job_title        text NOT NULL,
  job_value        numeric(10,2),
  company_id       uuid REFERENCES profiles(id) ON DELETE SET NULL,
  freelancer_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  cancelled_by     text NOT NULL CHECK (cancelled_by IN ('company', 'freelancer')),
  cancelled_by_name text,
  messages         jsonb DEFAULT '[]',
  cancelled_at     timestamptz DEFAULT now()
);

-- Apenas o service role acessa (análise interna dos devs)
ALTER TABLE cancelled_job_logs ENABLE ROW LEVEL SECURITY;

-- 2. Tabela de notificações em tempo real
CREATE TABLE IF NOT EXISTS notifications (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title      text NOT NULL,
  body       text NOT NULL,
  read       boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuário vê suas notificações" ON notifications;
CREATE POLICY "Usuário vê suas notificações" ON notifications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = profile_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Usuário atualiza suas notificações" ON notifications;
CREATE POLICY "Usuário atualiza suas notificações" ON notifications
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = profile_id AND user_id = auth.uid())
  );

-- 3. Habilitar Realtime para a tabela notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
