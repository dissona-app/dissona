-- ============================================================================
-- Testes da migration 0002c · credenciais do protótipo e classificação
--
-- Roda concatenado a `_ajuda.sql`. Ver o cabeçalho daquele arquivo.
--
-- Três fronteiras, em ordem de importância:
--
--   1. A trava de autopromoção **continua fechada**. A `0002c` abre uma janela
--      para a RPC da 12.4, e a janela não pode virar caminho para Ouro. É a
--      primeira coisa afirmada, e de três ângulos.
--   2. `verificavel` conta anexo, não só link — sem isso a credencial de
--      formação, que se comprova por upload, deixaria o curador Bronze com a
--      comprovação na mão.
--   3. A classificação usa o threshold de `configuracao`, e não um número no
--      código. A asserção compara com a tabela, e não com "2".
-- ============================================================================

-- --------------------------------------------------------------- fixtures ---

-- Curador A: um só link comprovado — abaixo do mínimo, logo Bronze.
insert into perfil_curador (perfil_id, classe, situacao)
select id, 'bronze', 'rascunho' from ator where papel = 'curador';

-- Curador B (candidato a Prata) e C (sem o serviço feedback), contas próprias.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
values
  ('00000000-0000-0000-0000-000000000000', '55555555-5555-5555-5555-555555555555',
   'authenticated', 'authenticated', 't_curador_prata@teste.dissona.local',
   extensions.crypt('senha-de-teste-1', extensions.gen_salt('bf')),
   now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb,
   '{"nome_completo":"Teste curador prata","aceite_termos":"true"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000', '77777777-7777-7777-7777-777777777777',
   'authenticated', 'authenticated', 't_curador_sem_feedback@teste.dissona.local',
   extensions.crypt('senha-de-teste-1', extensions.gen_salt('bf')),
   now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb,
   '{"nome_completo":"Teste curador sem feedback","aceite_termos":"true"}'::jsonb);

insert into papel_usuario (perfil_id, papel) values
  ('55555555-5555-5555-5555-555555555555', 'curador'),
  ('77777777-7777-7777-7777-777777777777', 'curador');

insert into perfil_curador (perfil_id, classe, situacao) values
  ('55555555-5555-5555-5555-555555555555', 'bronze', 'rascunho'),
  ('77777777-7777-7777-7777-777777777777', 'bronze', 'rascunho');

-- Feedback é obrigatório para concluir (12.2). O curador C fica sem, de
-- propósito.
insert into servico_curador (perfil_curador_id, tipo, preco_claves)
select pc.id, 'feedback', 2.00 from perfil_curador pc
 where pc.perfil_id in (
   (select id from ator where papel = 'curador'),
   '55555555-5555-5555-5555-555555555555'
 );

-- O admin precisa ser membro da equipe para receber o alerta de 12.5.
insert into membro_admin (perfil_id, papel_admin)
select id, 'administrador' from ator where papel = 'admin';

-- ------------------------------------------------- os seis tipos do wizard --

select pg_temp.afirmar_bloqueado(
  format('insert into credencial_curador (perfil_curador_id, tipo, descricao)
          values (%L, ''premio'', ''fora do catalogo do prototipo'')',
         (select pc.id from perfil_curador pc join ator a on a.id = pc.perfil_id
           where a.papel = 'curador')),
  'tipo antigo (premio) sai — o catalogo e o do passo 6 do wizard'
);

select pg_temp.afirmar_bloqueado(
  format('insert into credencial_curador (perfil_curador_id, tipo, descricao)
          values (%L, ''veiculo'', ''nome antigo de imprensa'')',
         (select pc.id from perfil_curador pc join ator a on a.id = pc.perfil_id
           where a.papel = 'curador')),
  'tipo antigo (veiculo) sai — virou imprensa'
);

insert into credencial_curador (perfil_curador_id, tipo, descricao, url)
select pc.id, 'imprensa', 'Coluna na Revista X', 'https://exemplo.test/coluna'
from perfil_curador pc join ator a on a.id = pc.perfil_id where a.papel = 'curador';

insert into credencial_curador (perfil_curador_id, tipo, descricao)
select pc.id, 'anos', 'Cinco anos, sem link'
from perfil_curador pc join ator a on a.id = pc.perfil_id where a.papel = 'curador';

-- ------------------------------------------ verificavel conta o anexo -------

insert into credencial_curador (perfil_curador_id, tipo, descricao, url)
select pc.id, 'playlist', 'Playlist com 1.400 salvamentos',
       'https://open.spotify.com/playlist/x'
from perfil_curador pc where pc.perfil_id = '55555555-5555-5555-5555-555555555555';

insert into credencial_curador (perfil_curador_id, tipo, descricao, anexo_caminho)
select pc.id, 'formacao', 'Bacharelado em musica',
       '55555555-5555-5555-5555-555555555555/diploma.pdf'
from perfil_curador pc where pc.perfil_id = '55555555-5555-5555-5555-555555555555';

select pg_temp.afirmar(
  (select verificavel from credencial_curador where tipo = 'formacao'),
  'anexo torna a credencial verificavel — formacao nao se comprova por link'
);

select pg_temp.afirmar(
  not (select verificavel from credencial_curador where tipo = 'anos'),
  'sem link e sem anexo, a credencial nao conta'
);

-- ============================ curador A · abaixo do minimo -> Bronze ========

reset role;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
set local role authenticated;

