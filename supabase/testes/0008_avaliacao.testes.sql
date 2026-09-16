-- ============================================================================
-- Testes da migration 0008 · avaliação
--
-- Roda concatenado a `_ajuda.sql`. Ver o cabeçalho daquele arquivo.
--
-- Cobre as policies de `criterio`, `avaliacao`, `nota_criterio` e
-- `compartilhamento`, os dois triggers de `avaliacao` e as views
-- `nota_avaliacao` e `nota_artista` (`security_invoker`). Era a lacuna maior
-- da R2: as três tabelas da avaliação não tinham evidência de policy.
--
-- Os atores de `_ajuda.sql` não bastam: isolamento **entre curadores** pede um
-- segundo curador, criado aqui.
-- ============================================================================

-- ------------------------------------------------------------- fixtures ----

insert into ator (papel, id) values ('curador2', '55555555-5555-5555-5555-555555555555');

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
from ator a where a.papel = 'curador2';

insert into papel_usuario (perfil_id, papel)
select id, 'curador'::papel from ator where papel = 'curador2';

insert into membro_admin (perfil_id, papel_admin)
select id, 'administrador' from ator where papel = 'admin';

insert into perfil_artista (perfil_id) select id from ator where papel in ('artista', 'vizinho');

insert into perfil_curador (perfil_id, classe, situacao, cadastro_concluido_em, passo_cadastro)
select id, 'bronze', 'bronze_aprovado', now(), 8 from ator where papel in ('curador', 'curador2');

-- Ids dos fixtures, para toda asserção filtrar por eles: o projeto é
-- compartilhado com a suíte E2E, e contar `from avaliacao` sem filtro contaria
-- as avaliações dela.
create temporary table fx (nome text primary key, id uuid) on commit drop;
grant select on fx to authenticated, anon;

with novo as (
  insert into faixa (perfil_artista_id, titulo, origem, arquivo_caminho, duracao_segundos, situacao)
  select pa.id, 'Faixa 0008', 'arquivo', a.id::text || '/f/0008.mp3', 200, 'em_curadoria'
    from perfil_artista pa join ator a on a.id = pa.perfil_id where a.papel = 'artista'
  returning id
)
insert into fx select 'faixa', id from novo;

with novo as (
  insert into faixa (perfil_artista_id, titulo, origem, arquivo_caminho, duracao_segundos, situacao)
  select pa.id, 'Faixa 0008 concluida', 'arquivo', a.id::text || '/f/0008c.mp3', 200, 'em_curadoria'
    from perfil_artista pa join ator a on a.id = pa.perfil_id where a.papel = 'artista'
  returning id
)
insert into fx select 'faixa_concluida', id from novo;

-- Envio A: do curador, com avaliação em rascunho.
-- Envio B: mesma faixa, do curador2, ainda sem avaliação.
-- Envio C: do curador, com avaliação concluída.
with novo as (
  insert into envio (faixa_id, perfil_curador_id, total_claves, prazo_em, devolucao_em, situacao)
  select (select id from fx where nome = 'faixa'), pc.id, 2.00,
         now() + interval '72 hours', now() + interval '7 days', 'avaliando'
    from perfil_curador pc where pc.perfil_id = (select id from ator where papel = 'curador')
  returning id
)
insert into fx select 'envio_a', id from novo;

with novo as (
  insert into envio (faixa_id, perfil_curador_id, total_claves, prazo_em, devolucao_em, situacao)
  select (select id from fx where nome = 'faixa'), pc.id, 2.00,
         now() + interval '72 hours', now() + interval '7 days', 'avaliando'
    from perfil_curador pc where pc.perfil_id = (select id from ator where papel = 'curador2')
  returning id
)
insert into fx select 'envio_b', id from novo;

with novo as (
  insert into envio (faixa_id, perfil_curador_id, total_claves, prazo_em, devolucao_em, situacao)
  select (select id from fx where nome = 'faixa_concluida'), pc.id, 2.00,
         now() + interval '72 hours', now() + interval '7 days', 'pronto'
    from perfil_curador pc where pc.perfil_id = (select id from ator where papel = 'curador')
  returning id
)
insert into fx select 'envio_c', id from novo;

