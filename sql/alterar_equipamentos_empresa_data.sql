-- ============================================================
-- GM Desporto — Alteração da tabela equipamentos
-- Remove os campos empresa e data_adicao e adiciona empresa_data.
-- Correr no Supabase: SQL Editor → New query → Run
-- ============================================================

ALTER TABLE public.equipamentos
  ADD COLUMN IF NOT EXISTS empresa_data TEXT;

ALTER TABLE public.equipamentos
  DROP COLUMN IF EXISTS empresa;

ALTER TABLE public.equipamentos
  DROP COLUMN IF EXISTS data_adicao;

DROP INDEX IF EXISTS idx_equipamentos_data_adicao;

COMMENT ON COLUMN public.equipamentos.empresa_data IS 'Empresa/Data do equipamento como anotação livre; pode ser usada como descrição adicional.';
