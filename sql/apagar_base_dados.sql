-- ============================================================
-- ⚠️  AVISO: ISTO VAI APAGAR TODA A BASE DE DADOS! ⚠️
-- ============================================================
-- Este script elimina PERMANENTEMENTE todas as tabelas.
-- NÃO HÁ UNDO - Certifique-se que tem uma cópia de segurança!
-- ============================================================

-- Desabilitar verificações de chaves estrangeiras temporariamente
SET session_replication_role = 'replica';

-- Eliminar todas as tabelas em ordem de dependência
DROP TABLE IF EXISTS public.manutencao CASCADE;
DROP TABLE IF EXISTS public.requisicoes CASCADE;
DROP TABLE IF EXISTS public.relatos CASCADE;
DROP TABLE IF EXISTS public.equipamentos CASCADE;
DROP TABLE IF EXISTS public.estados CASCADE;
DROP TABLE IF EXISTS public.locais CASCADE;
DROP TABLE IF EXISTS public.categoria CASCADE;

-- Reabilitar verificações de chaves estrangeiras
SET session_replication_role = 'origin';

-- ============================================================
-- Se quiser apagar TUDO incluindo dados de autenticação:
-- ============================================================
-- Ir a Supabase Console → Settings → Database
-- Clicar em "Reset Database" (mais seguro que SQL)
-- ou
-- Ir a Supabase Console → SQL Editor → Database → Reset

-- Para apagar tabelas individuais:
-- DROP TABLE IF EXISTS public.nome_tabela CASCADE;
