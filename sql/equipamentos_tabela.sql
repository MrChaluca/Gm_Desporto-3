-- ============================================================
-- GM Desporto — Tabela EQUIPAMENTOS (nova estrutura)
-- Correr no Supabase: SQL Editor → New query → Run
-- ============================================================

CREATE TABLE IF NOT EXISTS public.equipamentos (
  id                          BIGSERIAL PRIMARY KEY,
  edf_de                      VARCHAR(10) NOT NULL CHECK (edf_de IN ('EDF', 'DE')),
  descricao                   VARCHAR(255) NOT NULL,
  quantidade                  INT NOT NULL CHECK (quantidade > 0),
  stock                       INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  empresa_data               TEXT,
  estado                      VARCHAR(50),
  local                       VARCHAR(50) NOT NULL CHECK (local IN ('Arr1', 'G1', 'G2')),
  observacao                  TEXT,
  outras_observacao           TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.equipamentos IS 'Equipamentos da GM Desporto com campos obrigatórios e opcionais.';
COMMENT ON COLUMN public.equipamentos.edf_de IS 'Partence a EDF ou DE (obrigatório)';
COMMENT ON COLUMN public.equipamentos.descricao IS 'Descrição do equipamento (obrigatório)';
COMMENT ON COLUMN public.equipamentos.quantidade IS 'Quantidade total (obrigatório)';
COMMENT ON COLUMN public.equipamentos.stock IS 'Stock disponível (default 0 se não preenchido)';
COMMENT ON COLUMN public.equipamentos.local IS 'Localização: Arr1, G1 ou G2 (obrigatório)';
COMMENT ON COLUMN public.equipamentos.empresa_data IS 'Empresa/Data do equipamento como anotação livre; pode ser usada como descrição adicional.';
COMMENT ON COLUMN public.equipamentos.observacao IS 'Observações (opcional)';

CREATE INDEX IF NOT EXISTS idx_equipamentos_local ON public.equipamentos (local);
CREATE INDEX IF NOT EXISTS idx_equipamentos_edf_de ON public.equipamentos (edf_de);

-- RLS (Row Level Security) - opcional, ajusta conforme necessário
ALTER TABLE public.equipamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_equipamentos" ON public.equipamentos;
DROP POLICY IF EXISTS "anon_insert_equipamentos" ON public.equipamentos;
DROP POLICY IF EXISTS "anon_update_equipamentos" ON public.equipamentos;
DROP POLICY IF EXISTS "anon_delete_equipamentos" ON public.equipamentos;

CREATE POLICY "anon_select_equipamentos"
  ON public.equipamentos FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "anon_insert_equipamentos"
  ON public.equipamentos FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "anon_update_equipamentos"
  ON public.equipamentos FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "anon_delete_equipamentos"
  ON public.equipamentos FOR DELETE
  TO anon
  USING (true);
