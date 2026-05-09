-- GM Desporto — políticas RLS para o site (cliente com chave ANON)
-- Corre isto no Supabase: SQL Editor → New query → Run
--
-- IMPORTANTE: Isto permite leitura pública (anon) às tabelas indicadas.
-- Para produção com segurança real, usa autenticação Supabase e policies por role.

-- 1) Ativar RLS (se ainda não estiver)
ALTER TABLE public.equipamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manutencao ENABLE ROW LEVEL SECURITY;

-- 2) Remover policies antigas com o mesmo nome (ignora erro se não existirem)
DROP POLICY IF EXISTS "anon_select_equipamentos" ON public.equipamentos;
DROP POLICY IF EXISTS "anon_select_categoria" ON public.categoria;
DROP POLICY IF EXISTS "anon_select_manutencao" ON public.manutencao;

-- 3) SELECT para o papel anon (o que o browser usa com a chave pública)
CREATE POLICY "anon_select_equipamentos"
  ON public.equipamentos FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "anon_select_categoria"
  ON public.categoria FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "anon_select_manutencao"
  ON public.manutencao FOR SELECT
  TO anon
  USING (true);

-- 4) Se o Admin grava dados com a mesma chave anon no browser, também precisas de:
-- (Ajusta conforme a tua política de segurança; isto é só para desenvolvimento.)
DROP POLICY IF EXISTS "anon_all_equipamentos" ON public.equipamentos;
DROP POLICY IF EXISTS "anon_all_manutencao" ON public.manutencao;

CREATE POLICY "anon_all_equipamentos"
  ON public.equipamentos FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "anon_all_manutencao"
  ON public.manutencao FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- 5) Tabela relatos (após criar/migrar)
ALTER TABLE public.relatos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_relatos" ON public.relatos;
DROP POLICY IF EXISTS "anon_insert_relatos" ON public.relatos;
CREATE POLICY "anon_select_relatos"
  ON public.relatos FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_relatos"
  ON public.relatos FOR INSERT TO anon WITH CHECK (true);

-- 6) Garantir que o Admin (frontend com chave anon) consegue alterar stock
-- Se não quiseres FOR ALL, usa estas policies separadas em equipamentos:
DROP POLICY IF EXISTS "anon_update_equipamentos" ON public.equipamentos;
DROP POLICY IF EXISTS "anon_insert_equipamentos" ON public.equipamentos;
DROP POLICY IF EXISTS "anon_delete_equipamentos" ON public.equipamentos;

CREATE POLICY "anon_insert_equipamentos"
  ON public.equipamentos FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "anon_update_equipamentos"
  ON public.equipamentos FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "anon_delete_equipamentos"
  ON public.equipamentos FOR DELETE TO anon
  USING (true);
