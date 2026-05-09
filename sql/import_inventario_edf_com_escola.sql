-- ============================================================
-- INVENTARIO EDF — Import completo para Supabase / PostgreSQL
-- Baseado no inventario real e com tabela escola dedicada
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 0) TABELA ESCOLA (nova)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.escola (
  id BIGSERIAL PRIMARY KEY,
  sigla VARCHAR(10) NOT NULL UNIQUE,
  nome VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.escola (sigla, nome) VALUES
  ('GM', 'Escola GM'),
  ('MR', 'Escola MR')
ON CONFLICT (sigla) DO NOTHING;

-- ------------------------------------------------------------
-- 1) CATEGORIA (caso ainda nao exista)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categoria (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(120) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 2) AJUSTES EM EQUIPAMENTOS
-- ------------------------------------------------------------
ALTER TABLE public.equipamentos
  DROP CONSTRAINT IF EXISTS equipamentos_local_check;

ALTER TABLE public.equipamentos
  ADD CONSTRAINT equipamentos_local_check
  CHECK (
    local::text = ANY (
      ARRAY[
        'Arr1','Arr2','Arr1 Cx','Arm2','Arm3','Arm5','Arm6',
        'C3X3','CAnd','Ext','Sala CF','WC','G1','G2','Gabinete'
      ]::text[]
    )
  );

ALTER TABLE public.equipamentos
  ADD COLUMN IF NOT EXISTS escola VARCHAR(10);

ALTER TABLE public.equipamentos
  DROP CONSTRAINT IF EXISTS equipamentos_escola_check;

ALTER TABLE public.equipamentos
  ADD CONSTRAINT equipamentos_escola_check
  CHECK (
    escola IS NULL
    OR escola::text = ANY (ARRAY['GM','MR']::text[])
  );

ALTER TABLE public.equipamentos
  ADD COLUMN IF NOT EXISTS escola_id BIGINT;

ALTER TABLE public.equipamentos
  ADD COLUMN IF NOT EXISTS estado_bom INT,
  ADD COLUMN IF NOT EXISTS estado_razoavel INT,
  ADD COLUMN IF NOT EXISTS estado_mau INT,
  ADD COLUMN IF NOT EXISTS estado_abate INT;

ALTER TABLE public.equipamentos
  DROP CONSTRAINT IF EXISTS equipamentos_estado_qtd_check;

ALTER TABLE public.equipamentos
  ADD CONSTRAINT equipamentos_estado_qtd_check
  CHECK (
    (estado_bom IS NULL OR estado_bom >= 0) AND
    (estado_razoavel IS NULL OR estado_razoavel >= 0) AND
    (estado_mau IS NULL OR estado_mau >= 0) AND
    (estado_abate IS NULL OR estado_abate >= 0) AND
    (COALESCE(estado_bom, 0) + COALESCE(estado_razoavel, 0) + COALESCE(estado_mau, 0) + COALESCE(estado_abate, 0)) <= quantidade
  );

ALTER TABLE public.equipamentos
  DROP CONSTRAINT IF EXISTS equipamentos_escola_id_fkey;

ALTER TABLE public.equipamentos
  ADD CONSTRAINT equipamentos_escola_id_fkey
  FOREIGN KEY (escola_id) REFERENCES public.escola(id);

CREATE INDEX IF NOT EXISTS idx_equipamentos_escola_id
  ON public.equipamentos (escola_id);

-- Chaves funcionais para evitar duplicados do mesmo item por local/escola
CREATE UNIQUE INDEX IF NOT EXISTS uq_equipamentos_import_key_null_escola
  ON public.equipamentos (edf_de, descricao, local)
  WHERE escola IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_equipamentos_import_key_with_escola
  ON public.equipamentos (edf_de, descricao, local, escola)
  WHERE escola IS NOT NULL;

