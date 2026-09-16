-- ============================================================================
-- Testes das migrations 0002f (`curador_publico`) e 0006d (`fila_do_curador`)
--
-- Roda concatenado a `_ajuda.sql`. Ver o cabeçalho daquele arquivo.
--
-- As duas views são **sem** `security_invoker`: rodam como o dono e ignoram a
-- RLS de `perfil`. O `where` e a projeção de cada uma **são** a fronteira de
-- acesso, e por isso cada linha delas tem asserção aqui:
--
--  - `curador_publico`: só curador aprovado e com conta ativa; só quatro
--    colunas; nada para `anon`.
--  - `fila_do_curador`: cada curador vê só os próprios envios, com o nome do
--    artista; quem não é curador não vê nada.
-- ============================================================================

-- ------------------------------------------------------------- fixtures ----

insert into ator (papel, id) values
  ('curador2',  '55555555-5555-5555-5555-555555555555'),
  ('rascunho',  '66666666-6666-6666-6666-666666666666'),
  ('bloqueado', '77777777-7777-7777-7777-777777777777');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
select
  '00000000-0000-0000-0000-000000000000', a.id, 'authenticated', 'authenticated',
  't_' || a.papel || '@teste.dissona.local',
  extensions.crypt('senha-de-teste-1', extensions.gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('nome_completo', 'Teste ' || a.papel, 'aceite_termos', 'true')
from ator a where a.papel in ('curador2', 'rascunho', 'bloqueado');

insert into papel_usuario (perfil_id, papel)
select id, 'curador'::papel from ator where papel in ('curador2', 'rascunho', 'bloqueado');

update perfil set nome_exibicao = 'Artista Visivel'
 where id = (select id from ator where papel = 'artista');
update perfil set situacao = 'bloqueada'
 where id = (select id from ator where papel = 'bloqueado');

insert into perfil_artista (perfil_id) select id from ator where papel in ('artista', 'vizinho');

insert into perfil_curador (perfil_id, classe, situacao, cadastro_concluido_em, passo_cadastro)
select id, 'bronze', 'bronze_aprovado', now(), 8
  from ator where papel in ('curador', 'curador2', 'bloqueado');
insert into perfil_curador (perfil_id, classe, situacao, passo_cadastro)
select id, 'bronze', 'rascunho', 3 from ator where papel = 'rascunho';

create temporary table fx (nome text primary key, id uuid) on commit drop;
grant select on fx to authenticated, anon;

with novo as (
  insert into faixa (perfil_artista_id, titulo, origem, arquivo_caminho, duracao_segundos, situacao)
  select pa.id, 'Faixa views', 'arquivo', a.id::text || '/f/views.mp3', 180, 'em_curadoria'
    from perfil_artista pa join ator a on a.id = pa.perfil_id where a.papel = 'artista'
  returning id
)
insert into fx select 'faixa', id from novo;

with novo as (
  insert into envio (faixa_id, perfil_curador_id, total_claves, prazo_em, devolucao_em, situacao)
  select (select id from fx where nome = 'faixa'), pc.id, 2.00,
         now() + interval '72 hours', now() + interval '7 days', 'recebeu'
    from perfil_curador pc where pc.perfil_id = (select id from ator where papel = 'curador')
  returning id
)
insert into fx select 'envio_curador', id from novo;

with novo as (
  insert into envio (faixa_id, perfil_curador_id, total_claves, prazo_em, devolucao_em, situacao)
  select (select id from fx where nome = 'faixa'), pc.id, 2.00,
         now() + interval '72 hours', now() + interval '7 days', 'recebeu'
    from perfil_curador pc where pc.perfil_id = (select id from ator where papel = 'curador2')
  returning id
)
insert into fx select 'envio_curador2', id from novo;

-- ============================================================ estrutura ====

select pg_temp.afirmar(
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'curador_publico') = 4,
  'curador_publico expoe exatamente quatro colunas'
);
select pg_temp.afirmar(
  not has_table_privilege('anon', 'curador_publico', 'select')
  and not has_table_privilege('anon', 'fila_do_curador', 'select'),
  'anon nao tem select nas duas views'
);
select pg_temp.afirmar(
  has_table_privilege('authenticated', 'curador_publico', 'select')
  and has_table_privilege('authenticated', 'fila_do_curador', 'select'),
  'authenticated tem select nas duas views'
);

-- ============================================== artista: curador_publico ====

reset role;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

-- A premissa da view: sem ela, `perfil` do curador é invisível ao artista.
select pg_temp.afirmar_invisivel(
  $q$select 1 from perfil where id = (select id from ator where papel = 'curador')$q$,
  'premissa: artista nao le perfil do curador direto'
);

select pg_temp.afirmar(
  (select nome from curador_publico cp
     join perfil_curador pc on pc.id = cp.perfil_curador_id
    where pc.perfil_id = (select id from ator where papel = 'curador')) = 'Teste curador',
  'artista ve o nome do curador aprovado pela view'
);
select pg_temp.afirmar_invisivel(
  $q$select 1 from curador_publico cp join perfil_curador pc on pc.id = cp.perfil_curador_id
      where pc.perfil_id = (select id from ator where papel = 'rascunho')$q$,
  'curador em rascunho nao aparece na vitrine'
);
select pg_temp.afirmar_invisivel(
  $q$select 1 from curador_publico where perfil_curador_id in (
       select pc.id from perfil_curador pc where pc.perfil_id = (select id from ator where papel = 'bloqueado'))$q$,
  'curador com conta bloqueada nao aparece na vitrine'
);

-- ============================================== artista: fila_do_curador ====

select pg_temp.afirmar_invisivel(
  $q$select 1 from fila_do_curador where envio_id in (select id from fx where nome like 'envio_%')$q$,
  'artista (sem perfil de curador) nao ve fila nenhuma'
);

-- ============================================== curador: fila_do_curador ====

reset role;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar(
  (select artista from fila_do_curador where envio_id = (select id from fx where nome = 'envio_curador'))
    = 'Artista Visivel',
  'curador ve o proprio envio com o nome de exibicao do artista'
);
select pg_temp.afirmar_invisivel(
  $q$select 1 from fila_do_curador where envio_id = (select id from fx where nome = 'envio_curador2')$q$,
  'curador nao ve o envio de outro curador na fila'
);
select pg_temp.afirmar_invisivel(
  $q$select 1 from perfil where id = (select id from ator where papel = 'artista')$q$,
  'premissa: curador nao le perfil do artista direto'
);

reset role;
set local request.jwt.claims = '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar(
  pg_temp.quantas($q$select 1 from fila_do_curador where envio_id in (select id from fx where nome like 'envio_%')$q$) = 1,
  'curador2 ve so o proprio envio'
);

-- ---------------------------------------------------------------------------

reset role;
select 'OK 0002f_0006d_views_de_fronteira' as resultado;

rollback;
