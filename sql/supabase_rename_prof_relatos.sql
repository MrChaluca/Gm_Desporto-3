-- ============================================================
-- GM Desporto — Renomear "reporter_*" -> "prof_*"
--            — Renomear tabela "relatados" -> "relatos"
-- Executar no Supabase (SQL Editor). Não perde dados.
-- ============================================================

BEGIN;

-- 1) Renomear colunas na tabela LISTA
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'lista'
      AND column_name = 'reporter_email'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'lista'
      AND column_name = 'prof_email'
  ) THEN
    EXECUTE 'ALTER TABLE public.lista RENAME COLUMN reporter_email TO prof_email';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'lista'
      AND column_name = 'reporter_role'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'lista'
      AND column_name = 'prof_role'
  ) THEN
    EXECUTE 'ALTER TABLE public.lista RENAME COLUMN reporter_role TO prof_role';
  END IF;
END $$;

-- (caso exista tabela com nome "Lista")
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Lista'
      AND column_name = 'reporter_email'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Lista'
      AND column_name = 'prof_email'
  ) THEN
    EXECUTE 'ALTER TABLE public."Lista" RENAME COLUMN reporter_email TO prof_email';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Lista'
      AND column_name = 'reporter_role'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Lista'
      AND column_name = 'prof_role'
  ) THEN
    EXECUTE 'ALTER TABLE public."Lista" RENAME COLUMN reporter_role TO prof_role';
  END IF;
END $$;

-- 2) Renomear tabela RELATADOS -> RELATOS
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'relatados'
      AND c.relkind = 'r'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'relatos'
      AND c.relkind = 'r'
  ) THEN
    EXECUTE 'ALTER TABLE public.relatados RENAME TO relatos';
  END IF;
END $$;

-- 3) Renomear colunas dentro de RELATOS
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'relatos'
      AND column_name = 'reporter_email'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'relatos'
      AND column_name = 'prof_email'
  ) THEN
    EXECUTE 'ALTER TABLE public.relatos RENAME COLUMN reporter_email TO prof_email';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'relatos'
      AND column_name = 'reporter_role'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'relatos'
      AND column_name = 'prof_role'
  ) THEN
    EXECUTE 'ALTER TABLE public.relatos RENAME COLUMN reporter_role TO prof_role';
  END IF;
END $$;

-- 4) Índices úteis (cria novos; não depende do nome antigo)
CREATE INDEX IF NOT EXISTS idx_lista_prof_email ON public.lista (prof_email);
CREATE INDEX IF NOT EXISTS idx_relatos_prof_email ON public.relatos (prof_email);

-- 5) RLS + Policies (permite o site com chave anon)
ALTER TABLE IF EXISTS public.lista ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.relatos ENABLE ROW LEVEL SECURITY;

-- LISTA policies
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

-- RELATOS policies
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

COMMIT;