-- ------------------------------------------------------------
-- 3) LOCAIS
-- ------------------------------------------------------------
INSERT INTO public.locais (nome, descricao) VALUES
  ('Arr1', 'Arrecadacao Principal'),
  ('Arr2', 'Arrecadacao 2'),
  ('Arr1 Cx', 'Arrecadacao 1 - Caixa'),
  ('Arm2', 'Armario 2'),
  ('Arm3', 'Armario 3'),
  ('Arm5', 'Armario 5'),
  ('Arm6', 'Armario 6'),
  ('C3X3', 'Campo 3x3'),
  ('CAnd', 'Campo de Andebol'),
  ('Ext', 'Exterior'),
  ('Sala CF', 'Sala de Condicao Fisica'),
  ('WC', 'WC'),
  ('G1', 'Ginasio 1'),
  ('G2', 'Ginasio 2'),
  ('Gabinete', 'Gabinete de Educacao Fisica')
ON CONFLICT (nome) DO NOTHING;

-- ------------------------------------------------------------
-- 4) CATEGORIAS
-- ------------------------------------------------------------
INSERT INTO public.categoria (nome) VALUES
  ('Andebol'),
  ('Atletismo'),
  ('BTT'),
  ('Badminton'),
  ('Basquetebol'),
  ('Boccia'),
  ('Condição Física'),
  ('Corfebol'),
  ('Equipamento'),
  ('Escalada'),
  ('Fitnessgram'),
  ('Frisbee'),
  ('Futebol'),
  ('Futsal'),
  ('Ginástica'),
  ('Goalball'),
  ('Jogos Tradicionais'),
  ('Mobiliário Fixo'),
  ('Mobiliário Móvel'),
  ('Natação'),
  ('Orientação'),
  ('Padel'),
  ('Patinagem'),
  ('Rugby'),
  ('Speedminton'),
  ('Tiro com Arco'),
  ('Ténis de Campo'),
  ('Ténis de Mesa'),
  ('Variados'),
  ('Voleibol'),
  ('Xadrez')
ON CONFLICT (nome) DO NOTHING;

-- ------------------------------------------------------------
-- 5) INVENTARIO COMPLETO
-- ------------------------------------------------------------
INSERT INTO public.equipamentos
  (edf_de, descricao, quantidade, stock, empresa_data, estado, local, observacao, outras_observacao, categoria_id, escola)
VALUES
  ('EDF', 'AND Bola  XSports soft touch celular T1', 10, 0, 'Topgim  11-2021', 'Bom', 'Arr2', '5 amarelas e 5 azuis', NULL, (SELECT id FROM public.categoria WHERE nome = 'Andebol'), 'GM'),
  ('EDF', 'AND Bola  XSports soft touch celular T2', 20, 20, 'TopGim 2023', NULL, 'Arm2', 'ver a empresa', NULL, (SELECT id FROM public.categoria WHERE nome = 'Andebol'), 'GM'),
  ('EDF', 'AND Bola Ace', 9, 0, NULL, 'Razoável', 'Arr1', NULL, NULL, (SELECT id FROM public.categoria WHERE nome = 'Andebol'), 'GM'),
  ('EDF', 'AND Bola azul n.1', 1, 0, NULL, 'Razoável', 'Arr2', NULL, NULL, (SELECT id FROM public.categoria WHERE nome = 'Andebol'), NULL),
  ('EDF', 'AND Bola cor salmão n.1', 2, 0, NULL, 'Abate', 'Arr2', NULL, NULL, (SELECT id FROM public.categoria WHERE nome = 'Andebol'), 'GM'),
  ('EDF', 'AND Bola Kipsta', 1, 0, NULL, 'Razoável', 'Arr1', NULL, NULL, (SELECT id FROM public.categoria WHERE nome = 'Andebol'), 'GM'),
  ('EDF', 'AND Bola verde', 14, 0, NULL, 'Abate', 'Arr2', '(linha acrescentada)', NULL, (SELECT id FROM public.categoria WHERE nome = 'Andebol'), 'GM'),
  ('EDF', 'AND Bola Xsports nº1 - Laranjas', 6, 0, NULL, 'Mau', 'Arr2', NULL, NULL, (SELECT id FROM public.categoria WHERE nome = 'Andebol'), 'GM'),
  ('EDF', 'AND Bola Xsports nº2 - Verdes', 9, 0, NULL, 'Razoável', 'Arr1', 'desporto escolar', NULL, (SELECT id FROM public.categoria WHERE nome = 'Andebol'), 'GM'),
  ('EDF', 'AND Bola Xsports nº3 - vermelhas', 7, 0, NULL, 'Abate', 'Arr2', NULL, NULL, (SELECT id FROM public.categoria WHERE nome = 'Andebol'), 'GM'),
  ('EDF', 'AND Bola Xsports verde n.2', 13, 0, NULL, 'Abate', 'Arr2', NULL, NULL, (SELECT id FROM public.categoria WHERE nome = 'Andebol'), 'GM'),
  ('EDF', 'AND Bolas borracha celular, amar/br T0', 10, 10, 'Viduedo 12-2024', NULL, 'Arr2', 'Já telefonei para trocar pelo T2', NULL, (SELECT id FROM public.categoria WHERE nome = 'Andebol'), 'GM')
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- 6) EQUIPAMENTOS — Gabinete (19 itens)
-- ------------------------------------------------------------
INSERT INTO public.equipamentos
  (edf_de, descricao, quantidade, stock, estado, local, categoria_id, escola)
