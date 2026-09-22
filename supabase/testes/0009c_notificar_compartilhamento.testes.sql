-- ============================================================================
-- Testes da migration 0009c · notificação de compartilhamento
--
-- Autocontido: monta um artista, um curador, uma faixa, um envio e a avaliação
-- em rascunho — e então vira a avaliação para `concluida`, que é o gatilho.
--
-- O que se prova:
--
--  1. compartilhou (playlist / post / matéria) → **uma** notificação ao artista,
--     com a modalidade no contexto;
--  2. `nao_compartilhou` → **nenhuma**. É o "Não vou compartilhar desta vez" do
--     passo 14.2, e anunciá-lo seria avisar que nada aconteceu;
--  3. salvar rascunho não notifica — a cláusula `when` do trigger só pega a
--     virada para `concluida`, e sem ela cada "Salvar e sair" no passo 14.2
--     mandaria um aviso;
--  4. concluir de novo não notifica de novo (`old.situacao is distinct from`).
--
-- O `update` direto em `avaliacao` precisa preencher `concluida_em`, `no_prazo`
-- e `classe_no_momento`: é o `check` `avaliacao_concluida_congela`, e foi ele
-- que recusou a primeira versão deste teste. No produto quem preenche é
-- `enviar_avaliacao`.
-- ============================================================================

begin;

create function pg_temp.afirmar(p_ok boolean, p_rotulo text) returns void
language plpgsql as $$
begin
  if p_ok is not true then
    raise exception 'FALHOU: %', p_rotulo using errcode = 'TS001';
  end if;
end $$;

-- ------------------------------------------------------------- fixtures ----

create temporary table ator (papel text primary key, id uuid) on commit drop;
insert into ator (papel, id) values
  ('artista', 'aaaaaaaa-0009-0009-0009-aaaaaaaaaaaa'),
  ('curador', 'cccccccc-0009-0009-0009-cccccccccccc');

insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
select '00000000-0000-0000-0000-000000000000', a.id, 'authenticated', 'authenticated',
  't9c_' || a.papel || '@teste.dissona.local',
  extensions.crypt('s', extensions.gen_salt('bf')),
  now(), now(), now(), '{"provider":"email"}'::jsonb,
  jsonb_build_object('nome_completo', 'Teste ' || a.papel, 'aceite_termos', 'true')
from ator a;

insert into papel_usuario (perfil_id, papel)
select id, 'artista'::papel from ator where papel = 'artista';
insert into perfil_artista (perfil_id) select id from ator where papel = 'artista';

insert into papel_usuario (perfil_id, papel)
select id, 'curador'::papel from ator where papel = 'curador';
insert into perfil_curador (perfil_id, situacao, classe)
select id, 'bronze_aprovado', 'bronze' from ator where papel = 'curador';

create temporary table ids on commit drop as
select
  (select pa.id from perfil_artista pa join ator a on a.id = pa.perfil_id where a.papel = 'artista') as artista_id,
  (select pc.id from perfil_curador pc join ator a on a.id = pc.perfil_id where a.papel = 'curador') as curador_id,
  (select id from ator where papel = 'artista') as perfil_do_artista;

-- `arquivo_caminho` é exigido pelo check `faixa_arquivo_exige_caminho`: faixa
-- de origem `arquivo` sem áudio é faixa que o curador não pode ouvir.
insert into faixa (perfil_artista_id, titulo, origem, arquivo_caminho, situacao)
select artista_id, 'T9C Faixa', 'arquivo', artista_id || '/t9c.mp3', 'em_curadoria' from ids;

insert into envio (faixa_id, perfil_curador_id, total_claves, prazo_em, devolucao_em, situacao)
select f.id, i.curador_id, 2, now() + interval '72 hours', now() + interval '7 days', 'avaliando'
  from ids i join faixa f on f.titulo = 'T9C Faixa';

