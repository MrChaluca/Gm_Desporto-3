-- =============================================================================
-- GM Desporto — Schema novo alinhado ao site (HTML/JS atual)
-- =============================================================================
-- O site usa o cliente Supabase (anon key) e espera estas tabelas e colunas.
--
-- AVISO: Este script APAGA as tabelas listadas (CASCADE) e recria-as vazias.
-- Faça backup/export antes de correr em produção.
--
-- Onde correr: Supabase → SQL Editor → colar → Run
-- Depois: confirme que RLS/policies são aceitáveis para o teu nível de segurança.
-- =============================================================================

BEGIN;

-- Extensão usada por alguns projetos (opcional)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1) Remover objectos antigos (ordem: dependentes primeiro)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS public.abates CASCADE;
DROP TABLE IF EXISTS public.lista CASCADE;
DROP TABLE IF EXISTS public.relatos CASCADE;
DROP TABLE IF EXISTS public.solicitacoes_registo CASCADE;
DROP TABLE IF EXISTS public.membros CASCADE;
DROP TABLE IF EXISTS public.equipamentos CASCADE;
DROP TABLE IF EXISTS public.locais CASCADE;

-- ---------------------------------------------------------------------------
-- 2) LOCAIS — Admin | Locais; filtro no inventário; listagem de uso (FK)
--    JS: locais.js (select *, insert nome/descricao, update + updated_at)
--        professores_locais.js (select *)
-- ---------------------------------------------------------------------------
CREATE TABLE public.locais (
  id          BIGSERIAL PRIMARY KEY,
  nome        VARCHAR(200) NOT NULL,
  descricao   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_locais_nome UNIQUE (nome)
);

CREATE INDEX idx_locais_nome ON public.locais (nome);

COMMENT ON TABLE public.locais IS 'Locais dinâmicos (nome único). O inventário grava equipamentos.local como texto = nome do local.';

-- ---------------------------------------------------------------------------
-- 3) MEMBROS — Login (isAdminByEmail); Membros admin; Perfil
-- ---------------------------------------------------------------------------
CREATE TABLE public.membros (
  id     BIGSERIAL PRIMARY KEY,
  nome   VARCHAR(200) NOT NULL,
  email  VARCHAR(320) NOT NULL,
  role   VARCHAR(30)  NOT NULL CHECK (role IN ('admin', 'professor')),
  CONSTRAINT uq_membros_email UNIQUE (email)
);

CREATE INDEX idx_membros_role ON public.membros (role);

-- ---------------------------------------------------------------------------
-- 4) SOLICITAÇÕES DE REGISTO — index.html registo; membros.js painel
-- ---------------------------------------------------------------------------
CREATE TABLE public.solicitacoes_registo (
  id         BIGSERIAL PRIMARY KEY,
  nome       VARCHAR(200) NOT NULL,
  email      VARCHAR(320) NOT NULL,
  role       VARCHAR(30)  NOT NULL CHECK (role IN ('admin', 'professor')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_solicitacoes_created ON public.solicitacoes_registo (created_at DESC);

-- ---------------------------------------------------------------------------
-- 5) EQUIPAMENTOS — principal.html (script.js); professores; abates; relatos
--    Colunas usadas em select/insert/update no JS (snake_case = Supabase)
-- ---------------------------------------------------------------------------
CREATE TABLE public.equipamentos (
  id                 BIGSERIAL PRIMARY KEY,
  escola             VARCHAR(120),
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
  local              TEXT         NOT NULL DEFAULT '',
  observacao         TEXT,
  outras_observacao  TEXT,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_equipamentos_descricao ON public.equipamentos (descricao);
CREATE INDEX idx_equipamentos_local_txt ON public.equipamentos (local);

COMMENT ON COLUMN public.equipamentos.local IS 'Nome do local (texto livre; deve coincidir com locais.nome para a listagem de uso mapear local_id).';
COMMENT ON COLUMN public.equipamentos.escola IS 'Opcional; o site mostra GM se vazio.';

-- ---------------------------------------------------------------------------
-- 6) ABATES — abates.html (abates.js): insert + listagem com join equipamentos
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
-- 7) RELATOS — professores.html (relatos); relatos.html (relatados.js admin)
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
  status            VARCHAR(30)  NOT NULL DEFAULT 'nao_visto',
  admin_hidden      BOOLEAN      NOT NULL DEFAULT false,
  data_hora         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_relatos_data ON public.relatos (data_hora DESC);
