-- Corrigir permissões da tabela relatos para o frontend atual (anon key)
-- Execute no Supabase SQL Editor

-- 1) Garantir RLS ativa
alter table public.relatos enable row level security;

-- 2) Policies permissivas para anon/authenticated
drop policy if exists "relatos_select_all" on public.relatos;
create policy "relatos_select_all"
on public.relatos
for select
to anon, authenticated
using (true);

drop policy if exists "relatos_insert_all" on public.relatos;
create policy "relatos_insert_all"
on public.relatos
for insert
to anon, authenticated
with check (true);

drop policy if exists "relatos_update_all" on public.relatos;
create policy "relatos_update_all"
on public.relatos
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "relatos_delete_all" on public.relatos;
create policy "relatos_delete_all"
on public.relatos
for delete
to anon, authenticated
using (true);
