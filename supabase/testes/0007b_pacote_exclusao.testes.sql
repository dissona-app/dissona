-- ============================================================================
-- Testes da migration 0007b · exclusão de pacote
--
-- Autocontido, como os demais: monta um admin (papel `financeiro`, que tem
-- `pacotes` com escrita) e um artista, e prova as três coisas que a tela 21
-- depende e que o código **não** pode garantir sozinho:
--
--  1. Desativar ≠ excluir. O inativo continua visível para a equipe; o
--     excluído também é visível para a equipe (a linha existe, para o log
--     apontar), mas o artista não vê nenhum dos dois.
--  2. Excluir implica inativo — pelo check, não pela Server Action.
--  3. Exclusão é irreversível — pelo trigger, com `DS014` (a `0007b` usou
--     `DS030`, que já era "configuração ausente"; corrigido na `0007c`).
--
-- Roda como os outros: transação única, `rollback` no fim. `set local role
-- authenticated` é obrigatório: `postgres` é `bypassrls`, e sem trocar de
-- papel todo teste de RLS passa vacuamente.
--
-- Toda contagem é **filtrada pelo prefixo `T `**, e não global. A primeira
-- versão contava `count(*) from pacote_clave` e só passava porque a tabela
-- estava vazia; assim que `dados-e2e.sql` semeou o catálogo do protótipo, ela
-- quebrou. Teste de RLS que depende de a tabela estar vazia é teste que
-- funciona uma vez.
-- ============================================================================

begin;

create function pg_temp.afirmar(p_ok boolean, p_rotulo text) returns void
language plpgsql as $$
begin
  if p_ok is not true then
    raise exception 'FALHOU: %', p_rotulo using errcode = 'TS001';
  end if;
end $$;

-- RLS nega escrita de três maneiras, não duas: `insert` com `with check`
-- barrado estoura 42501, mas `update` fora do `using` simplesmente não
-- alcança linha nenhuma — zero linhas afetadas, **sem erro**. Este helper é o
-- que separa "foi negado" de "passou e não fez nada".
create function pg_temp.afirmar_sem_efeito(p_sql text, p_rotulo text) returns void
language plpgsql as $$
declare
  v_linhas integer;
begin
  execute p_sql;
  get diagnostics v_linhas = row_count;
  if v_linhas <> 0 then
    raise exception 'FALHOU (afetou % linha(s)): %', v_linhas, p_rotulo using errcode = 'TS001';
  end if;
end $$;

-- ------------------------------------------------------------- fixtures ----

create temporary table ator (papel text primary key, id uuid) on commit drop;
grant select on ator to authenticated, anon;
insert into ator (papel, id) values
  ('artista', '11111111-1111-1111-1111-111111111111'),
  ('admin',   '55555555-5555-5555-5555-555555555555');

insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
select '00000000-0000-0000-0000-000000000000', a.id, 'authenticated', 'authenticated',
  't_' || a.papel || '@teste.dissona.local',
  extensions.crypt('s', extensions.gen_salt('bf')),
  now(), now(), now(), '{"provider":"email"}'::jsonb,
  jsonb_build_object('nome_completo', 'Teste ' || a.papel, 'aceite_termos', 'true')
from ator a;

insert into papel_usuario (perfil_id, papel)
select a.id, 'artista'::papel from ator a where a.papel = 'artista';
insert into perfil_artista (perfil_id) select id from ator where papel = 'artista';

-- `financeiro`, e não `administrador`: é o papel mínimo com `pacotes` em
-- escrita, e prova que a policy olha a permissão do módulo e não "é admin".
insert into papel_usuario (perfil_id, papel)
select a.id, 'admin'::papel from ator a where a.papel = 'admin';
insert into membro_admin (perfil_id, papel_admin)
select a.id, 'financeiro'::papel_admin from ator a where a.papel = 'admin';

