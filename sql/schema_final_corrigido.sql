-- =============================================================================
-- GM Desporto — Schema Final Corrigido (Alinhado com o Frontend)
-- =============================================================================
-- AVISO: Este script APAGA todas as tabelas e recria do ZERO.
-- Execute no SQL Editor do Supabase apenas se estiver seguro que pode apagar
-- os dados atuais (ou se já fez backup).
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1) Remover objectos antigos em cascata
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS public.abates CASCADE;
DROP TABLE IF EXISTS public.lista CASCADE;
DROP TABLE IF EXISTS public.relatos CASCADE;
DROP TABLE IF EXISTS public.solicitacoes_registo CASCADE;
DROP TABLE IF EXISTS public.membros CASCADE;
DROP TABLE IF EXISTS public.equipamentos CASCADE;
DROP TABLE IF EXISTS public.locais CASCADE;
DROP TABLE IF EXISTS public.estados CASCADE;
DROP TABLE IF EXISTS public.escola CASCADE;

-- ---------------------------------------------------------------------------
-- 2) ESTADOS — Tabela de referência para a listagem (novo)
-- ---------------------------------------------------------------------------
CREATE TABLE public.estados (
  id          BIGSERIAL PRIMARY KEY,
  nome        VARCHAR(200) NOT NULL UNIQUE,
  descricao   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3) ESCOLA — Tabela de referência para as escolas (novo)
-- ---------------------------------------------------------------------------
CREATE TABLE public.escola (
  id          BIGSERIAL PRIMARY KEY,
  sigla       VARCHAR(50) NOT NULL UNIQUE,
  nome        VARCHAR(200),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 4) LOCAIS — Utilizados em filtros e listagens
-- ---------------------------------------------------------------------------
CREATE TABLE public.locais (
  id          BIGSERIAL PRIMARY KEY,
  nome        VARCHAR(200) NOT NULL UNIQUE,
  descricao   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_locais_nome ON public.locais (nome);

-- ---------------------------------------------------------------------------
-- 5) MEMBROS — Utilizadores do sistema
-- ---------------------------------------------------------------------------
CREATE TABLE public.membros (
  id     BIGSERIAL PRIMARY KEY,
  nome   VARCHAR(200) NOT NULL,
  email  VARCHAR(320) NOT NULL UNIQUE,
  role   VARCHAR(30)  NOT NULL CHECK (role IN ('admin', 'professor'))
);

CREATE INDEX idx_membros_role ON public.membros (role);

