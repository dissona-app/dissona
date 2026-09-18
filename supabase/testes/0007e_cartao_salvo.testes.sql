-- ============================================================================
-- Testes da migration 0007e · `cartao_salvo`
--
-- Autocontido, como a `0007b`: monta **dois** artistas e prova o que o código
-- não pode garantir sozinho. Dois, e não um, porque a pergunta que importa aqui
-- é a que só existe com duas pessoas: *um artista alcança o cartão do outro?*
--
-- O que se prova:
--
--  1. cada um vê só o próprio cartão — e "ver" inclui o **token**, que é o que
--     permitiria cobrar no cartão alheio;
--  2. ninguém salva cartão em nome de outro (`with check`);
--  3. ninguém apaga o cartão de outro — e aqui o teste precisa distinguir
--     "negado" de "passou e não fez nada": `delete` fora do `using` afeta zero
--     linhas **sem erro**, que é exatamente o que `apagarCartao` interpreta
--     como "não é seu";
--  4. o dono apaga o próprio, que é o direito que a tela 7.2 oferece;
--  5. o `check` dos quatro dígitos recusa o que a tela não saberia mostrar — e
--     é a razão de `cartaoDaResposta` devolver `undefined` em vez de tentar.
--
-- `set local role authenticated` é obrigatório: `postgres` é `bypassrls`, e sem
-- trocar de papel todo teste de RLS passa vacuamente.
-- ============================================================================

begin;

create function pg_temp.afirmar(p_ok boolean, p_rotulo text) returns void
language plpgsql as $$
begin
  if p_ok is not true then
    raise exception 'FALHOU: %', p_rotulo using errcode = 'TS001';
  end if;
end $$;

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
  ('artista_a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('artista_b', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
select '00000000-0000-0000-0000-000000000000', a.id, 'authenticated', 'authenticated',
  't_' || a.papel || '@teste.dissona.local',
  extensions.crypt('s', extensions.gen_salt('bf')),
  now(), now(), now(), '{"provider":"email"}'::jsonb,
  jsonb_build_object('nome_completo', 'Teste ' || a.papel, 'aceite_termos', 'true')
from ator a;

insert into papel_usuario (perfil_id, papel) select a.id, 'artista'::papel from ator a;
insert into perfil_artista (perfil_id) select id from ator;

create temporary table perfis (papel text primary key, artista_id uuid) on commit drop;
-- `grant` como em `ator`: os blocos `do $$` abaixo rodam sob
-- `role authenticated`, e sem isto o próprio teste falha por permissão na
-- tabela temporária — antes de chegar à policy que ele quer provar.
grant select on perfis to authenticated, anon;
insert into perfis (papel, artista_id)
select a.papel, pa.id from ator a join perfil_artista pa on pa.perfil_id = a.id;

-- Um cartão para cada, semeados como superusuário: o que se testa abaixo é a
-- **leitura** e a **escrita** de cada um, não a semeadura.
insert into cartao_salvo (perfil_artista_id, token, ultimos_digitos, bandeira)
select p.artista_id, 'tok_' || p.papel, '4242', 'MASTERCARD' from perfis p;

-- ============================================ 1 · cada um vê só o próprio ==

set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar((select count(*) from cartao_salvo) = 1,
  'o artista A ve exatamente um cartao');
select pg_temp.afirmar((select token from cartao_salvo) = 'tok_artista_a',
  'E O TOKEN QUE ELE VE E O DELE — token alheio permitiria cobrar no cartao do outro');

-- ================================= 2 · ninguem salva em nome de outro =====

do $$
declare
  v_b uuid := (select artista_id from perfis where papel = 'artista_b');
begin
  begin
    insert into cartao_salvo (perfil_artista_id, token, ultimos_digitos)
    values (v_b, 'tok_pirata', '9999');
    raise exception 'FALHOU: artista A salvou cartao em nome do B' using errcode = 'TS001';
  exception
    when insufficient_privilege then null;
  end;
end $$;

-- ===================================== 3 · ninguem apaga o cartao de outro =

-- `delete` fora do `using` não estoura: afeta zero linhas. É o que
-- `apagarCartao` lê como "não é seu", e é por isso que o repositório confere a
-- contagem em vez de confiar na ausência de erro.
select pg_temp.afirmar_sem_efeito(
  $$delete from cartao_salvo where token = 'tok_artista_b'$$,
  'artista A nao apaga o cartao do B');

reset role;
select pg_temp.afirmar((select count(*) from cartao_salvo where token = 'tok_artista_b') = 1,
  'e o cartao do B continua la');

-- ============================================ 4 · o dono apaga o proprio ==

set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
set local role authenticated;

delete from cartao_salvo where token = 'tok_artista_a';
select pg_temp.afirmar((select count(*) from cartao_salvo) = 0,
  'o dono apaga o proprio cartao — o direito que a tela 7.2 oferece');

reset role;

-- ================================= 5 · o check dos quatro digitos ========

do $$
declare
  v_a uuid := (select artista_id from perfis where papel = 'artista_a');
begin
  begin
    insert into cartao_salvo (perfil_artista_id, token, ultimos_digitos)
    values (v_a, 'tok_mascarado', '**42');
    raise exception 'FALHOU: aceitou digitos mascarados' using errcode = 'TS001';
  exception
    when check_violation then null;
  end;

  begin
    -- O PAN inteiro é o engano perigoso: uma resposta mal lida poderia
    -- mandá-lo para a coluna que a tela exibe.
    insert into cartao_salvo (perfil_artista_id, token, ultimos_digitos)
    values (v_a, 'tok_pan', '5162306219378829');
    raise exception 'FALHOU: aceitou o numero inteiro em ultimos_digitos' using errcode = 'TS001';
  exception
    when check_violation then null;
  end;
end $$;

-- ================================= 6 · o mesmo token nao vira duas linhas =

do $$
declare
  v_a uuid := (select artista_id from perfis where papel = 'artista_a');
begin
  insert into cartao_salvo (perfil_artista_id, token, ultimos_digitos)
  values (v_a, 'tok_repetido', '4242');
  begin
    insert into cartao_salvo (perfil_artista_id, token, ultimos_digitos)
    values (v_a, 'tok_repetido', '4242');
    raise exception 'FALHOU: o mesmo token virou duas linhas' using errcode = 'TS001';
  exception
    when unique_violation then null;
  end;
end $$;

select 'OK — 0007e' as resultado;

rollback;
