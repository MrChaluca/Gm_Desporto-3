-- Criar a tabela usada pelo Histórico de ações sem apagar dados existentes.
-- Correr no Supabase: SQL Editor -> colar -> Run.

CREATE TABLE IF NOT EXISTS public.historico_acoes (
  id          BIGSERIAL PRIMARY KEY,
  client_id   TEXT UNIQUE,
  nome_item   TEXT NOT NULL DEFAULT 'Admin',
  acao        TEXT NOT NULL,
  detalhes    TEXT,
  admin_email VARCHAR(320),
  data_hora   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_historico_acoes_data
ON public.historico_acoes (data_hora DESC);

ALTER TABLE public.historico_acoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS anon_all_historico_acoes ON public.historico_acoes;
CREATE POLICY anon_all_historico_acoes
ON public.historico_acoes
FOR ALL TO anon
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS auth_all_historico_acoes ON public.historico_acoes;
CREATE POLICY auth_all_historico_acoes
ON public.historico_acoes
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

GRANT ALL ON public.historico_acoes TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
