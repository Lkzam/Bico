-- Adiciona timestamp de aceite dos Termos de Serviço no perfil
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;