insert into pacote_clave (nome, quantidade_claves, valor_centavos, desconto_percentual, ativo) values
  ('T Ativo',    10, 10000, 0, true),
  ('T Inativo',  30, 28500, 5, false),
  ('T Excluir',  60, 54000, 10, false);

-- ===================================================== 1 · o que cada um vê

set local request.jwt.claims = '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar((select count(*) from pacote_clave where nome like 'T %') = 3,
  'a equipe com permissao em pacotes ve os tres do teste');

-- Exclui pelo caminho da tela: um único update, com as duas colunas.
update pacote_clave set ativo = false, excluido_em = now() where nome = 'T Excluir';

select pg_temp.afirmar(
  (select count(*) from pacote_clave where nome like 'T %' and excluido_em is null) = 2,
  'a lista do admin, que filtra excluido_em is null, mostra dois');
select pg_temp.afirmar((select count(*) from pacote_clave where nome like 'T %') = 3,
  'a linha do excluido continua existindo — e o log de auditoria aponta para ela');

reset role;

set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

-- O artista lê pela policy da 0007 (`ativo or tem_permissao('pacotes')`).
-- Nem o inativo nem o excluído aparecem, e não foi preciso emendar a policy:
-- o check `excluido_em is null or not ativo` é que faz o excluído nunca ser
-- `ativo`.
select pg_temp.afirmar((select count(*) from pacote_clave where nome like 'T %') = 1,
  'O ARTISTA VE SO O ATIVO — nem inativo, nem excluido');
select pg_temp.afirmar((select nome from pacote_clave where nome like 'T %') = 'T Ativo',
  'e o que ele ve e o pacote ativo');

-- Artista não escreve pacote. `insert` é 42501; `update` não alcança linha.
do $$
begin
  begin
    insert into pacote_clave (nome, quantidade_claves, valor_centavos) values ('Pirata', 1, 100);
    raise exception 'FALHOU: artista criou pacote' using errcode = 'TS001';
  exception
    when insufficient_privilege then null;
  end;
end $$;

select pg_temp.afirmar_sem_efeito(
  $$update pacote_clave set valor_centavos = 1 where nome = 'T Ativo'$$,
  'artista nao edita pacote');

reset role;

-- ============================================ 2 · excluir implica inativo

-- O check, e não a Server Action. Um `update` que exclua deixando `ativo`
-- verdadeiro é recusado pelo banco.
do $$
begin
  begin
    update pacote_clave set excluido_em = now() where nome = 'T Ativo';
    raise exception 'FALHOU: excluiu deixando ativo' using errcode = 'TS001';
  exception
    when check_violation then null;
  end;
end $$;

select pg_temp.afirmar((select excluido_em is null from pacote_clave where nome = 'T Ativo'),
  'o pacote ativo seguiu intacto');

-- ============================================ 3 · exclusao irreversivel

do $$
begin
  begin
    update pacote_clave set excluido_em = null where nome = 'T Excluir';
    raise exception 'FALHOU: pacote excluido voltou' using errcode = 'TS001';
  exception
    when sqlstate 'DS014' then null;
  end;
end $$;

-- Reativar um excluído também é barrado — pelo check, por outro caminho.
do $$
begin
  begin
    update pacote_clave set ativo = true where nome = 'T Excluir';
    raise exception 'FALHOU: pacote excluido foi reativado' using errcode = 'TS001';
  exception
    when check_violation then null;
  end;
end $$;

-- ================================================== 4 · auditoria do log

-- A nota da tela 21 promete: "Toda mudança de preço fica registrada em log."
-- O trigger da 0007 é que cumpre; aqui só se confere que a exclusão entrou.
select pg_temp.afirmar(
  (select count(*) from log_auditoria where tabela = 'pacote_clave' and acao = 'update') >= 1,
  'a exclusao ficou no log de auditoria');

-- ---------------------------------------------------------------------------

reset role;
select 'OK 0007b_pacote_exclusao' as resultado;

rollback;
