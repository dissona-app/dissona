-- ============================================================================
-- Testes da migration 0010 · RPCs de seleção e SLA
--
-- **Não** roda concatenado a `_ajuda.sql`: precisa de dois curadores, e por
-- isso monta os próprios atores. Traz só o helper `afirmar`, que é o único que
-- usa. A transação abre e fecha aqui.
--
-- É o teste do **ciclo econômico completo**: crédito, seleção com preço
-- congelado, débito por envio, devolução por SLA e volta do saldo. Cobre o item
-- do gate da R2 "devolução de 7 dias volta ao extrato e tira a faixa da fila" e
-- o RF-070 ("o crédito devolvido não entra como ganho").
--
-- Dois pontos que este arquivo registra, porque foram o schema recusando
-- estados inválidos durante a escrita:
--
--  1. `check (total_claves > 0)` barrou a primeira versão de
--     `confirmar_selecao_curadores`, que inseria o envio com zero e só depois
--     somava os serviços. Corrigido na `0010b`: o subtotal é apurado antes.
--  2. `check (devolucao_em > prazo_em)` recusa forçar o vencimento mexendo só
--     em `devolucao_em`. O teste move os dois marcos, preservando a ordem.
--
-- ISOLAMENTO: todo `insert ... select` de fixture é **filtrado pelo ator do
-- teste**, e não varre a tabela inteira. A primeira versão fazia
-- `select pa.id from perfil_artista pa` sem `where`, o que funcionava só
-- enquanto o teste era o único dono de linhas. Quando `dados-e2e.sql` criou o
-- artista da suíte E2E, cada `insert` daqueles passou a produzir **duas**
-- linhas, e `avisar_prazo_72h()` devolveu 2 em vez de 1 — uma falha cujo
-- sintoma não aponta para a causa. O projeto Supabase é compartilhado
-- (open-questions #25); "a tabela é minha" nunca foi verdade.
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
grant select on ator to authenticated, anon;
insert into ator (papel, id) values
  ('artista',  '11111111-1111-1111-1111-111111111111'),
  ('curador',  '33333333-3333-3333-3333-333333333333'),
  ('curador2', '66666666-6666-6666-6666-666666666666');

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
insert into papel_usuario (perfil_id, papel)
select a.id, 'curador'::papel from ator a where a.papel like 'curador%';

insert into perfil_artista (perfil_id) select id from ator where papel = 'artista';
insert into perfil_curador (perfil_id, classe, situacao, cadastro_concluido_em, passo_cadastro)
select id, 'prata', 'prata_aprovado', now(), 8 from ator where papel like 'curador%';

insert into servico_curador (perfil_curador_id, tipo, preco_claves)
select pc.id, 'feedback', 2.00 from perfil_curador pc
 where pc.perfil_id in (select id from ator);

-- Só um dos dois oferece playlist: é o que prova o subtotal por curador.
insert into servico_curador (perfil_curador_id, tipo, preco_claves)
select pc.id, 'playlist', 1.50 from perfil_curador pc
 join ator a on a.id = pc.perfil_id where a.papel = 'curador';

insert into lancamento_clave (perfil_artista_id, tipo, quantidade, descricao)
select pa.id, 'ajuste', 10, 'Credito de teste' from perfil_artista pa
 where pa.perfil_id in (select id from ator);

insert into faixa (perfil_artista_id, titulo, origem, arquivo_caminho, situacao)
select pa.id, 'Faixa do ciclo', 'arquivo', a.id::text || '/f/1.mp3', 'aguardando_selecao'
from perfil_artista pa join ator a on a.id = pa.perfil_id where a.papel = 'artista';

-- ============================ confirmar_selecao_curadores =================

set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

do $$
declare
  v_envios uuid[];
begin
  select array_agg(x) into v_envios from confirmar_selecao_curadores(
    (select f.id from faixa f limit 1),
    jsonb_build_array(
      jsonb_build_object('perfil_curador_id',
        (select pc.id from perfil_curador pc join ator a on a.id = pc.perfil_id
          where a.papel = 'curador'), 'servicos', jsonb_build_array('playlist')),
      jsonb_build_object('perfil_curador_id',
        (select pc.id from perfil_curador pc join ator a on a.id = pc.perfil_id
          where a.papel = 'curador2'))
    )) as t(x);

  perform pg_temp.afirmar(array_length(v_envios, 1) = 2, 'dois envios foram criados');
end $$;

reset role;

select pg_temp.afirmar((select count(*) from envio) = 2, 'dois envios no banco');

-- Preço congelado, por curador e por serviço contratado.
select pg_temp.afirmar(
  (select total_claves from envio e join perfil_curador pc on pc.id = e.perfil_curador_id
    join ator a on a.id = pc.perfil_id where a.papel = 'curador') = 3.50,
  'o curador com feedback + playlist custa 3,50 Claves'
);
select pg_temp.afirmar(
  (select total_claves from envio e join perfil_curador pc on pc.id = e.perfil_curador_id
    join ator a on a.id = pc.perfil_id where a.papel = 'curador2') = 2.00,
  'o curador so com feedback custa 2,00 Claves'
);
select pg_temp.afirmar((select count(*) from servico_envio) = 3,
  'tres servicos congelados: feedback+playlist de um, feedback do outro');

-- Um lançamento por envio, e não um agregado: é o que permite a devolução por
-- envio e a coluna "Origem" do extrato.
select pg_temp.afirmar((select count(*) from lancamento_clave where tipo = 'consumo') = 2,
  'UM lancamento de consumo por envio');
select pg_temp.afirmar(
  (select sum(quantidade) from lancamento_clave where tipo = 'consumo') = -5.50,
  'o debito total e 5,50 Claves');

select pg_temp.afirmar((select situacao from faixa) = 'em_curadoria',
  'a faixa foi para em_curadoria');
select pg_temp.afirmar(
  (select count(*) from notificacao where evento = 'selecao_confirmada') = 1
  and (select count(*) from notificacao where evento = 'nova_musica_na_fila') = 2,
  'o artista foi notificado uma vez, e cada curador uma vez');
select pg_temp.afirmar(
  (select prazo_em > now() + interval '71 hours' and prazo_em < now() + interval '73 hours'
     from envio limit 1),
  'o prazo de 72h veio de configuracao, e nao de um literal');

set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;
select pg_temp.afirmar((select disponivel from saldo_carteira) = 4.50,
  'disponivel caiu para 4,50');
select pg_temp.afirmar((select comprometido from saldo_carteira) = 5.50,
  'comprometido subiu para 5,50');

-- ------------------------------------------------- saldo insuficiente ------

reset role;
insert into faixa (perfil_artista_id, titulo, origem, arquivo_caminho, situacao)
select pa.id, 'Faixa caro', 'arquivo', '1/f/2.mp3', 'aguardando_selecao' from perfil_artista pa
 where pa.perfil_id in (select id from ator);
update servico_curador set preco_claves = 99
 where tipo = 'feedback'
   and perfil_curador_id in (select pc.id from perfil_curador pc
                              where pc.perfil_id in (select id from ator));

set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

do $$
begin
  begin
    perform confirmar_selecao_curadores(
      (select f.id from faixa f where f.titulo = 'Faixa caro'),
      jsonb_build_array(jsonb_build_object('perfil_curador_id',
        (select pc.id from perfil_curador pc limit 1))));
    raise exception 'FALHOU: confirmou sem saldo' using errcode = 'TS001';
  exception
    when sqlstate 'DS010' then null;
  end;
end $$;

-- ============================ devolver_claves_sem_resposta ================

reset role;
update servico_curador set preco_claves = 2
 where tipo = 'feedback'
   and perfil_curador_id in (select pc.id from perfil_curador pc
                              where pc.perfil_id in (select id from ator));

-- Move os **dois** marcos para o passado, preservando a ordem: o check
-- `devolucao_em > prazo_em` recusa mexer só num deles — e está certo.
update envio set prazo_em = now() - interval '8 days',
                 devolucao_em = now() - interval '1 hour'
 where faixa_id in (select f.id from faixa f
                     join perfil_artista pa on pa.id = f.perfil_artista_id
                    where pa.perfil_id in (select id from ator));

select pg_temp.afirmar(devolver_claves_sem_resposta() = 2,
  'a devolucao alcancou os dois envios vencidos');
select pg_temp.afirmar((select count(*) from envio where situacao = 'devolvido') = 2,
  'os dois envios ficaram devolvidos');
select pg_temp.afirmar(
  (select sum(quantidade) from lancamento_clave where tipo = 'devolucao') = 5.50,
  'as 5,50 Claves voltaram ao extrato');
select pg_temp.afirmar((select situacao from faixa where titulo = 'Faixa do ciclo') = 'concluida',
  'sem envio ativo, a faixa saiu da fila');
select pg_temp.afirmar((select count(*) from notificacao where evento = 'claves_devolvidas') = 2,
  'o artista foi notificado das duas devolucoes');

-- RF-070, a parte que se esquece: o crédito volta ao artista e **não** vira
-- ganho do curador.
select pg_temp.afirmar((select count(*) from ganho_curador) = 0,
  'CREDITO DEVOLVIDO NAO GERA GANHO PARA O CURADOR (RF-070)');

-- Idempotência do job: a segunda passada não devolve de novo. A defesa real é
-- o índice único parcial `(envio_id) where tipo = 'devolucao'`.
select pg_temp.afirmar(devolver_claves_sem_resposta() = 0,
  'a segunda passada do job nao encontra nada');
select pg_temp.afirmar((select count(*) from lancamento_clave where tipo = 'devolucao') = 2,
  'nao houve devolucao duplicada');

set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;
select pg_temp.afirmar((select disponivel from saldo_carteira) = 10.00,
  'o saldo voltou a 10 Claves');
select pg_temp.afirmar((select comprometido from saldo_carteira) = 0.00,
  'nada mais comprometido');
select pg_temp.afirmar((select devolvido from saldo_carteira) = 5.50,
  'o bloco "devolvidas por falta de resposta" mostra 5,50');

-- ============================ avisar_prazo_72h ============================

reset role;
insert into faixa (perfil_artista_id, titulo, origem, arquivo_caminho, situacao)
select pa.id, 'Faixa com prazo perto', 'arquivo', '1/f/3.mp3', 'em_curadoria'
from perfil_artista pa where pa.perfil_id in (select id from ator);

insert into envio (faixa_id, perfil_curador_id, total_claves, prazo_em, devolucao_em)
select f.id, pc.id, 2, now() + interval '6 hours', now() + interval '5 days'
from faixa f, perfil_curador pc
where f.titulo = 'Faixa com prazo perto'
  and pc.perfil_id = '33333333-3333-3333-3333-333333333333';

select pg_temp.afirmar(avisar_prazo_72h() = 1, 'o aviso alcancou o envio com prazo perto');
select pg_temp.afirmar((select count(*) from notificacao where evento = 'prazo_72h_proximo') = 1,
  'o curador foi avisado');
select pg_temp.afirmar(avisar_prazo_72h() = 0,
  'o job nao avisa o mesmo envio duas vezes — e o que avisado_prazo_em resolve');

-- ---------------------------------------------------------------------------

reset role;
select 'OK 0010_rpcs_sla' as resultado;

rollback;
