-- ============================================================================
-- Testes da migration 0006 · faixas e envios
--
-- Roda concatenado a `_ajuda.sql`. Ver o cabeçalho daquele arquivo.
-- ============================================================================

-- ------------------------------------------------------------- fixtures ----

insert into perfil_artista (perfil_id) select id from ator where papel = 'artista';
insert into perfil_artista (perfil_id) select id from ator where papel = 'vizinho';

insert into perfil_curador (perfil_id, classe, situacao, cadastro_concluido_em, passo_cadastro)
select id, 'prata', 'prata_aprovado', now(), 8 from ator where papel = 'curador';

insert into servico_curador (perfil_curador_id, tipo, preco_claves)
select pc.id, 'feedback', 2.00
from perfil_curador pc join ator a on a.id = pc.perfil_id where a.papel = 'curador';

-- Uma faixa por arquivo, com o caminho no formato que a policy do bucket exige:
-- `<uid>/...`, comparado por igualdade exata.
insert into faixa (perfil_artista_id, titulo, origem, arquivo_caminho, duracao_segundos, situacao)
select pa.id, 'Dissonancia Suave', 'arquivo',
       a.id::text || '/faixa-1/dissonancia.mp3', 187, 'em_curadoria'
from perfil_artista pa join ator a on a.id = pa.perfil_id where a.papel = 'artista';

insert into envio (faixa_id, perfil_curador_id, total_claves, prazo_em, devolucao_em)
select f.id, pc.id, 2.00, now() + interval '72 hours', now() + interval '7 days'
from faixa f, perfil_curador pc
where f.titulo = 'Dissonancia Suave';

insert into servico_envio (envio_id, servico_curador_id, tipo, preco_claves)
select e.id, sc.id, 'feedback', 2.00
from envio e, servico_curador sc;

-- O objeto correspondente no bucket, para provar a policy do Storage.
insert into storage.objects (bucket_id, name, owner, owner_id)
select 'faixas', f.arquivo_caminho, a.id, a.id::text
from faixa f join perfil_artista pa on pa.id = f.perfil_artista_id
             join ator a on a.id = pa.perfil_id;

-- ------------------------------------------------------------------- checks

select pg_temp.afirmar_bloqueado(
  format('insert into faixa (perfil_artista_id, titulo, origem)
          values (%L, ''Sem arquivo'', ''arquivo'')',
         (select pa.id from perfil_artista pa join ator a on a.id = pa.perfil_id
           where a.papel = 'artista')),
  'origem arquivo exige arquivo_caminho'
);

select pg_temp.afirmar_bloqueado(
  format('insert into faixa (perfil_artista_id, titulo, origem)
          values (%L, ''Sem link'', ''link'')',
         (select pa.id from perfil_artista pa join ator a on a.id = pa.perfil_id
           where a.papel = 'artista')),
  'origem link exige ao menos uma URL'
);

