-- ============================================================
-- GM Desporto — Tabela REQUISIÇÕES (atualizada)
-- Correr no Supabase: SQL Editor → New query → Run
-- ============================================================

CREATE TABLE IF NOT EXISTS public.locais (
  id          BIGSERIAL PRIMARY KEY,
  nome        VARCHAR(50) NOT NULL UNIQUE,
  descricao   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.estados (
  id          BIGSERIAL PRIMARY KEY,
  nome        VARCHAR(50) NOT NULL UNIQUE,
  descricao   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.requisicoes (
  id              BIGSERIAL PRIMARY KEY,
  equipamento_id  INT NOT NULL
    CONSTRAINT fk_requisicoes_equipamento
      REFERENCES public.equipamentos (id)
      ON UPDATE CASCADE
      ON DELETE RESTRICT,
  local_id        BIGINT NOT NULL
    CONSTRAINT fk_requisicoes_local
      REFERENCES public.locais (id)
      ON UPDATE CASCADE
      ON DELETE RESTRICT,
  estado_id       BIGINT
    CONSTRAINT fk_requisicoes_estado
      REFERENCES public.estados (id)
      ON UPDATE CASCADE
      ON DELETE SET NULL,
  quantidade      INT NOT NULL CHECK (quantidade > 0),
  descricao       TEXT,
  pedido_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  status          VARCHAR(20) NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  reporter_email  VARCHAR(200) NOT NULL,
  reporter_role   VARCHAR(30)  NOT NULL DEFAULT 'professor',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.requisicoes IS 'Requisições de equipamentos pelos professores.';
COMMENT ON COLUMN public.requisicoes.local_id IS 'Referência para a tabela locais (Arr1, G1, G2).';
COMMENT ON COLUMN public.requisicoes.estado_id IS 'Referência para a tabela estados (Bom, Mau, Razoável, Abate).';

CREATE INDEX IF NOT EXISTS idx_requisicoes_pedido_em ON public.requisicoes (pedido_em DESC);
CREATE INDEX IF NOT EXISTS idx_requisicoes_status ON public.requisicoes (status);
CREATE INDEX IF NOT EXISTS idx_requisicoes_reporter_email ON public.requisicoes (reporter_email);
CREATE INDEX IF NOT EXISTS idx_requisicoes_equipamento ON public.requisicoes (equipamento_id);
CREATE INDEX IF NOT EXISTS idx_requisicoes_local ON public.requisicoes (local_id);
CREATE INDEX IF NOT EXISTS idx_requisicoes_estado ON public.requisicoes (estado_id);

ALTER TABLE public.requisicoes ENABLE ROW LEVEL SECURITY;

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