with novo as (
  insert into avaliacao (envio_id, perfil_curador_id, passo_atual, escuta_percentual)
  select (select id from fx where nome = 'envio_a'), pc.id, 1, 10
    from perfil_curador pc where pc.perfil_id = (select id from ator where papel = 'curador')
  returning id
)
insert into fx select 'aval_a', id from novo;

with novo as (
  insert into avaliacao (envio_id, perfil_curador_id, nota_subjetiva, feedback, escuta_percentual,
                         situacao, passo_atual, no_prazo, classe_no_momento, concluida_em)
  select (select id from fx where nome = 'envio_c'), pc.id, 4.0, 'Feedback de teste', 100,
         'concluida', 5, true, 'bronze', now()
    from perfil_curador pc where pc.perfil_id = (select id from ator where papel = 'curador')
  returning id
)
insert into fx select 'aval_c', id from novo;

insert into nota_criterio (avaliacao_id, criterio, nota) values
  ((select id from fx where nome = 'aval_a'), 'afinacao', 3.5),
  ((select id from fx where nome = 'aval_c'), 'afinacao', 4.0),
  ((select id from fx where nome = 'aval_c'), 'ritmo',    5.0);

insert into compartilhamento (avaliacao_id, modalidade)
values ((select id from fx where nome = 'aval_c'), 'nao_compartilhou');

-- ========================================================= curador dono ====

reset role;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar(
  pg_temp.quantas('select 1 from criterio') = 11,
  'autenticado le os 11 criterios'
);
select pg_temp.afirmar_bloqueado(
  $q$insert into criterio (chave, grupo, rotulo, ordem) values ('novo', 'impacto', 'Novo', 12)$q$,
  'ninguem cria criterio pela API'
);
select pg_temp.afirmar_sem_efeito(
  $q$update criterio set rotulo = 'x' where chave = 'afinacao'$q$,
  'ninguem edita criterio pela API'
);

select pg_temp.afirmar(
  pg_temp.quantas($q$select 1 from avaliacao where id in (select id from fx where nome in ('aval_a','aval_c'))$q$) = 2,
  'curador le as proprias avaliacoes, rascunho e concluida'
);
select pg_temp.afirmar(
  pg_temp.quantas($q$select 1 from nota_criterio where avaliacao_id in (select id from fx where nome in ('aval_a','aval_c'))$q$) = 3,
  'curador le as notas das proprias avaliacoes'
);

-- "Salvar e sair": o rascunho é editável pelo dono.
update avaliacao set passo_atual = 2 where id = (select id from fx where nome = 'aval_a');
select pg_temp.afirmar(
  (select passo_atual from avaliacao where id = (select id from fx where nome = 'aval_a')) = 2,
  'curador edita o proprio rascunho'
);

-- A escuta só cresce: 60 grava, 20 depois não desfaz.
update avaliacao set escuta_percentual = 60 where id = (select id from fx where nome = 'aval_a');
update avaliacao set escuta_percentual = 20 where id = (select id from fx where nome = 'aval_a');
select pg_temp.afirmar(
  (select escuta_percentual from avaliacao where id = (select id from fx where nome = 'aval_a')) = 60,
  'escuta_percentual e monotonica (um F5 nao apaga o progresso)'
);

select pg_temp.afirmar_sqlstate(
  $q$update avaliacao set situacao = 'concluida' where id = (select id from fx where nome = 'aval_a')$q$,
  'DS004',
  'concluir por update direto e recusado: so enviar_avaliacao conclui'
);
select pg_temp.afirmar_sqlstate(
  $q$update avaliacao set feedback = 'reescrito' where id = (select id from fx where nome = 'aval_c')$q$,
  'DS005',
  'avaliacao concluida nao se reescreve'
);