insert into avaliacao (envio_id, perfil_curador_id, situacao)
select e.id, i.curador_id, 'rascunho'
  from ids i join envio e on e.perfil_curador_id = i.curador_id;

create temporary table alvo on commit drop as
select a.id as avaliacao_id, i.perfil_do_artista
  from ids i join avaliacao a on a.perfil_curador_id = i.curador_id;

-- ============================ 3 · rascunho nao notifica (antes de concluir) =

insert into compartilhamento (avaliacao_id, modalidade)
select avaliacao_id, 'playlist' from alvo;

-- Um update que **não** vira o estado: é o "Salvar e sair" do passo 14.2.
update avaliacao set nota_subjetiva = 4.0 where id = (select avaliacao_id from alvo);

select pg_temp.afirmar(
  (select count(*) from notificacao
    where evento = 'musica_compartilhada'
      and perfil_id = (select perfil_do_artista from alvo)) = 0,
  'salvar rascunho NAO notifica — a clausula `when` so pega a virada');

-- ==================================== 1 · compartilhou → uma notificacao ==

update avaliacao
   set situacao = 'concluida', concluida_em = now(), no_prazo = true, classe_no_momento = 'bronze'
 where id = (select avaliacao_id from alvo);

select pg_temp.afirmar(
  (select count(*) from notificacao
    where evento = 'musica_compartilhada'
      and perfil_id = (select perfil_do_artista from alvo)) = 1,
  'compartilhou → o artista e notificado uma vez');

select pg_temp.afirmar(
  (select contexto ->> 'modalidade' from notificacao
    where evento = 'musica_compartilhada'
      and perfil_id = (select perfil_do_artista from alvo)) = 'playlist',
  'e a modalidade vai no contexto, para a central da R5 compor o texto');

-- ================================ 4 · concluir de novo nao notifica de novo =

update avaliacao set concluida_em = now() where id = (select avaliacao_id from alvo);

select pg_temp.afirmar(
  (select count(*) from notificacao
    where evento = 'musica_compartilhada'
      and perfil_id = (select perfil_do_artista from alvo)) = 1,
  'update numa avaliacao ja concluida nao notifica de novo');

-- =================================== 2 · nao_compartilhou → nenhuma =======

-- Segundo envio, do zero, para o caminho oposto.
insert into faixa (perfil_artista_id, titulo, origem, arquivo_caminho, situacao)
select artista_id, 'T9C Faixa Muda', 'arquivo', artista_id || '/t9c-muda.mp3', 'em_curadoria' from ids;

insert into envio (faixa_id, perfil_curador_id, total_claves, prazo_em, devolucao_em, situacao)
select f.id, i.curador_id, 2, now() + interval '72 hours', now() + interval '7 days', 'avaliando'
  from ids i join faixa f on f.titulo = 'T9C Faixa Muda';

insert into avaliacao (envio_id, perfil_curador_id, situacao)
select e.id, i.curador_id, 'rascunho'
  from ids i join envio e on e.faixa_id = (select id from faixa where titulo = 'T9C Faixa Muda');

create temporary table muda on commit drop as
select a.id as avaliacao_id
  from avaliacao a
  join envio e on e.id = a.envio_id
 where e.faixa_id = (select id from faixa where titulo = 'T9C Faixa Muda');

insert into compartilhamento (avaliacao_id, modalidade)
select avaliacao_id, 'nao_compartilhou' from muda;

update avaliacao
   set situacao = 'concluida', concluida_em = now(), no_prazo = true, classe_no_momento = 'bronze'
 where id = (select avaliacao_id from muda);

select pg_temp.afirmar(
  (select count(*) from notificacao
    where evento = 'musica_compartilhada'
      and perfil_id = (select perfil_do_artista from alvo)) = 1,
  'NAO_COMPARTILHOU NAO NOTIFICA — segue uma so, a do primeiro envio');

select 'OK — 0009c' as resultado;

rollback;
