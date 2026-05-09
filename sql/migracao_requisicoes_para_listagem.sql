-- ============================================================
-- GM Desporto — Migracao de "Requisicoes" para "Listagem"
-- Executar no Supabase SQL Editor
-- ============================================================

BEGIN;

-- 1) Remove constraint antiga de status (se existir)
ALTER TABLE public.requisicoes
  DROP CONSTRAINT IF EXISTS requisicoes_status_check;

-- 2) Normaliza estados antigos para o novo fluxo sem aprovacao
-- pendente/aprovado -> listado
UPDATE public.requisicoes
SET status = 'listado'
WHERE status IN ('pendente', 'aprovado');

-- rejeitado -> cancelada (ja nao existe aprovacao do admin)
UPDATE public.requisicoes
SET status = 'cancelada'
WHERE status = 'rejeitado';

-- 3) Define default e nova regra de status
ALTER TABLE public.requisicoes
  ALTER COLUMN status SET DEFAULT 'listado';

ALTER TABLE public.requisicoes
  ADD CONSTRAINT requisicoes_status_check
  CHECK (status IN ('listado', 'terminada', 'cancelada'));

COMMIT;
