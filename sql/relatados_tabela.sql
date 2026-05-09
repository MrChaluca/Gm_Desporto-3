-- ============================================================
-- GM Desporto — Tabela RELATADOS (relatos de professores)
-- Correr no Supabase: SQL Editor → New query → Run
-- ============================================================

CREATE TABLE IF NOT EXISTS public.relatos (
  id              BIGSERIAL PRIMARY KEY,
  equipamento_id  INT NULL
    CONSTRAINT fk_relatos_equipamento
      REFERENCES public.equipamentos (id)
      ON UPDATE CASCADE
      ON DELETE SET NULL,
  nome_equipamento VARCHAR(200) NOT NULL,
  tipo_ocorrencia  VARCHAR(50)  NOT NULL,
  quantidade       INT          NOT NULL CHECK (quantidade > 0),
  descricao        TEXT,
  prof_email       VARCHAR(200),
  prof_role        VARCHAR(30),
  status           VARCHAR(20) NOT NULL DEFAULT 'nao_visto',
  admin_hidden     BOOLEAN NOT NULL DEFAULT false,
  data_hora        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE public.relatos
  ADD COLUMN IF NOT EXISTS prof_email VARCHAR(200);
ALTER TABLE public.relatos
  ADD COLUMN IF NOT EXISTS prof_role VARCHAR(30);
ALTER TABLE public.relatos
  ADD COLUMN IF NOT EXISTS status VARCHAR(20);
ALTER TABLE public.relatos
  ADD COLUMN IF NOT EXISTS admin_hidden BOOLEAN;

-- defaults para colunas adicionadas por ALTER
ALTER TABLE public.relatos
  ALTER COLUMN status SET DEFAULT 'nao_visto';
ALTER TABLE public.relatos
  ALTER COLUMN admin_hidden SET DEFAULT false;

UPDATE public.relatos
SET status = COALESCE(status, 'nao_visto'),
    admin_hidden = COALESCE(admin_hidden, false);

COMMENT ON TABLE public.relatos IS 'Relatos enviados pelos professores (danificado, desaparecido, outro).';
COMMENT ON COLUMN public.relatos.tipo_ocorrencia IS 'Valores típicos: danificado, desaparecido, outro';

CREATE INDEX IF NOT EXISTS idx_relatos_data_hora ON public.relatos (data_hora DESC);
CREATE INDEX IF NOT EXISTS idx_relatos_equipamento ON public.relatos (equipamento_id);
CREATE INDEX IF NOT EXISTS idx_relatos_prof_email ON public.relatos (prof_email);
CREATE INDEX IF NOT EXISTS idx_relatos_status ON public.relatos (status);
CREATE INDEX IF NOT EXISTS idx_relatos_admin_hidden ON public.relatos (admin_hidden);

-- RLS (ajusta à tua política; exemplo permissivo para o site com chave anon)
ALTER TABLE public.relatos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_relatos" ON public.relatos;
DROP POLICY IF EXISTS "anon_insert_relatos" ON public.relatos;
DROP POLICY IF EXISTS "anon_update_relatos" ON public.relatos;

CREATE POLICY "anon_select_relatos"
  ON public.relatos FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "anon_insert_relatos"
  ON public.relatos FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "anon_update_relatos"
  ON public.relatos FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
