-- ============================================================
-- MIGRAÇÃO: Novas tags + tabela de sugestões de tags
-- Execute no Supabase SQL Editor
-- ============================================================

-- 1. Garante constraint única no slug (necessária para ON CONFLICT)
ALTER TABLE tags ADD CONSTRAINT IF NOT EXISTS tags_slug_unique UNIQUE (slug);

-- 2. Insere novas tags (ignora se já existir)
INSERT INTO tags (name, slug) VALUES
  -- Tecnologia / Dev
  ('Copywriting', 'copywriting'),
  ('UX / UI Design', 'ux-ui-design'),
  ('Tráfego Pago / Ads', 'trafego-pago'),
  ('Branding / Identidade Visual', 'branding'),
  ('Email Marketing', 'email-marketing'),
  ('WordPress', 'wordpress'),
  ('E-commerce', 'ecommerce'),
  ('Inteligência Artificial', 'ia'),
  ('DevOps / Cloud', 'devops-cloud'),
  ('Banco de Dados', 'banco-de-dados'),
  ('QA / Testes de Software', 'qa-testes'),
  ('Segurança Digital', 'seguranca-digital'),
  ('Modelagem 3D', 'modelagem-3d'),
  ('Impressão 3D', 'impressao-3d'),
  ('Motion Graphics', 'motion-graphics'),
  ('Edição de Foto', 'edicao-foto'),
  -- Áudio / Voz
  ('Narração / Locução', 'narracao-locucao'),
  ('Legendagem / Transcrição', 'legendagem'),
  ('Dublagem', 'dublagem'),
  ('Podcast', 'podcast'),
  ('DJ / Sonorização', 'dj-sonorizacao'),
  -- Escrita
  ('Revisão de Texto', 'revisao-texto'),
  ('Roteiro de Vídeo', 'roteiro-video'),
  ('Ghostwriting', 'ghostwriting'),
  ('Pesquisa Acadêmica', 'pesquisa-academica'),
  -- Educação
  ('Aulas Particulares', 'aulas-particulares'),
  ('Idiomas / Inglês', 'idiomas-ingles'),
  ('Treinamento Corporativo', 'treinamento-corporativo'),
  ('Pedagogia / EAD', 'pedagogia-ead'),
  -- Negócios / Admin
  ('Assistente Virtual', 'assistente-virtual'),
  ('Atendimento ao Cliente', 'atendimento-cliente'),
  ('Consultoria de Negócios', 'consultoria-negocios'),
  ('Recursos Humanos / RH', 'rh'),
  ('Contabilidade / Fiscal', 'contabilidade'),
  ('Jurídico / Contratos', 'juridico'),
  ('Pesquisa de Mercado', 'pesquisa-mercado'),
  ('Finanças / Investimentos', 'financas'),
  ('Logística / Supply Chain', 'logistica'),
  ('Secretariado', 'secretariado'),
  -- Marketing / Conteúdo
  ('Criação de Conteúdo', 'criacao-conteudo'),
  ('Influencer / UGC', 'influencer-ugc'),
  ('Relações Públicas / PR', 'relacoes-publicas'),
  ('Produção de Eventos', 'producao-eventos'),
  ('Cerimonial de Casamento', 'cerimonial'),
  -- Design / Arte
  ('Moda / Estilismo', 'moda-estilismo'),
  ('Design de Interiores', 'design-interiores'),
  ('Arquitetura', 'arquitetura'),
  ('Arte Digital', 'arte-digital'),
  ('Pintura / Artes Plásticas', 'pintura'),
  ('Artesanato / Handmade', 'artesanato'),
  -- Fotografia especializada
  ('Fotografia de Produto', 'foto-produto'),
  ('Fotografia de Eventos', 'foto-eventos'),
  ('Fotografia Imobiliária', 'foto-imobiliaria'),
  -- Saúde / Bem-estar
  ('Personal Trainer', 'personal-trainer'),
  ('Nutrição / Dietas', 'nutricao'),
  ('Psicologia / Coaching', 'psicologia-coaching'),
  -- Serviços presenciais
  ('Eletricista', 'eletricista'),
  ('Encanador / Hidráulica', 'encanador'),
  ('Pintura de Imóveis', 'pintura-imoveis'),
  ('Marcenaria / Móveis', 'marcenaria'),
  ('Manutenção Geral', 'manutencao-geral'),
  ('Jardinagem / Paisagismo', 'jardinagem'),
  ('Limpeza Profissional', 'limpeza'),
  ('Montagem de Móveis', 'montagem-moveis'),
  ('Transporte / Frete', 'transporte-frete'),
  ('Reformas / Construção', 'reformas')
ON CONFLICT (slug) DO NOTHING;


-- 3. Tabela para sugestões de tags enviadas pelos usuários
CREATE TABLE IF NOT EXISTS tag_suggestions (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  tag_name    text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE tag_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuário pode sugerir tag" ON tag_suggestions;
CREATE POLICY "Usuário pode sugerir tag" ON tag_suggestions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = profile_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Usuário vê suas próprias sugestões" ON tag_suggestions;
CREATE POLICY "Usuário vê suas próprias sugestões" ON tag_suggestions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = profile_id AND user_id = auth.uid())
  );
