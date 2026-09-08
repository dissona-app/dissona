-- ============================================================================
-- Helpers e atores da suíte de RLS.
--
-- Este arquivo NÃO roda sozinho: ele abre a transação e os arquivos
-- `00NN_*.testes.sql` a fecham. A invocação é a concatenação dos dois:
--
--     cat supabase/testes/_ajuda.sql supabase/testes/0001_identidade.testes.sql
--
-- e o resultado vai inteiro numa chamada de `execute_sql` do MCP.
--
-- Por que uma transação só: o `execute_sql` roda como `postgres`, que é
-- `bypassrls`. Sem `set local role authenticated` todo teste de RLS passa
-- vacuamente — e `set local` só existe dentro de transação. O `rollback` no
-- fim é obrigatório: Preview e Production compartilham o projeto
-- (open-questions #25), e um `commit` aqui poluiria o banco que serve a demo.
-- ============================================================================

begin;

-- ------------------------------------------------------------------ helpers

-- Ficam em `pg_temp` de propósito: são de sessão, morrem no fim e não viram
-- DDL versionada. Um schema `testes` exigiria migration — código de teste em
-- produção — ou aplicação manual que alguém esqueceria de refazer.
create function pg_temp.afirmar(p_ok boolean, p_rotulo text) returns void
language plpgsql as $$
begin
  if p_ok is not true then
    raise exception 'FALHOU: %', p_rotulo using errcode = 'TS001';
  end if;
end $$;

-- A RLS nega de TRÊS formas diferentes, e cada uma precisa do seu helper —
-- um helper só daria falso positivo em dois terços dos casos:
--
--   1. `select` numa linha excluída pelo `using`  -> zero linhas
--   2. `update`/`delete` numa linha excluída pelo `using` -> zero linhas
--      AFETADAS, e **nenhum erro**: a linha simplesmente não existe para o
--      comando. É a forma mais fácil de confundir com sucesso.
--   3. `insert`/`update` que viola o `with check`  -> 42501
--
-- Por isso `afirmar_invisivel` (1), `afirmar_sem_efeito` (2) e
-- `afirmar_bloqueado` (3).
create function pg_temp.afirmar_invisivel(p_sql text, p_rotulo text) returns void
language plpgsql as $$
declare
  v_n integer;
begin
  execute format('select count(*) from (%s) as _r', p_sql) into v_n;
  if v_n <> 0 then
    raise exception 'FALHOU: % (esperava 0 linhas, veio %)', p_rotulo, v_n
      using errcode = 'TS001';
  end if;
end $$;

create function pg_temp.afirmar_bloqueado(p_sql text, p_rotulo text) returns void
language plpgsql as $$
begin
  execute p_sql;
  raise exception 'FALHOU: % (a escrita passou, e devia ter sido negada)', p_rotulo
    using errcode = 'TS001';
exception
  when insufficient_privilege then return;          -- 42501: a RLS negou
  when check_violation then return;                 -- check ou with check recusou
  when unique_violation then return;                -- indice unico recusou
  when not_null_violation then return;
  when foreign_key_violation then return;
  when generated_always then return;                -- coluna gerada nao aceita escrita
end $$;

-- Caso 2: a escrita roda sem erro, mas não alcança linha nenhuma.
create function pg_temp.afirmar_sem_efeito(p_sql text, p_rotulo text) returns void
language plpgsql as $$
declare
  v_n integer;
begin
  execute p_sql;
  get diagnostics v_n = row_count;
  if v_n <> 0 then
    raise exception 'FALHOU: % (afetou % linha(s); a RLS devia ter escondido)',
      p_rotulo, v_n using errcode = 'TS001';
  end if;
end $$;

-- Conta quantas linhas uma consulta devolve, para as asserções positivas.
create function pg_temp.quantas(p_sql text) returns integer
language plpgsql as $$
declare
  v_n integer;
begin
  execute format('select count(*) from (%s) as _r', p_sql) into v_n;
  return v_n;
end $$;

-- ------------------------------------------------------------------- atores

-- UUIDs fixos e legíveis, para as asserções e as mensagens de erro serem
-- reconhecíveis quando algo falha.
create temporary table ator (papel text primary key, id uuid) on commit drop;
insert into ator (papel, id) values
  ('artista',  '11111111-1111-1111-1111-111111111111'),
  ('vizinho',  '22222222-2222-2222-2222-222222222222'),
  ('curador',  '33333333-3333-3333-3333-333333333333'),
  ('admin',    '44444444-4444-4444-4444-444444444444');

-- O insert em `auth.users` dispara `criar_perfil_ao_cadastrar`, então as linhas
-- de `perfil` nascem pelo caminho de produção — o fixture testa o trigger de
-- graça, em vez de contorná-lo com insert direto.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
select
  '00000000-0000-0000-0000-000000000000',
  a.id,
  'authenticated',
  'authenticated',
  't_' || a.papel || '@teste.dissona.local',
  extensions.crypt('senha-de-teste-1', extensions.gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('nome_completo', 'Teste ' || a.papel, 'aceite_termos', 'true')
from ator a;

insert into papel_usuario (perfil_id, papel)
select a.id, a.papel::papel
from ator a
where a.papel in ('artista', 'curador', 'admin');

-- O vizinho também é artista — é contra ele que se prova o isolamento.
insert into papel_usuario (perfil_id, papel)
select a.id, 'artista'::papel from ator a where a.papel = 'vizinho';