VALUES
  ('EDF', 'Armário de madeira c/ portas dem vidro', 2, 0, 'Razoável', 'Gabinete', (SELECT id FROM public.categoria WHERE nome = 'Variados'), NULL),
  ('EDF', 'Armário metálico cinzento', 1, 0, 'Razoável', 'Gabinete', (SELECT id FROM public.categoria WHERE nome = 'Variados'), NULL),
  ('EDF', 'Armário todo em madeira', 1, 0, 'Razoável', 'Gabinete', (SELECT id FROM public.categoria WHERE nome = 'Variados'), NULL),
  ('EDF', 'Cadeiras', 7, 0, 'Razoável', 'Gabinete', (SELECT id FROM public.categoria WHERE nome = 'Variados'), NULL),
  ('EDF', 'Caixote de lixo metálico', 1, 0, 'Razoável', 'Gabinete', (SELECT id FROM public.categoria WHERE nome = 'Variados'), NULL),
  ('EDF', 'Computadores', 3, 0, 'Razoável', 'Gabinete', (SELECT id FROM public.categoria WHERE nome = 'Variados'), NULL),
  ('EDF', 'Estores', 3, 0, 'Mau', 'Gabinete', (SELECT id FROM public.categoria WHERE nome = 'Variados'), NULL),
  ('EDF', 'Extensões eletricas', 3, 0, 'Bom', 'Gabinete', (SELECT id FROM public.categoria WHERE nome = 'Variados'), NULL),
  ('EDF', 'Frigorífico pequeno', 1, 0, 'Bom', 'Gabinete', (SELECT id FROM public.categoria WHERE nome = 'Variados'), NULL),
  ('EDF', 'Mesa tampo verde -  50X110cm', 2, 0, 'Razoável', 'Gabinete', (SELECT id FROM public.categoria WHERE nome = 'Variados'), NULL),
  ('EDF', 'Mesa tampo verde de apoio 30X50cm', 1, 0, 'Razoável', 'Gabinete', (SELECT id FROM public.categoria WHERE nome = 'Variados'), NULL),
  ('EDF', 'Mesas  tampo verde - 90X150cm', 3, 0, 'Razoável', 'Gabinete', (SELECT id FROM public.categoria WHERE nome = 'Variados'), NULL),
  ('EDF', 'Monitores', 3, 0, 'Razoável', 'Gabinete', (SELECT id FROM public.categoria WHERE nome = 'Variados'), NULL),
  ('EDF', 'Placard de cortiça', 2, 0, 'Mau', 'Gabinete', (SELECT id FROM public.categoria WHERE nome = 'Variados'), NULL),
  ('EDF', 'Secretária de madeira', 1, 0, 'Bom', 'Gabinete', (SELECT id FROM public.categoria WHERE nome = 'Variados'), NULL),
  ('EDF', 'Teclados', 3, 0, 'Bom', 'Gabinete', (SELECT id FROM public.categoria WHERE nome = 'Variados'), NULL),
  ('EDF', 'Telefone', 1, 0, 'Bom', 'Gabinete', (SELECT id FROM public.categoria WHERE nome = 'Variados'), NULL),
  ('EDF', 'Ventilador de parede', 1, 0, 'Bom', 'Gabinete', (SELECT id FROM public.categoria WHERE nome = 'Variados'), NULL),
  ('EDF', 'Aparelhagens Party Land', 2, 0, 'Razoável', 'Gabinete', (SELECT id FROM public.categoria WHERE nome = 'Variados'), NULL)
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- 7) EQUIPAMENTOS — G1 (20 itens)
-- ------------------------------------------------------------
INSERT INTO public.equipamentos
  (edf_de, descricao, quantidade, stock, estado, local, categoria_id, escola)
