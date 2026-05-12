-- Este script irá limpar a tabela equipamentos para a colocar de acordo com o site,
-- removendo colunas não usadas e a restrição fixa dos locais.

-- 1. Remover Foreign Keys que já não são usadas na tabela equipamentos
ALTER TABLE public.equipamentos DROP CONSTRAINT IF EXISTS equipamentos_categoria_id_fkey;
ALTER TABLE public.equipamentos DROP CONSTRAINT IF EXISTS equipamentos_escola_id_fkey;

-- 2. Remover colunas redundantes e não utilizadas do site
ALTER TABLE public.equipamentos
  DROP COLUMN IF EXISTS nome,
  DROP COLUMN IF EXISTS marca,
  DROP COLUMN IF EXISTS localizacao,
  DROP COLUMN IF EXISTS estado,
  DROP COLUMN IF EXISTS data_aquisicao,
  DROP COLUMN IF EXISTS categoria_id,
  DROP COLUMN IF EXISTS escola_id;

-- 3. Remover a tabela 'categoria' (já que o site não usa categorias)
DROP TABLE IF EXISTS public.categoria CASCADE;

-- 4. Remover o CHECK constraint da coluna 'local' na tabela equipamentos
-- Isto permite que o site grave qualquer local (criado dinamicamente na página de Locais)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.equipamentos'::regclass
        AND pg_get_constraintdef(oid) LIKE '%local::text = ANY%'
    ) LOOP
        EXECUTE 'ALTER TABLE public.equipamentos DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;
