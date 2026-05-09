-- ============================================================
-- GM Desporto — Tabela MANUTENÇÃO (unidades em manutenção por equipamento)
-- Correr no Supabase: SQL Editor → New query → Run
-- O site usa UMA linha por equipamento (equipamento_id único).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.manutencao (
  id               BIGSERIAL PRIMARY KEY,
  equipamento_id   INT NOT NULL
    CONSTRAINT fk_manutencao_equipamento
      REFERENCES public.equipamentos (id)
      ON UPDATE CASCADE
      ON DELETE CASCADE,
  quantidade       INT NOT NULL CHECK (quantidade > 0),
  CONSTRAINT uq_manutencao_equipamento UNIQUE (equipamento_id)
);

COMMENT ON TABLE public.manutencao IS
  'Quantidade em manutenção por equipamento. Se quantidade passar a 0, o site apaga a linha.';

CREATE INDEX IF NOT EXISTS idx_manutencao_equipamento ON public.manutencao (equipamento_id);

-- RLS (chave anon — admin altera; professores só leem no inventário)
ALTER TABLE public.manutencao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_manutencao" ON public.manutencao;
DROP POLICY IF EXISTS "anon_insert_manutencao" ON public.manutencao;
DROP POLICY IF EXISTS "anon_update_manutencao" ON public.manutencao;
DROP POLICY IF EXISTS "anon_delete_manutencao" ON public.manutencao;
DROP POLICY IF EXISTS "anon_all_manutencao" ON public.manutencao;

-- Opção A: políticas separadas (mais explícito)
CREATE POLICY "anon_select_manutencao"
  ON public.manutencao FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "anon_insert_manutencao"
  ON public.manutencao FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "anon_update_manutencao"
  ON public.manutencao FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "anon_delete_manutencao"
  ON public.manutencao FOR DELETE
  TO anon
  USING (true);