VALUES
  ('EDF', 'V Carro Metálico Simples', 2, 0, 'Razoável', 'G1', (SELECT id FROM public.categoria WHERE nome = 'Variados'), NULL),
  ('EDF', 'V Carro transporte de bolas, Azul, Abrir e fechar', 1, 0, 'Razoável', 'G1', (SELECT id FROM public.categoria WHERE nome = 'Variados'), NULL),
  ('EDF', 'V Colunas de som', 10, 0, 'Razoável', 'G1', (SELECT id FROM public.categoria WHERE nome = 'Variados'), NULL),
  ('EDF', 'V computador', 1, 0, 'Razoável', 'G1', (SELECT id FROM public.categoria WHERE nome = 'Variados'), NULL),
  ('EDF', 'V Cone Sinalização Xsports Luxo23cm Azul 1X18uni.', 1, 0, 'Razoável', 'G1', (SELECT id FROM public.categoria WHERE nome = 'Variados'), NULL),
  ('EDF', 'V Cones Compal', 5, 0, 'Razoável', 'G1', (SELECT id FROM public.categoria WHERE nome = 'Variados'), NULL),
  ('EDF', 'V Cones Furados Azul_Amarelo_Vermelho', 18, 0, 'Razoável', 'G1', (SELECT id FROM public.categoria WHERE nome = 'Variados'), NULL),
  ('EDF', 'V Mesa de mistura', 1, 0, 'Razoável', 'G1', (SELECT id FROM public.categoria WHERE nome = 'Variados'), NULL),
  ('EDF', 'V Peso Pedra', 2, 0, 'Razoável', 'G1', (SELECT id FROM public.categoria WHERE nome = 'Variados'), NULL),
  ('EDF', 'V Postes adaptaveis PB', 2, 0, 'Razoável', 'G1', (SELECT id FROM public.categoria WHERE nome = 'Variados'), NULL),
  ('EDF', 'V Quadros alusivos desportos', 16, 0, 'Razoável', 'G1', (SELECT id FROM public.categoria WHERE nome = 'Variados'), NULL),
  ('EDF', 'V Redes dos Cestos da tabela de basquetebol', 2, 0, 'Bom', 'G1', (SELECT id FROM public.categoria WHERE nome = 'Variados'), NULL),
  ('EDF', 'V Retropojetor', 1, 0, 'Razoável', 'G1', (SELECT id FROM public.categoria WHERE nome = 'Variados'), NULL),
  ('EDF', 'V Suporte, carrinho para colchonetes', 1, 0, 'Razoável', 'G1', (SELECT id FROM public.categoria WHERE nome = 'Variados'), NULL),
  ('EDF', 'VOL BOLA  MOLTEN VM150 Interior br/verm', 10, 0, 'Razoável', 'G1', (SELECT id FROM public.categoria WHERE nome = 'Voleibol'), NULL),
  ('EDF', 'VOL Bola Mikasa', 9, 0, 'Razoável', 'G1', (SELECT id FROM public.categoria WHERE nome = 'Voleibol'), NULL),
  ('EDF', 'VOL Bola Mikasa Iniciação', 10, 0, 'Razoável', 'G1', (SELECT id FROM public.categoria WHERE nome = 'Voleibol'), NULL),
  ('EDF', 'VOL Bola Xsports', 16, 0, 'Razoável', 'G1', (SELECT id FROM public.categoria WHERE nome = 'Voleibol'), NULL),
  ('EDF', 'VOL Bola XSportsXV5 Sponge Az_Am  couro sintético cosida', 10, 0, 'Razoável', 'G1', (SELECT id FROM public.categoria WHERE nome = 'Voleibol'), NULL),
  ('EDF', 'VOL Postes (Fixos parede)', 2, 0, 'Razoável', 'G1', (SELECT id FROM public.categoria WHERE nome = 'Voleibol'), NULL)
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- 8) EQUIPAMENTOS — G2 (25 itens)
-- ------------------------------------------------------------
INSERT INTO public.equipamentos
  (edf_de, descricao, quantidade, stock, estado, local, categoria_id, escola)
