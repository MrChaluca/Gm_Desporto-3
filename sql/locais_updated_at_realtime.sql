-- Adiciona "updated_at" na tabela locais e atualiza automaticamente
-- Execute no Supabase SQL Editor

ALTER TABLE public.locais
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE public.locais
SET updated_at = COALESCE(updated_at, created_at, now());

CREATE OR REPLACE FUNCTION public.set_updated_at_locais()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_updated_at_locais ON public.locais;
CREATE TRIGGER trg_set_updated_at_locais
BEFORE UPDATE ON public.locais
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_locais();
