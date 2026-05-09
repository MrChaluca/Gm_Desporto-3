-- ============================================================
-- GM Desporto — Tabela REQUISIÇÕES (uso de equipamentos)
-- Correr no Supabase: SQL Editor → New query → Run
-- ============================================================

CREATE TABLE IF NOT EXISTS public.requisicoes (
  id               BIGSERIAL PRIMARY KEY,
  equipamento_id  INT NOT NULL
    CONSTRAINT fk_requisicoes_equipamento
      REFERENCES public.equipamentos (id)
      ON UPDATE CASCADE
      ON DELETE RESTRICT,
  quantidade      INT NOT NULL CHECK (quantidade > 0),
  tempo_utilizacao INT NOT NULL CHECK (tempo_utilizacao IN (45, 90)),
  descricao       TEXT,
  pedido_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  status          VARCHAR(20) NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  reporter_email  VARCHAR(200) NOT NULL,
  reporter_role   VARCHAR(30)  NOT NULL DEFAULT 'professor'
);

CREATE INDEX IF NOT EXISTS idx_requisicoes_pedido_em ON public.requisicoes (pedido_em DESC);
CREATE INDEX IF NOT EXISTS idx_requisicoes_status ON public.requisicoes (status);
CREATE INDEX IF NOT EXISTS idx_requisicoes_reporter_email ON public.requisicoes (reporter_email);

ALTER TABLE public.requisicoes ENABLE ROW LEVEL SECURITY;

-- Políticas DEV (chave anon no frontend). Ajusta depois se fizeres Auth real.
DROP POLICY IF EXISTS "anon_select_requisicoes" ON public.requisicoes;
DROP POLICY IF EXISTS "anon_insert_requisicoes" ON public.requisicoes;
DROP POLICY IF EXISTS "anon_update_requisicoes" ON public.requisicoes;
DROP POLICY IF EXISTS "anon_delete_requisicoes" ON public.requisicoes;

CREATE POLICY "anon_select_requisicoes"
  ON public.requisicoes FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "anon_insert_requisicoes"
  ON public.requisicoes FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "anon_update_requisicoes"
  ON public.requisicoes FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "anon_delete_requisicoes"
  ON public.requisicoes FOR DELETE
  TO anon
  USING (true);

