-- ============================================================================
-- Testes da migration 0001c · colunas de sessão e guarda da situação
--
-- Roda concatenado a `_ajuda.sql`, que abre a transação e cria os atores.
-- Ver o cabeçalho daquele arquivo.
--
-- O que mais importa aqui é a segunda metade: até a `0001c`, a policy
-- "perfil: dono atualiza a propria linha" deixava o dono escrever `situacao`,
-- e uma conta **bloqueada** se reativava sozinha. A suíte prova que não mais —
-- e prova também que o job de expurgo continua passando, que é o jeito fácil de
-- quebrar uma guarda dessas.
-- ============================================================================

-- ------------------------------------------------ as colunas novas ----------

select pg_temp.afirmar(
  (select count(*) from perfil
    where id in (select id from ator)
      and onboarding_visto_em is null
      and ultimo_ambiente is null
      and senha_alterada_em is null) = 4,
  'onboarding_visto_em, ultimo_ambiente e senha_alterada_em nascem nulas'
);

-- `ultimo_ambiente` é do tipo `papel`, e não texto livre: um ambiente que não
-- existe não chega ao roteamento pós-login.
select pg_temp.afirmar_sqlstate(
  format('update perfil set ultimo_ambiente = %L where id = %L',
         'financeiro', (select id from ator where papel = 'artista')),
  '22P02',
  'ultimo_ambiente fora do enum papel e recusado'
);

update perfil set ultimo_ambiente = 'curador'
 where id = (select id from ator where papel = 'artista');

select pg_temp.afirmar(
  (select ultimo_ambiente from perfil
    where id = (select id from ator where papel = 'artista')) = 'curador',
  'ultimo_ambiente aceita um papel valido (RF-008)'
);

-- ================================================== o dono da conta =========

reset role;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar_sqlstate(
  'update perfil set situacao = ''bloqueada''
    where id = ''11111111-1111-1111-1111-111111111111''',
  'DS020',
  'o dono nao se bloqueia — bloqueio e decisao do admin (20.2/23.2)'
);

select pg_temp.afirmar_sqlstate(
  'update perfil set situacao = ''excluida''
    where id = ''11111111-1111-1111-1111-111111111111''',
  'DS020',
  'o dono nao marca a conta como excluida — isso e do job de expurgo'
);

-- Exclusão de conta (RF-024). O trigger grava o marco dos 30 dias sozinho:
-- `desativada` sem `desativada_em` ficaria fora do índice parcial que
-- `expurgar_contas_excluidas` consulta, e a conta nunca seria apagada.
update perfil set situacao = 'desativada'
 where id = '11111111-1111-1111-1111-111111111111';

select pg_temp.afirmar(
  (select situacao = 'desativada' and desativada_em is not null
     from perfil where id = '11111111-1111-1111-1111-111111111111'),
  'o dono desativa a conta e o trigger grava desativada_em'
);

-- "Reversível nesse prazo entrando de novo" (regras §10).
update perfil set situacao = 'ativa'
 where id = '11111111-1111-1111-1111-111111111111';

select pg_temp.afirmar(
  (select situacao = 'ativa' and desativada_em is null
     from perfil where id = '11111111-1111-1111-1111-111111111111'),
  'entrar de novo reverte a exclusao e limpa desativada_em'
);

-- =========================================================== o admin ========

reset role;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
set local role authenticated;

update perfil set situacao = 'bloqueada'
 where id = '22222222-2222-2222-2222-222222222222';

select pg_temp.afirmar(
  (select situacao from perfil where id = '22222222-2222-2222-2222-222222222222')
    = 'bloqueada',
  'o admin bloqueia qualquer conta'
);

-- ================================== a conta bloqueada, por si mesma =========

reset role;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
set local role authenticated;

-- O furo que a `0001c` fecha. Sem o trigger, este update passava: a policy
-- libera a linha, e RLS não filtra coluna.
select pg_temp.afirmar_sqlstate(
  'update perfil set situacao = ''ativa''
    where id = ''22222222-2222-2222-2222-222222222222''',
  'DS020',
  'conta bloqueada NAO se reativa sozinha'
);

select pg_temp.afirmar_sqlstate(
  'update perfil set situacao = ''desativada''
    where id = ''22222222-2222-2222-2222-222222222222''',
  'DS020',
  'conta bloqueada tambem nao sai do bloqueio por desativacao'
);

-- Ela continua podendo editar o resto da própria linha — o bloqueio é de
-- acesso, não de escrita de perfil.
update perfil set cidade = 'Belem'
 where id = '22222222-2222-2222-2222-222222222222';

select pg_temp.afirmar(
  (select cidade from perfil where id = '22222222-2222-2222-2222-222222222222')
    = 'Belem',
  'a guarda e da coluna situacao, e nao da linha inteira'
);

-- ============================== contexto de sistema (sem sessao) ============

reset role;
set local request.jwt.claims = '{}';

-- `pg_cron` roda `expurgar_contas_excluidas` com `auth.uid()` nulo, e ele leva
-- `desativada` a `excluida`. Barrar o contexto sem sessão faria a guarda
-- derrubar o cumprimento da LGPD — é o efeito colateral clássico deste tipo de
-- trigger, e por isso está afirmado.
update perfil set situacao = 'desativada'
 where id = '33333333-3333-3333-3333-333333333333';
update perfil set situacao = 'excluida'
 where id = '33333333-3333-3333-3333-333333333333';

select pg_temp.afirmar(
  (select situacao from perfil where id = '33333333-3333-3333-3333-333333333333')
    = 'excluida',
  'contexto de sistema leva desativada a excluida (job de expurgo, 0011)'
);

-- ---------------------------------------------------------------------------

reset role;
select 'OK 0001c_perfil_sessao' as resultado;

rollback;
