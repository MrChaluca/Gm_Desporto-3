-- ============================================================
-- GM Desporto — Tabelas MEMBROS e SOLICITACOES_REGISTO
-- Correr no Supabase: SQL Editor → New query → Run
-- ============================================================

-- Tabela para membros registados
CREATE TABLE IF NOT EXISTS public.membros (
  id                          BIGSERIAL PRIMARY KEY,
  nome                        VARCHAR(255) NOT NULL,
  email                       VARCHAR(255) NOT NULL UNIQUE,
  role                        VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'professor')),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.membros IS 'Membros registados no sistema GM Desporto.';
COMMENT ON COLUMN public.membros.nome IS 'Nome do membro (obrigatório)';
COMMENT ON COLUMN public.membros.email IS 'Email único do membro (obrigatório)';
COMMENT ON COLUMN public.membros.role IS 'Função: admin ou professor (obrigatório)';

CREATE INDEX IF NOT EXISTS idx_membros_email ON public.membros (email);
CREATE INDEX IF NOT EXISTS idx_membros_role ON public.membros (role);

-- Tabela para solicitações de registo pendentes
CREATE TABLE IF NOT EXISTS public.solicitacoes_registo (
  id                          BIGSERIAL PRIMARY KEY,
  nome                        VARCHAR(255) NOT NULL,
  email                       VARCHAR(255) NOT NULL,
  role                        VARCHAR(50) DEFAULT 'professor' CHECK (role IN ('admin', 'professor')),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.solicitacoes_registo IS 'Solicitações de registo pendentes para aprovação.';
COMMENT ON COLUMN public.solicitacoes_registo.nome IS 'Nome do solicitante (obrigatório)';
COMMENT ON COLUMN public.solicitacoes_registo.email IS 'Email do solicitante (obrigatório)';
COMMENT ON COLUMN public.solicitacoes_registo.role IS 'Função solicitada: admin ou professor (default professor)';

CREATE INDEX IF NOT EXISTS idx_solicitacoes_email ON public.solicitacoes_registo (email);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_created_at ON public.solicitacoes_registo (created_at);

-- RLS (Row Level Security)
ALTER TABLE public.membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacoes_registo ENABLE ROW LEVEL SECURITY;

-- Políticas para membros (apenas admin pode gerir)
DROP POLICY IF EXISTS "anon_select_membros" ON public.membros;
DROP POLICY IF EXISTS "anon_insert_membros" ON public.membros;
DROP POLICY IF EXISTS "anon_update_membros" ON public.membros;
DROP POLICY IF EXISTS "anon_delete_membros" ON public.membros;

CREATE POLICY "anon_select_membros"
  ON public.membros FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "anon_insert_membros"
  ON public.membros FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "anon_update_membros"
  ON public.membros FOR UPDATE
  TO anon
  USING (true);

CREATE POLICY "anon_delete_membros"
  ON public.membros FOR DELETE
  TO anon
  USING (true);

-- Políticas para solicitações (qualquer um pode inserir, admin pode ver/apagar)
DROP POLICY IF EXISTS "anon_select_solicitacoes" ON public.solicitacoes_registo;
DROP POLICY IF EXISTS "anon_insert_solicitacoes" ON public.solicitacoes_registo;
DROP POLICY IF EXISTS "anon_update_solicitacoes" ON public.solicitacoes_registo;
DROP POLICY IF EXISTS "anon_delete_solicitacoes" ON public.solicitacoes_registo;

CREATE POLICY "anon_select_solicitacoes"
  ON public.solicitacoes_registo FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "anon_insert_solicitacoes"
  ON public.solicitacoes_registo FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "anon_update_solicitacoes"
  ON public.solicitacoes_registo FOR UPDATE
  TO anon
  USING (true);

CREATE POLICY "anon_delete_solicitacoes"
  ON public.solicitacoes_registo FOR DELETE
  TO anon
  USING (true);