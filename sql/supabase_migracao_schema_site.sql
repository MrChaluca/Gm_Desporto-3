-- ============================================================
-- GM Desporto — Migração BD para ficar de acordo com o site
-- Executar no Supabase (SQL Editor)
--
-- O site atualmente usa:
-- - Tabela: public.lista  (minúsculas)
-- - Coluna: lido boolean (para "Lido / Não lido")
-- - Status permitidos: listado / terminada / cancelada
-- - Frontend usa chave anon -> precisa de policies com RLS ligado
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 0) Garantir que a tabela se chama "lista" (minúsculas)
--    Se você renomeou no UI para "Lista", normalmente fica como "Lista" (com aspas).
--    O código do site usa from("lista").
-- ------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'Lista'
      AND c.relkind = 'r'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'lista'
      AND c.relkind = 'r'
  ) THEN
    ALTER TABLE public."Lista" RENAME TO lista;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 1) Coluna lido (Lido / Não lido)
-- ------------------------------------------------------------

ALTER TABLE IF EXISTS public.lista
  ADD COLUMN IF NOT EXISTS lido BOOLEAN NOT NULL DEFAULT false;

-- ------------------------------------------------------------
-- 2) Garantir defaults e CHECK do status (fluxo "listagem")
-- ------------------------------------------------------------

-- Remove check antigo (se existir com outro nome)
ALTER TABLE IF EXISTS public.lista
  DROP CONSTRAINT IF EXISTS requisicoes_status_check;

ALTER TABLE IF EXISTS public.lista
  DROP CONSTRAINT IF EXISTS lista_status_check;

ALTER TABLE IF EXISTS public.lista
  DROP CONSTRAINT IF EXISTS "Lista_status_check";

-- Define default coerente
ALTER TABLE IF EXISTS public.lista
  ALTER COLUMN status SET DEFAULT 'listado';

-- Adiciona check correto
ALTER TABLE IF EXISTS public.lista
  ADD CONSTRAINT lista_status_check
  CHECK (status IN ('listado', 'terminada', 'cancelada'));

-- ------------------------------------------------------------
-- 3) Índices úteis para performance
-- ------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_lista_pedido_em ON public.lista (pedido_em DESC);
CREATE INDEX IF NOT EXISTS idx_lista_prof_email ON public.lista (prof_email);
CREATE INDEX IF NOT EXISTS idx_lista_status ON public.lista (status);
CREATE INDEX IF NOT EXISTS idx_lista_lido ON public.lista (lido);

-- ------------------------------------------------------------
-- 4) RLS + Policies (anon) para o site funcionar
--    (se você já usa Auth de verdade, avisa que eu adapto)
-- ------------------------------------------------------------

ALTER TABLE IF EXISTS public.lista ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_lista" ON public.lista;
DROP POLICY IF EXISTS "anon_insert_lista" ON public.lista;
DROP POLICY IF EXISTS "anon_update_lista" ON public.lista;
DROP POLICY IF EXISTS "anon_delete_lista" ON public.lista;

CREATE POLICY "anon_select_lista"
  ON public.lista FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "anon_insert_lista"
  ON public.lista FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "anon_update_lista"
  ON public.lista FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "anon_delete_lista"
  ON public.lista FOR DELETE
  TO anon
  USING (true);

COMMIT;