-- Notas e compartilhamento: só no rascunho.
insert into nota_criterio (avaliacao_id, criterio, nota)
values ((select id from fx where nome = 'aval_a'), 'ritmo', 4.5);
select pg_temp.afirmar(
  pg_temp.quantas($q$select 1 from nota_criterio
                    where avaliacao_id = (select id from fx where nome = 'aval_a') and criterio = 'ritmo'$q$) = 1,
  'curador da nota no proprio rascunho'
);
select pg_temp.afirmar_bloqueado(
  $q$insert into nota_criterio (avaliacao_id, criterio, nota)
     values ((select id from fx where nome = 'aval_c'), 'melodia', 4.0)$q$,
  'nota nova em avaliacao concluida e negada'
);
select pg_temp.afirmar_sem_efeito(
  $q$update nota_criterio set nota = 0 where avaliacao_id = (select id from fx where nome = 'aval_c')$q$,
  'nota de avaliacao concluida nao muda'
);
select pg_temp.afirmar_sem_efeito(
  $q$delete from compartilhamento where avaliacao_id = (select id from fx where nome = 'aval_c')$q$,
  'compartilhamento de avaliacao concluida nao se apaga'
);
insert into compartilhamento (avaliacao_id, modalidade, descricao)
values ((select id from fx where nome = 'aval_a'), 'outros', 'Radio comunitaria');
select pg_temp.afirmar(
  pg_temp.quantas($q$select 1 from compartilhamento
                    where avaliacao_id = (select id from fx where nome = 'aval_a')$q$) = 1,
  'curador registra compartilhamento no proprio rascunho'
);

-- Criar avaliação em nome de outro curador.
select pg_temp.afirmar_bloqueado(
  $q$insert into avaliacao (envio_id, perfil_curador_id)
     select (select id from fx where nome = 'envio_b'), pc.id
       from perfil_curador pc where pc.perfil_id = (select id from ator where papel = 'curador2')$q$,
  'curador nao cria avaliacao em nome de outro curador'
);

-- Criar avaliação, em nome próprio, sobre o envio de **outro** curador. A
-- `envio_id` é unique: se isto passasse, o curador ocuparia a avaliação do
-- colega, que nunca mais conseguiria iniciar a dele.
select pg_temp.afirmar_bloqueado(
  $q$insert into avaliacao (envio_id, perfil_curador_id)
     select (select id from fx where nome = 'envio_b'), meu_perfil_curador_id()$q$,
  'curador nao cria avaliacao sobre envio que nao e dele'
);
select pg_temp.afirmar_bloqueado(
  $q$update avaliacao set envio_id = (select id from fx where nome = 'envio_b')
      where id = (select id from fx where nome = 'aval_a')$q$,
  'curador nao move o proprio rascunho para envio alheio (0008b)'
);

-- ============================================================ curador2 ====

reset role;
set local request.jwt.claims = '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar_invisivel(
  $q$select 1 from avaliacao where id in (select id from fx where nome in ('aval_a','aval_c'))$q$,
  'outro curador nao le avaliacao alheia'
);
select pg_temp.afirmar_invisivel(
  $q$select 1 from nota_criterio where avaliacao_id in (select id from fx where nome in ('aval_a','aval_c'))$q$,
  'outro curador nao le nota alheia'
);
select pg_temp.afirmar_invisivel(
  $q$select 1 from compartilhamento where avaliacao_id in (select id from fx where nome in ('aval_a','aval_c'))$q$,
  'outro curador nao le compartilhamento alheio'
);
select pg_temp.afirmar_sem_efeito(
  $q$update avaliacao set feedback = 'invasao' where id = (select id from fx where nome = 'aval_a')$q$,
  'outro curador nao edita rascunho alheio'
);
select pg_temp.afirmar_bloqueado(
  $q$insert into nota_criterio (avaliacao_id, criterio, nota)
     values ((select id from fx where nome = 'aval_a'), 'letra', 1.0)$q$,
  'outro curador nao da nota em avaliacao alheia'
);

-- E cria a própria, sobre o próprio envio.
insert into avaliacao (envio_id, perfil_curador_id)
values ((select id from fx where nome = 'envio_b'), meu_perfil_curador_id());
select pg_temp.afirmar(
  pg_temp.quantas($q$select 1 from avaliacao where envio_id = (select id from fx where nome = 'envio_b')$q$) = 1,
  'curador cria avaliacao sobre o proprio envio'
);