-- ---------------------------------------------------------------------------
-- 6) SOLICITAÇÕES DE REGISTO — Inscrições de novos professores
-- ---------------------------------------------------------------------------
CREATE TABLE public.solicitacoes_registo (
  id         BIGSERIAL PRIMARY KEY,
  nome       VARCHAR(200) NOT NULL,
  email      VARCHAR(320) NOT NULL UNIQUE, -- [CORRIGIDO] Impede o mesmo utilizador de fazer spam
  role       VARCHAR(30)  NOT NULL CHECK (role IN ('admin', 'professor')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_solicitacoes_created ON public.solicitacoes_registo (created_at DESC);

-- ---------------------------------------------------------------------------
-- 7) EQUIPAMENTOS — Inventário
-- ---------------------------------------------------------------------------
CREATE TABLE public.equipamentos (
  id                 BIGSERIAL PRIMARY KEY,
  escola             VARCHAR(50)  REFERENCES public.escola(sigla) ON UPDATE CASCADE ON DELETE SET NULL,
  edf_de             VARCHAR(10)  NOT NULL CHECK (edf_de IN ('EDF', 'DE')),
  descricao          VARCHAR(500) NOT NULL,
  quantidade         INT          NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  stock              INT          NOT NULL DEFAULT 0 CHECK (stock >= 0),
  empresa_data       TEXT,
  estado             TEXT,
  estado_bom         INT,
  estado_razoavel    INT,
  estado_mau         INT,
  estado_abate       INT,
  local              VARCHAR(200) REFERENCES public.locais(nome) ON UPDATE CASCADE ON DELETE SET NULL, -- Ligado por nome para compatibilidade com o JS
  observacao         TEXT,
  outras_observacao  TEXT,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_equipamentos_descricao ON public.equipamentos (descricao);
CREATE INDEX idx_equipamentos_local_txt ON public.equipamentos (local);

-- ---------------------------------------------------------------------------
-- 8) ABATES — Equipamentos retirados de circulação
-- ---------------------------------------------------------------------------
CREATE TABLE public.abates (
  id              BIGSERIAL PRIMARY KEY,
  equipamento_id  BIGINT REFERENCES public.equipamentos (id) ON DELETE SET NULL,
  quantidade      INT NOT NULL CHECK (quantidade > 0),
  motivo          TEXT,
  data_abate      TIMESTAMPTZ NOT NULL DEFAULT now(),
  utilizador      TEXT
);

CREATE INDEX idx_abates_data ON public.abates (data_abate DESC);
CREATE INDEX idx_abates_equip ON public.abates (equipamento_id);

-- ---------------------------------------------------------------------------
-- 9) RELATOS — Ocorrências registadas
-- ---------------------------------------------------------------------------
CREATE TABLE public.relatos (
  id                BIGSERIAL PRIMARY KEY,
  equipamento_id    BIGINT REFERENCES public.equipamentos (id) ON DELETE SET NULL,
  nome_equipamento  VARCHAR(500) NOT NULL,
  tipo_ocorrencia   VARCHAR(50)  NOT NULL,
  quantidade        INT          NOT NULL CHECK (quantidade > 0),
  descricao         TEXT,
  prof_email        VARCHAR(320),
  prof_role         VARCHAR(40),
  status            VARCHAR(30)  NOT NULL DEFAULT 'nao_visto' CHECK (status IN ('nao_visto', 'visto', 'negado', 'positivo')), -- [CORRIGIDO] Proteção contra estados inválidos
  admin_hidden      BOOLEAN      NOT NULL DEFAULT false,
  data_hora         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_relatos_data ON public.relatos (data_hora DESC);
CREATE INDEX idx_relatos_status ON public.relatos (status);
CREATE INDEX idx_relatos_prof_email ON public.relatos (prof_email);

-- ---------------------------------------------------------------------------
-- 10) LISTA — Listagem de Uso / Requisições
-- ---------------------------------------------------------------------------
CREATE TABLE public.lista (
  id              BIGSERIAL PRIMARY KEY,
  equipamento_id  BIGINT NOT NULL REFERENCES public.equipamentos (id) ON DELETE CASCADE,
  local_id        BIGINT NOT NULL REFERENCES public.locais (id) ON DELETE RESTRICT,
  estado_id       BIGINT REFERENCES public.estados(id) ON DELETE SET NULL, -- [CORRIGIDO] Ligação restaurada
  quantidade      INT NOT NULL CHECK (quantidade > 0),
  descricao       TEXT,
  pedido_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  prof_email      VARCHAR(320) NOT NULL,
  prof_role       VARCHAR(40)  NOT NULL DEFAULT 'professor',
  status          VARCHAR(30)  NOT NULL DEFAULT 'listado' CHECK (status IN ('pendente', 'listado', 'aprovado', 'rejeitado', 'cancelado')),
  lido            BOOLEAN      NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_lista_pedido ON public.lista (pedido_em DESC);
CREATE INDEX idx_lista_prof_email ON public.lista (prof_email);
CREATE INDEX idx_lista_equip ON public.lista (equipamento_id);

-- ---------------------------------------------------------------------------
-- 11) GATILHOS (TRIGGERS) PARA UPDATED_AT
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_locais_updated_at BEFORE UPDATE ON public.locais FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
CREATE TRIGGER tr_equipamentos_updated_at BEFORE UPDATE ON public.equipamentos FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
CREATE TRIGGER tr_lista_updated_at BEFORE UPDATE ON public.lista FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 12) POLÍTICAS DE SEGURANÇA (RLS)
-- ---------------------------------------------------------------------------
ALTER TABLE public.locais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacoes_registo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lista ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escola ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['locais', 'membros', 'solicitacoes_registo', 'equipamentos', 'abates', 'relatos', 'lista', 'estados', 'escola']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'anon_all_' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true)', 'anon_all_' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'auth_all_' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', 'auth_all_' || t, t);
  END LOOP;
END $$;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

COMMIT;
