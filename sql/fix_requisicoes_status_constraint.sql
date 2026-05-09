-- ============================================================
-- GM Desporto — Corrigir status da tabela requisicoes
-- Permite os estados usados no frontend:
-- pendente, aprovado, rejeitado, terminada, cancelada
-- ============================================================

ALTER TABLE public.requisicoes
  DROP CONSTRAINT IF EXISTS requisicoes_status_check;

ALTER TABLE public.requisicoes
  ADD CONSTRAINT requisicoes_status_check
  CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'terminada', 'cancelada'));