VALUES
  ('EDF', 'GIN 2 cadeiras', 1, 0, 'Razoável', 'G2', (SELECT id FROM public.categoria WHERE nome = 'Ginástica'), NULL),
  ('EDF', 'GIN arcos', 13, 0, 'Razoável', 'G2', (SELECT id FROM public.categoria WHERE nome = 'Ginástica'), NULL),
  ('EDF', 'GIN bock com arções', 1, 0, 'Mau', 'G2', (SELECT id FROM public.categoria WHERE nome = 'Ginástica'), NULL),
  ('EDF', 'GIN bock sem arções', 1, 0, 'Mau', 'G2', (SELECT id FROM public.categoria WHERE nome = 'Ginástica'), NULL),
  ('EDF', 'GIN cavalo com arções', 1, 0, 'Mau', 'G2', (SELECT id FROM public.categoria WHERE nome = 'Ginástica'), NULL),
  ('EDF', 'GIN Colchão 30Kg, 180x58x1,8cm', 13, 0, 'Razoável', 'G2', (SELECT id FROM public.categoria WHERE nome = 'Ginástica'), NULL),
  ('EDF', 'GIN colchão capa pvc cantos reforçados 2x1m vermelho', 1, 0, 'Razoável', 'G2', (SELECT id FROM public.categoria WHERE nome = 'Ginástica'), NULL),
  ('EDF', 'GIN colchões azuis de ginástica', 6, 0, 'Bom', 'G2', (SELECT id FROM public.categoria WHERE nome = 'Ginástica'), NULL),
  ('EDF', 'GIN Colchões capa verde de 2x1m', 3, 0, 'Razoável', 'G2', (SELECT id FROM public.categoria WHERE nome = 'Ginástica'), NULL),
  ('EDF', 'GIN colchões de queda       Az e Cinz', 3, 0, 'Razoável', 'G2', (SELECT id FROM public.categoria WHERE nome = 'Ginástica'), NULL),
  ('EDF', 'GIN colchões lona verde escura  0,05X1,20X2,00', 6, 0, 'Razoável', 'G2', (SELECT id FROM public.categoria WHERE nome = 'Ginástica'), NULL),
  ('EDF', 'GIN colchões lona verde espessura mais estreita', 4, 0, 'Razoável', 'G2', (SELECT id FROM public.categoria WHERE nome = 'Ginástica'), NULL),
  ('EDF', 'GIN colchões verdes 0,10X1,20X1,80', 4, 0, 'Razoável', 'G2', (SELECT id FROM public.categoria WHERE nome = 'Ginástica'), NULL),
  ('EDF', 'GIN Mini-trampolim (lona pequena)', 1, 0, 'Razoável', 'G2', (SELECT id FROM public.categoria WHERE nome = 'Ginástica'), NULL),
  ('EDF', 'GIN Mini-trampolim Eurotramp, aberto', 2, 0, 'Razoável', 'G2', (SELECT id FROM public.categoria WHERE nome = 'Ginástica'), NULL),
  ('EDF', 'GIN Plano inclinado (iniciação rolamento á retaguarda)', 2, 0, 'Bom', 'G2', (SELECT id FROM public.categoria WHERE nome = 'Ginástica'), NULL),
  ('EDF', 'GIN plinto de 6 caixas', 2, 0, 'Razoável', 'G2', (SELECT id FROM public.categoria WHERE nome = 'Ginástica'), NULL),
  ('EDF', 'GIN plinto de 8 caixas', 2, 0, 'Razoável', 'G2', (SELECT id FROM public.categoria WHERE nome = 'Ginástica'), NULL),
  ('EDF', 'GIN plinto de espuma laranja e azul', 1, 0, 'Razoável', 'G2', (SELECT id FROM public.categoria WHERE nome = 'Ginástica'), NULL),
  ('EDF', 'GIN quadro para escrever (1 ardósia, 1 caneta)', 2, 0, 'Mau', 'G2', (SELECT id FROM public.categoria WHERE nome = 'Ginástica'), NULL),
  ('EDF', 'GIN RIT Bolas', 6, 0, 'Razoável', 'G2', (SELECT id FROM public.categoria WHERE nome = 'Ginástica'), NULL),
  ('EDF', 'GIN RIT Massas', 50, 0, 'Razoável', 'G2', (SELECT id FROM public.categoria WHERE nome = 'Ginástica'), NULL),
  ('EDF', 'GIN rolo de ginástica', 4, 0, 'Razoável', 'G2', (SELECT id FROM public.categoria WHERE nome = 'Ginástica'), NULL),
  ('EDF', 'GIN Trampolins reuter', 2, 0, 'Razoável', 'G2', (SELECT id FROM public.categoria WHERE nome = 'Ginástica'), NULL),
  ('EDF', 'GIN trampolins suecos', 2, 0, 'Bom', 'G2', (SELECT id FROM public.categoria WHERE nome = 'Ginástica'), NULL)
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- 9) SINCRONIZAR escola_id COM escola (texto)
-- ------------------------------------------------------------
UPDATE public.equipamentos e
SET escola_id = s.id
FROM public.escola s
WHERE e.escola = s.sigla
  AND (e.escola_id IS NULL OR e.escola_id <> s.id);

-- ------------------------------------------------------------
-- 10) MIGRAR estado textual legado para colunas por estado
-- ------------------------------------------------------------
UPDATE public.equipamentos
SET
  estado_bom = CASE WHEN estado = 'Bom' THEN quantidade ELSE estado_bom END,
  estado_razoavel = CASE WHEN estado IN ('Razoável', 'Razoavel') THEN quantidade ELSE estado_razoavel END,
  estado_mau = CASE WHEN estado = 'Mau' THEN quantidade ELSE estado_mau END,
  estado_abate = CASE WHEN estado = 'Abate' THEN quantidade ELSE estado_abate END
WHERE
  estado IS NOT NULL
  AND (
    estado_bom IS NULL
    AND estado_razoavel IS NULL
    AND estado_mau IS NULL
    AND estado_abate IS NULL
  );

-- Limpar estado textual legado depois da migração.
UPDATE public.equipamentos
SET estado = NULL
WHERE estado IN ('Bom', 'Razoável', 'Mau', 'Abate');
UPDATE public.equipamentos
SET estado = NULL
WHERE estado = 'Razoavel';

COMMIT;
