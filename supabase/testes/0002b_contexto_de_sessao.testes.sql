-- ============================================================================
-- Testes da migration 0002b · o contexto de sessão inteiro numa consulta
--
-- Roda concatenado a `_ajuda.sql`. Ver o cabeçalho daquele arquivo.
--
-- Esta função é chamada pelo middleware **a cada navegação**. Duas coisas
-- precisam ser verdade sempre, e as duas estão afirmadas aqui:
--
--   1. devolve exatamente uma linha, inclusive quando não há `perfil` — o
--      chamador usa `.single()`, e zero linhas ali é um 500 em toda navegação;
--   2. as seis informações vêm juntas, porque seis idas a `us-west-2` seriam
--      ~720 ms por página (architecture §9).
-- ============================================================================

-- --------------------------------------------------------------- fixtures ---

insert into perfil_curador (perfil_id, classe, situacao, cadastro_concluido_em, passo_cadastro)
select id, 'bronze', 'bronze_aprovado', now(), 8
from ator where papel = 'curador';

update perfil
   set onboarding_visto_em = now(),
       ultimo_ambiente = 'curador'
 where id = (select id from ator where papel = 'curador');

-- ========================================================= como o CURADOR ==

reset role;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar(
  pg_temp.quantas('select 1 from ler_contexto_sessao()') = 1,
  'ler_contexto_sessao devolve exatamente uma linha'
);

select pg_temp.afirmar(
  (select papeis @> array['curador']::papel[]
      and cadastro_curador_concluido
      and situacao = 'ativa'
      and situacao_curador = 'bronze_aprovado'
      and onboarding_visto
      and ultimo_ambiente = 'curador'
     from ler_contexto_sessao()),
  'as seis informacoes vem juntas, numa ida ao banco'
);

-- ========================================================= como o ARTISTA ==

reset role;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar(
  (select papeis = array['artista']::papel[]
      and not cadastro_curador_concluido
      and situacao_curador is null
      and not onboarding_visto
      and ultimo_ambiente is null
     from ler_contexto_sessao()),
  'sem perfil_curador: cadastro pendente, situacao_curador nula, onboarding nao visto'
);

-- Papel desativado sai da lista: reverter papel é `ativo = false`, nunca
-- delete (0001), e a guarda de rota tem de deixar de reconhecê-lo.
reset role;
update papel_usuario set ativo = false
 where perfil_id = '11111111-1111-1111-1111-111111111111';

set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar(
  (select papeis = '{}'::papel[] from ler_contexto_sessao()),
  'papel inativo nao aparece em papeis'
);

-- ============================ sessao sem linha de perfil ====================

-- É o caso que motivou o `left join` em vez das subconsultas escalares. Não
-- deveria acontecer — o trigger cria o `perfil` no mesmo instante da conta —,
-- mas se acontecer o middleware tem de degradar, e não estourar.
reset role;
set local request.jwt.claims = '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar(
  pg_temp.quantas('select 1 from ler_contexto_sessao()') = 1,
  'sessao sem linha de perfil ainda devolve uma linha'
);

select pg_temp.afirmar(
  (select papeis = '{}'::papel[] and situacao is null and not onboarding_visto
     from ler_contexto_sessao()),
  'sem perfil: papeis vazio e situacao nula, sem erro'
);

-- ==================================================== sem sessao (anon) ====

reset role;
set local request.jwt.claims = '{"role":"anon"}';
set local role anon;

select pg_temp.afirmar_bloqueado(
  'select 1 from ler_contexto_sessao()',
  'anon nao executa ler_contexto_sessao'
);

-- ---------------------------------------------------------------------------

reset role;
select 'OK 0002b_contexto_de_sessao' as resultado;

rollback;
