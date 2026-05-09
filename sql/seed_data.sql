-- ============================================================
-- GM Desporto — Dados de exemplo (seed)
-- Correr no Supabase: SQL Editor → New query → Run
-- ============================================================

-- Locais
INSERT INTO public.locais (nome, descricao)
SELECT * FROM (VALUES
  ('Arr1', 'Armazém 1'),
  ('G1', 'Ginásio 1'),
  ('G2', 'Ginásio 2')
) AS v(nome, descricao)
WHERE NOT EXISTS (SELECT 1 FROM public.locais);

-- Estados
INSERT INTO public.estados (nome, descricao)
SELECT * FROM (VALUES
  ('Bom', 'Equipamento em bom estado'),
  ('Mau', 'Equipamento danificado'),
  ('Razoável', 'Equipamento em razoável estado'),
  ('Abate', 'Equipamento marcado para abate')
) AS v(nome, descricao)
WHERE NOT EXISTS (SELECT 1 FROM public.estados);

-- Equipamentos de exemplo
INSERT INTO public.equipamentos (
  edf_de,
  descricao,
  quantidade,
  stock,
  empresa_data,
  estado,
  local,
  observacao,
  outras_observacao
)
SELECT * FROM (VALUES
  ('EDF', 'Bola de futebol tamanho 5', 12, 12, 'Adidas / 11-2023', 'Bom', 'G1', 'Bolas de treino e competição', NULL),
  ('DE', 'Rede de voleibol portátil', 4, 4, 'SportPlus / 09-2022', 'Bom', 'G2', 'Conjunto com postes e redes', NULL),
  ('EDF', 'Corda de saltar para aquecimento', 20, 20, 'Decathlon / 05-2024', 'Bom', 'Arr1', 'Para treino de condicionamento', NULL),
  ('DE', 'Conjunto de tacos de basebol', 8, 8, 'TopGym / 12-2021', 'Bom', 'G1', 'Tacos e luvas em bom estado', NULL),
  ('EDF', 'Kit de primeiros socorros', 3, 3, 'Farmácia / 08-2024', 'Bom', 'Arr1', 'Sacolas seladas', NULL),
  ('DE', 'Saco de pancada', 2, 2, 'BoxFit / 02-2020', 'Razoável', 'G2', 'Com suporte e correntes', 'Alguns pontos com desgaste'),
  ('EDF', 'Raquete de ténis', 10, 10, 'Wilson / 07-2023', 'Bom', 'G1', 'Raquetes para treino escolar', NULL),
  ('DE', 'Apito de treinador', 15, 15, 'Decathlon / 11-2022', 'Bom', 'Arr1', 'Para árbitro e treino', NULL)
) AS v(edf_de, descricao, quantidade, stock, empresa_data, estado, local, observacao, outras_observacao)
WHERE NOT EXISTS (SELECT 1 FROM public.equipamentos);

-- Membros de exemplo
INSERT INTO public.membros (nome, email, role)
SELECT * FROM (VALUES
  ('Admin Principal', 'admin@gmdesporto.pt', 'admin'),
  ('Professor João Silva', 'joao.silva@gmdesporto.pt', 'professor'),
  ('Professor Maria Santos', 'maria.santos@gmdesporto.pt', 'professor')
) AS v(nome, email, role)
WHERE NOT EXISTS (SELECT 1 FROM public.membros);

-- Solicitações de registo pendentes de exemplo
INSERT INTO public.solicitacoes_registo (nome, email, role)
SELECT * FROM (VALUES
  ('Novo Professor Carlos', 'carlos.novo@gmdesporto.pt', 'professor'),
  ('Admin Aspirante Ana', 'ana.aspirante@gmdesporto.pt', 'admin')
) AS v(nome, email, role)
WHERE NOT EXISTS (SELECT 1 FROM public.solicitacoes_registo);