CREATE INDEX idx_relatos_status ON public.relatos (status);
CREATE INDEX idx_relatos_admin_hidden ON public.relatos (admin_hidden);
CREATE INDEX idx_relatos_prof_email ON public.relatos (prof_email);

COMMENT ON COLUMN public.relatos.status IS 'Valores usados no JS: nao_visto, visto, negado, positivo.';
COMMENT ON COLUMN public.relatos.admin_hidden IS 'Quando true, o admin deixa de listar o relato na UI.';

-- ---------------------------------------------------------------------------
-- 8) LISTA — professores_relatados.html (listagem de uso / requisições)
--    professores_listagem.js + requisicoes_admin.js
-- ---------------------------------------------------------------------------
CREATE TABLE public.lista (
  id              BIGSERIAL PRIMARY KEY,
  equipamento_id  BIGINT NOT NULL REFERENCES public.equipamentos (id) ON DELETE CASCADE,
  local_id        BIGINT NOT NULL REFERENCES public.locais (id) ON DELETE RESTRICT,
  estado_id       BIGINT,
  quantidade      INT NOT NULL CHECK (quantidade > 0),
  descricao       TEXT,
  pedido_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  prof_email      VARCHAR(320) NOT NULL,
  prof_role       VARCHAR(40)  NOT NULL DEFAULT 'professor',
  status          VARCHAR(30)  NOT NULL DEFAULT 'listado',
  lido            BOOLEAN      NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT chk_lista_status CHECK (
    status IN (
      'pendente',
      'listado',
      'aprovado',
      'rejeitado',
      'cancelado'
    )
  )
);

CREATE INDEX idx_lista_pedido ON public.lista (pedido_em DESC);
CREATE INDEX idx_lista_prof_email ON public.lista (prof_email);
CREATE INDEX idx_lista_lido ON public.lista (lido);
CREATE INDEX idx_lista_equip ON public.lista (equipamento_id);

COMMENT ON COLUMN public.lista.descricao IS 'Texto livre; o site prefixa duração com [tempo=NN] ...';
COMMENT ON COLUMN public.lista.estado_id IS 'Reservado; o insert do site envia null.';

-- ---------------------------------------------------------------------------
-- 9) updated_at automático em locais e equipamentos (opcional, usado no JS)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_locais_updated_at
  BEFORE UPDATE ON public.locais
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER tr_equipamentos_updated_at
  BEFORE UPDATE ON public.equipamentos
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER tr_lista_updated_at
  BEFORE UPDATE ON public.lista
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 10) RLS — políticas permissivas para anon (site com publishable/anon key)
--     Apertar em produção (ex.: só authenticated, ou policies por email).
-- ---------------------------------------------------------------------------
ALTER TABLE public.locais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacoes_registo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lista ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'locais',
    'membros',
    'solicitacoes_registo',
    'equipamentos',
    'abates',
    'relatos',
    'lista'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'anon_all_' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true)',
      'anon_all_' || t,
      t
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'auth_all_' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      'auth_all_' || t,
      t
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 11) Permissões de leitura/escrita nas sequências (Supabase)
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

COMMIT;

-- =============================================================================
-- Dados mínimos opcionais (descomente se quiser locais de exemplo)
-- =============================================================================
-- INSERT INTO public.locais (nome, descricao) VALUES
--   ('Arr1 - Arrecadão 1', 'Exemplo'),
--   ('G1', 'Exemplo'),
--   ('G2', 'Exemplo')
-- ON CONFLICT (nome) DO NOTHING;
