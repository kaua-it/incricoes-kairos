-- =====================================================
-- CONFIGURAÇÃO DO SUPABASE — II KAIRÓS
-- Execute este SQL no SQL Editor do seu projeto.
-- =====================================================

-- RLS deve estar ativado na tabela inscricoes.
alter table public.inscricoes enable row level security;

-- Permissões mínimas para o site público criar inscrições.
grant insert on table public.inscricoes to anon;
grant insert on table public.inscricoes to authenticated;

-- Permissões para o administrador autenticado.
grant select, insert, update, delete on table public.inscricoes to authenticated;

-- Se a coluna id usa uma sequence de identity/serial, permite seu uso.
do $$
begin
    if exists (
        select 1
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where c.relname = 'inscricoes_id_seq'
          and n.nspname = 'public'
    ) then
        grant usage, select on sequence public.inscricoes_id_seq to anon, authenticated;
    end if;
end $$;

-- O visitante pode enviar uma inscrição, mas não pode ler as inscrições.
drop policy if exists "public can create registrations" on public.inscricoes;
create policy "public can create registrations"
on public.inscricoes
for insert
to anon, authenticated
with check (autorizacao_imagem = true);

-- Somente usuários autenticados do Supabase podem consultar/alterar/excluir.
drop policy if exists "authenticated can read registrations" on public.inscricoes;
create policy "authenticated can read registrations"
on public.inscricoes
for select
to authenticated
using (true);

drop policy if exists "authenticated can update registrations" on public.inscricoes;
create policy "authenticated can update registrations"
on public.inscricoes
for update
to authenticated
using (true)
with check (autorizacao_imagem = true);

drop policy if exists "authenticated can delete registrations" on public.inscricoes;
create policy "authenticated can delete registrations"
on public.inscricoes
for delete
to authenticated
using (true);
