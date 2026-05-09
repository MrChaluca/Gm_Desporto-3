-- ============================================================
-- GM Desporto — Adicionar "lido" à tabela Lista
-- Executar no Supabase SQL Editor
-- ============================================================

ALTER TABLE public."Lista"
  ADD COLUMN IF NOT EXISTS lido BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_lista_lido ON public."Lista"(lido);
CREATE INDEX IF NOT EXISTS idx_lista_prof_email ON public."Lista"(prof_email);
