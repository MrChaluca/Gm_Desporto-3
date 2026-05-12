-- Cria a tabela de abates
CREATE TABLE IF NOT EXISTS public.abates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    equipamento_id BIGINT REFERENCES public.equipamentos(id) ON DELETE CASCADE,
    quantidade INT NOT NULL DEFAULT 1 CHECK (quantidade > 0),
    motivo TEXT,
    data_abate TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    utilizador TEXT
);

-- Ativa o RLS
ALTER TABLE public.abates ENABLE ROW LEVEL SECURITY;

-- Remove policies antigas se existirem (para poder correr o script várias vezes sem erro)
DROP POLICY IF EXISTS "anon_select_abates" ON public.abates;
DROP POLICY IF EXISTS "anon_insert_abates" ON public.abates;
DROP POLICY IF EXISTS "anon_update_abates" ON public.abates;
DROP POLICY IF EXISTS "anon_delete_abates" ON public.abates;

-- Cria as policies permitindo o acesso ao papel anon
CREATE POLICY "anon_select_abates" ON public.abates FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_abates" ON public.abates FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_abates" ON public.abates FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_abates" ON public.abates FOR DELETE TO anon USING (true);