-- A trava da `0002`, de três ângulos. A janela da `0002c` não pode abrir
-- nenhum deles.
select pg_temp.afirmar_sqlstate(
  'update perfil_curador set classe = ''ouro''
    where perfil_id = ''33333333-3333-3333-3333-333333333333''',
  'DS020',
  'curador NAO se promove a Ouro'
);

select pg_temp.afirmar_sqlstate(
  'update perfil_curador set situacao = ''prata_aprovado''
    where perfil_id = ''33333333-3333-3333-3333-333333333333''',
  'DS020',
  'curador NAO se aprova como Prata'
);

select pg_temp.afirmar_sqlstate(
  'update perfil_curador set classificado_em = now()
    where perfil_id = ''33333333-3333-3333-3333-333333333333''',
  'DS020',
  'curador nao falsifica a data de classificacao'
);

do $$
declare
  v_r record;
  v_minimo integer := (select (valor::text)::integer from configuracao
                        where chave = 'classe.prata_min_credenciais');
begin
  select * into v_r from concluir_cadastro_curador();

  perform pg_temp.afirmar(
    v_r.credenciais_verificaveis = 1 and v_r.minimo_para_prata = v_minimo,
    'a RPC conta as verificaveis e devolve o threshold de configuracao'
  );
  perform pg_temp.afirmar(
    v_r.classe = 'bronze' and v_r.situacao = 'bronze_aprovado',
    'abaixo do minimo: Bronze aprovado, liberado na hora (12.5)'
  );
end $$;

select pg_temp.afirmar(
  (select cadastro_concluido_em is not null and classificado_em is not null
     from perfil_curador where perfil_id = '33333333-3333-3333-3333-333333333333'),
  'a RPC fecha o cadastro e datou a classificacao'
);

-- A janela é de uma vez por cadastro: `old.situacao = 'rascunho'`.
select pg_temp.afirmar_sqlstate(
  'select 1 from concluir_cadastro_curador()',
  'DS015',
  'concluir duas vezes e recusado'
);

select pg_temp.afirmar_sqlstate(
  'update perfil_curador set classe = ''prata''
    where perfil_id = ''33333333-3333-3333-3333-333333333333''',
  'DS020',
  'ja classificado, o curador volta a nao poder mexer na classe'
);

-- ==================== curador B · no minimo ou acima -> Prata em analise ====

reset role;
set local request.jwt.claims = '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}';
set local role authenticated;

do $$
declare
  v_r record;
begin
  select * into v_r from concluir_cadastro_curador();

  perform pg_temp.afirmar(
    v_r.credenciais_verificaveis = 2 and v_r.situacao = 'prata_em_analise',
    'duas verificaveis (uma por link, uma por anexo) viram candidato a Prata'
  );

  -- A parte que mais confunde: candidato a Prata **e Bronze** na coluna
  -- `classe`, porque a promocao e o ato do admin em 20.3 — e `classe` e o que
  -- `calcular_remuneracao` (0009) le.
  perform pg_temp.afirmar(
    v_r.classe = 'bronze',
    'candidato a Prata segue Bronze na classe ate a aprovacao manual'
  );
end $$;

-- `prata_em_analise` fica fora da vitrine: a policy "aprovados sao publicos"
-- (0002) só reconhece bronze_aprovado e prata_aprovado. É o que sustenta
-- "o acesso à curadoria é liberado quando for aprovado" (12.5).
reset role;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar_invisivel(
  'select 1 from perfil_curador where situacao = ''prata_em_analise''',
  'candidato a Prata nao aparece para o artista'
);

select pg_temp.afirmar(
  pg_temp.quantas('select 1 from perfil_curador where situacao = ''bronze_aprovado''') = 1,
  'o Bronze aprovado aparece'
);

-- =================== curador C · sem o servico feedback -> recusado =========

reset role;
set local request.jwt.claims = '{"sub":"77777777-7777-7777-7777-777777777777","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar_sqlstate(
  'select 1 from concluir_cadastro_curador()',
  'DS012',
  'sem o servico feedback o cadastro nao conclui — seria contratavel e inutil'
);

-- ======================================== notificacoes de 12.5 =============

reset role;
set local request.jwt.claims = '{}';

select pg_temp.afirmar(
  exists (select 1 from notificacao
           where perfil_id = '33333333-3333-3333-3333-333333333333'
             and evento = 'bronze_aprovado'),
  'Bronze recebe as boas-vindas'
);

select pg_temp.afirmar(
  exists (select 1 from notificacao
           where perfil_id = '55555555-5555-5555-5555-555555555555'
             and evento = 'cadastro_em_analise'),
  'candidato a Prata recebe o aviso de analise'
);

select pg_temp.afirmar(
  exists (select 1 from notificacao
           where perfil_id = '44444444-4444-4444-4444-444444444444'
             and evento = 'curador_prata_em_analise'),
  'a equipe e alertada do candidato a Prata (12.5 -> 20.3)'
);

-- A janela não pode ficar aberta depois da RPC: `set_config` é local à
-- transação, e a suíte inteira é uma transação só.
select pg_temp.afirmar(
  coalesce(current_setting('dissona.classificacao', true), '') = '',
  'a janela da classificacao fecha ao fim da RPC'
);

-- ---------------------------------------------------------------------------

reset role;
select 'OK 0002c_credencial_e_classificacao' as resultado;

rollback;