select pg_temp.afirmar_bloqueado(
  format('insert into faixa (perfil_artista_id, titulo, origem, url_spotify, duracao_segundos)
          values (%L, ''Longa demais'', ''link'', ''https://sp.test/x'', 7200)',
         (select pa.id from perfil_artista pa join ator a on a.id = pa.perfil_id
           where a.papel = 'artista')),
  'duracao acima de uma hora e implausivel e recusada'
);

-- Arquivo e link convivem: e o que `upload.armazenar_sempre = true` exige.
insert into faixa (perfil_artista_id, titulo, origem, url_spotify, arquivo_caminho)
select pa.id, 'Link com audio guardado', 'link',
       'https://open.spotify.com/track/x', a.id::text || '/faixa-2/copia.mp3'
from perfil_artista pa join ator a on a.id = pa.perfil_id where a.papel = 'artista';

select pg_temp.afirmar(
  (select arquivo_caminho is not null and url_spotify is not null
     from faixa where titulo = 'Link com audio guardado'),
  'faixa por link pode guardar o audio — a escuta precisa dele'
);

-- Um curador nao entra duas vezes na mesma faixa (regras 7).
select pg_temp.afirmar_bloqueado(
  format('insert into envio (faixa_id, perfil_curador_id, total_claves, prazo_em, devolucao_em)
          values (%L, %L, 2.00, now() + interval ''72 hours'', now() + interval ''7 days'')',
         (select id from faixa where titulo = 'Dissonancia Suave'),
         (select id from perfil_curador)),
  'o mesmo curador nao e selecionado duas vezes para a mesma faixa'
);

select pg_temp.afirmar_bloqueado(
  format('insert into envio (faixa_id, perfil_curador_id, total_claves, prazo_em, devolucao_em)
          values (%L, %L, 2.00, now() + interval ''7 days'', now() + interval ''72 hours'')',
         (select id from faixa where titulo = 'Link com audio guardado'),
         (select id from perfil_curador)),
  'a devolucao nunca vem antes do prazo'
);

-- ========================================================= como o ARTISTA ==

reset role;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar(
  pg_temp.quantas('select 1 from faixa') = 2,
  'artista ve as proprias faixas'
);

select pg_temp.afirmar(
  pg_temp.quantas('select 1 from envio') = 1,
  'artista ve o envio da propria faixa'
);

select pg_temp.afirmar(
  pg_temp.quantas('select 1 from servico_envio') = 1,
  'artista ve o servico contratado no proprio envio'
);

-- Faixa em curadoria e contrato em andamento: o conteudo congela (DS013).
do $$
begin
  begin
    update faixa set titulo = 'Titulo trocado no meio da curadoria'
     where titulo = 'Dissonancia Suave';
    raise exception 'FALHOU: o artista reescreveu faixa em curadoria' using errcode = 'TS001';
  exception
    when sqlstate 'DS013' then null;
  end;
end $$;

-- Mas o que nao e conteudo da avaliacao continua editavel.
update faixa set capa_caminho = 'capas/nova.png' where titulo = 'Dissonancia Suave';

select pg_temp.afirmar(
  (select capa_caminho from faixa where titulo = 'Dissonancia Suave') = 'capas/nova.png',
  'a capa continua editavel mesmo em curadoria'
);

-- Rascunho, sim: e o wizard.
update faixa set titulo = 'Renomeada em rascunho' where titulo = 'Link com audio guardado';

select pg_temp.afirmar(
  pg_temp.quantas('select 1 from faixa where titulo = ''Renomeada em rascunho''') = 1,
  'faixa em rascunho e editavel'
);

select pg_temp.afirmar_sem_efeito(
  'delete from faixa where titulo = ''Dissonancia Suave''',
  'faixa em curadoria nao e apagada'
);

delete from faixa where titulo = 'Renomeada em rascunho';

select pg_temp.afirmar(
  pg_temp.quantas('select 1 from faixa') = 1,
  'o rascunho foi descartado'
);

select pg_temp.afirmar_bloqueado(
  format('insert into envio (faixa_id, perfil_curador_id, total_claves, prazo_em, devolucao_em)
          values (%L, %L, 2.00, now() + interval ''72 hours'', now() + interval ''7 days'')',
         (select id from faixa limit 1),
         (select pc.id from perfil_curador pc limit 1)),
  'artista nao cria envio direto — so confirmar_selecao_curadores'
);

-- ========================================================= como o VIZINHO ==

reset role;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar_invisivel('select 1 from faixa', 'vizinho nao ve faixa alheia');
select pg_temp.afirmar_invisivel('select 1 from envio', 'vizinho nao ve envio alheio');
select pg_temp.afirmar_invisivel('select 1 from servico_envio', 'vizinho nao ve servico alheio');

select pg_temp.afirmar_invisivel(
  'select 1 from storage.objects where bucket_id = ''faixas''',
  'vizinho nao alcanca o audio de outro artista'
);

-- ========================================================= como o CURADOR ==

reset role;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar(
  pg_temp.quantas('select 1 from faixa') = 1,
  'curador ve a faixa que esta avaliando'
);

select pg_temp.afirmar(
  pg_temp.quantas('select 1 from envio') = 1,
  'curador ve o proprio envio'
);

-- A policy do bucket. É o teste que pega o erro de `perfil_curador_id` versus
-- `auth.uid()` — o mesmo que estava no rascunho da R0.
select pg_temp.afirmar(
  pg_temp.quantas('select 1 from storage.objects where bucket_id = ''faixas''') = 1,
  'curador com envio ativo alcanca o audio'
);

-- Avançar o estado na fila funciona.
update envio set situacao = 'ouviu', ouviu_em = now();
update envio set situacao = 'avaliando', iniciou_em = now();

select pg_temp.afirmar(
  (select situacao from envio) = 'avaliando',
  'curador avanca Recebeu -> Ouviu -> Avaliando'
);

-- Mas o estado terminal fecha dinheiro, e sai só das RPCs (DS004).
do $$
begin
  begin
    update envio set situacao = 'pronto', concluido_em = now();
    raise exception 'FALHOU: o curador concluiu o envio sem avaliacao' using errcode = 'TS001';
  exception
    when sqlstate 'DS004' then null;
  end;
end $$;

do $$
begin
  begin
    update envio set situacao = 'devolvido';
    raise exception 'FALHOU: o curador devolveu o envio' using errcode = 'TS001';
  exception
    when sqlstate 'DS004' then null;
  end;
end $$;

-- ------------------------------- e quando o envio deixa de estar ativo ------

reset role;
-- Como `postgres`: `current_user` deixa de ser `authenticated`, então o trigger
-- de estado terminal libera — é o mesmo caminho que as RPCs usam.
update envio set situacao = 'pronto', concluido_em = now();

set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar_invisivel(
  'select 1 from faixa',
  'com o envio concluido, a faixa sai do alcance do curador'
);

select pg_temp.afirmar_invisivel(
  'select 1 from storage.objects where bucket_id = ''faixas''',
  'com o envio concluido, o audio sai do alcance do curador'
);

-- O envio em si continua visível: é o histórico dele, e a base do financeiro.
select pg_temp.afirmar(
  pg_temp.quantas('select 1 from envio') = 1,
  'o envio concluido continua visivel para o curador'
);

-- ==================================================== sem sessao (anon) ====

reset role;
set local request.jwt.claims = '{"role":"anon"}';
set local role anon;

select pg_temp.afirmar_invisivel('select 1 from faixa', 'anon nao le faixa');
select pg_temp.afirmar_invisivel('select 1 from envio', 'anon nao le envio');

-- ---------------------------------------------------------------------------

reset role;
select 'OK 0006_faixa_envio' as resultado;

rollback;
