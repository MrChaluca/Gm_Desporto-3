-- ============================================================
-- GM Desporto — Tabelas LOOKUP (Locais, Estados)
-- Correr no Supabase: SQL Editor → New query → Run
-- ============================================================

-- Tabela de Locais
CREATE TABLE IF NOT EXISTS public.locais (
  id          BIGSERIAL PRIMARY KEY,
  nome        VARCHAR(50) NOT NULL UNIQUE,
  descricao   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.locais IS 'Locais/espaços da GM Desporto: Arr1, G1, G2, etc.';

-- Dados iniciais de Locais
INSERT INTO public.locais (nome, descricao)
VALUES 
  ('Arr1', 'Armazém 1'),
  ('G1', 'Ginásio 1'),
  ('G2', 'Ginásio 2')
ON CONFLICT (nome) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_locais_nome ON public.locais (nome);

CREATE OR REPLACE FUNCTION public.set_updated_at_locais()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_updated_at_locais ON public.locais;
CREATE TRIGGER trg_set_updated_at_locais
BEFORE UPDATE ON public.locais
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_locais();

-- Tabela de Estados
CREATE TABLE IF NOT EXISTS public.estados (
  id          BIGSERIAL PRIMARY KEY,
  nome        VARCHAR(50) NOT NULL UNIQUE,
  descricao   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.estados IS 'Estados dos equipamentos: Bom, Mau, Razoável, Abate, etc.';

-- Dados iniciais de Estados
INSERT INTO public.estados (nome, descricao)
VALUES 
  ('Bom', 'Equipamento em bom estado'),
  ('Mau', 'Equipamento danificado'),
  ('Razoável', 'Equipamento em razoável estado'),
  ('Abate', 'Equipamento marcado para abate')
ON CONFLICT (nome) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_estados_nome ON public.estados (nome);

-- RLS para Locais
ALTER TABLE public.locais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_locais" ON public.locais;
DROP POLICY IF EXISTS "anon_insert_locais" ON public.locais;

CREATE POLICY "anon_select_locais"
  ON public.locais FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "anon_insert_locais"
  ON public.locais FOR INSERT
  TO anon
  WITH CHECK (true);

-- RLS para Estados
ALTER TABLE public.estados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_estados" ON public.estados;
DROP POLICY IF EXISTS "anon_insert_estados" ON public.estados;

CREATE POLICY "anon_select_estados"
  ON public.estados FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "anon_insert_estados"
  ON public.estados FOR INSERT
  TO anon
  WITH CHECK (true);