-- ============================================================= artista ====

reset role;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar(
  pg_temp.quantas($q$select 1 from avaliacao where id = (select id from fx where nome = 'aval_c')$q$) = 1,
  'artista le a avaliacao concluida da propria faixa'
);
select pg_temp.afirmar_invisivel(
  $q$select 1 from avaliacao where id = (select id from fx where nome = 'aval_a')$q$,
  'artista nao le o rascunho do curador'
);
select pg_temp.afirmar(
  pg_temp.quantas($q$select 1 from nota_criterio where avaliacao_id = (select id from fx where nome = 'aval_c')$q$) = 2,
  'artista le as notas da avaliacao concluida'
);
select pg_temp.afirmar_invisivel(
  $q$select 1 from nota_criterio where avaliacao_id = (select id from fx where nome = 'aval_a')$q$,
  'artista nao le notas do rascunho'
);
select pg_temp.afirmar_sem_efeito(
  $q$update avaliacao set feedback = 'melhorado' where id = (select id from fx where nome = 'aval_c')$q$,
  'artista nao edita a avaliacao'
);
select pg_temp.afirmar_sem_efeito(
  $q$update nota_criterio set nota = 5 where avaliacao_id = (select id from fx where nome = 'aval_c')$q$,
  'artista nao muda a propria nota'
);
select pg_temp.afirmar_bloqueado(
  $q$insert into avaliacao (envio_id, perfil_curador_id)
     select (select id from fx where nome = 'envio_b'), pc.id
       from perfil_curador pc where pc.perfil_id = (select id from ator where papel = 'curador2')$q$,
  'artista nao cria avaliacao'
);

-- Views `security_invoker`: herdam a mesma regra.
select pg_temp.afirmar(
  (select nf from nota_avaliacao where avaliacao_id = (select id from fx where nome = 'aval_c')) = 8.50,
  'nota_avaliacao: NF = media(4,5) + 4 = 8.50, visivel ao artista'
);
select pg_temp.afirmar(
  pg_temp.quantas($q$select 1 from nota_artista na join perfil_artista pa on pa.id = na.perfil_artista_id
                    where pa.perfil_id = auth.uid()$q$) = 1,
  'nota_artista: o artista le a propria media'
);

-- ============================================================= vizinho ====

reset role;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar_invisivel(
  $q$select 1 from avaliacao where id in (select id from fx where nome in ('aval_a','aval_c'))$q$,
  'outro artista nao le avaliacao de faixa alheia'
);
select pg_temp.afirmar_invisivel(
  $q$select 1 from nota_avaliacao where avaliacao_id = (select id from fx where nome = 'aval_c')$q$,
  'nota_avaliacao nao vaza para outro artista (security_invoker)'
);
select pg_temp.afirmar_invisivel(
  $q$select 1 from nota_artista na join perfil_artista pa on pa.id = na.perfil_artista_id
      where pa.perfil_id = (select id from ator where papel = 'artista')$q$,
  'nota_artista nao vaza para outro artista'
);

-- =============================================================== admin ====

reset role;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar(
  pg_temp.quantas($q$select 1 from avaliacao where id in (select id from fx where nome in ('aval_a','aval_c'))$q$) = 2,
  'admin le todas as avaliacoes'
);
select pg_temp.afirmar_sem_efeito(
  $q$update avaliacao set feedback = 'admin' where id = (select id from fx where nome = 'aval_a')$q$,
  'admin le, mas nao edita avaliacao'
);

-- ================================================================ anon ====

reset role;
set local request.jwt.claims = '{"role":"anon"}';
set local role anon;

select pg_temp.afirmar(
  not has_table_privilege('anon', 'avaliacao', 'select')
  or pg_temp.quantas('select 1 from avaliacao') = 0,
  'anon nao le avaliacao'
);
select pg_temp.afirmar(
  not has_table_privilege('anon', 'nota_criterio', 'select')
  or pg_temp.quantas('select 1 from nota_criterio') = 0,
  'anon nao le nota'
);

-- ---------------------------------------------------------------------------

reset role;
select 'OK 0008_avaliacao' as resultado;

rollback;
