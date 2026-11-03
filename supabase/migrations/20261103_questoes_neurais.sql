-- Método PMDF: banco de questões geradas localmente, integrado ao Supabase Auth.
-- Executar uma vez no Supabase SQL Editor (ou via migrations/CLI).
-- IMPORTANTE: não habilitar INSERT/UPDATE públicos: isso permitiria vandalismo
-- e publicação de documentos privados enviados por estudantes.
create extension if not exists pgcrypto;
create table if not exists public.questoes (
  id uuid primary key default gen_random_uuid(),
  hash_unico text unique not null,
  disciplina text not null,
  assunto text not null,
  formato text not null,
  dificuldade text not null,
  score_dificuldade numeric(4,3) not null,
  tipo_armadilha text,
  enunciado text not null,
  alternativas jsonb,
  gabarito text not null,
  comentario_gabarito text,
  texto_origem text,
  criado_em timestamptz not null default timezone('utc'::text, now()),
  criado_por uuid references auth.users(id) on delete cascade default auth.uid(),
  publicada boolean not null default false
);
-- Compatibilidade com eventual tabela criada antes da migração.
alter table public.questoes
  add column if not exists criado_por uuid references auth.users(id) on delete cascade default auth.uid();
alter table public.questoes
  add column if not exists publicada boolean not null default false;
create index if not exists questoes_criado_por_idx on public.questoes(criado_por,criado_em desc);
alter table public.questoes enable row level security;
-- Remove políticas inseguras caso o SQL anterior já tenha sido executado.
drop policy if exists "Permitir leitura pública de questões" on public.questoes;
drop policy if exists "Permitir inserção pública de questões" on public.questoes;
drop policy if exists "Permitir atualização pública de questões" on public.questoes;
drop policy if exists "questoes_ler_autorizadas" on public.questoes;
drop policy if exists "questoes_inserir_proprias" on public.questoes;
drop policy if exists "questoes_atualizar_proprias" on public.questoes;
create policy "questoes_ler_autorizadas" on public.questoes
  for select to anon,authenticated
  using (publicada=true or criado_por=(select auth.uid()));
create policy "questoes_inserir_proprias" on public.questoes
  for insert to authenticated
  with check (criado_por=(select auth.uid()) and publicada=false);
create policy "questoes_atualizar_proprias" on public.questoes
  for update to authenticated
  using (criado_por=(select auth.uid()))
  with check (criado_por=(select auth.uid()));
revoke all on public.questoes from anon,authenticated;
grant select on public.questoes to anon;
grant select,insert,update on public.questoes to authenticated;
comment on table public.questoes is 'Questões geradas pelo motor neural local do Método PMDF; privadas por padrão.';
