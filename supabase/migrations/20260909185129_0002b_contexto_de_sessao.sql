-- ============================================================================
-- 0002b · `ler_contexto_sessao` passa a devolver o contexto inteiro  (R1)
--
-- A versão da `0002` devolvia duas informações: papéis ativos e conclusão do
-- cadastro do curador. A guarda de rota da fatia de autenticação precisa de
-- quatro a mais, e o motivo de estarem todas aqui é o mesmo que criou a função:
-- o middleware roda em `gru1`, o banco está em `us-west-2`, e cada ida custa
-- ~120 ms (architecture §9). Seis informações numa consulta continuam sendo
-- **uma** ida; seis consultas seriam 720 ms por navegação.
--
--   `situacao`          conta `bloqueada` não pode navegar — hoje o banner
--                       "Conta bloqueada" existe na copy e nada o dispara.
--   `situacao_curador`  candidato a Prata **não** entra no painel ("Assim que
--                       for aprovado... o acesso à curadoria é liberado", 12.5).
--                       `cadastro_curador_concluido` não distingue isso.
--   `onboarding_visto`  RF-007.
--   `ultimo_ambiente`   RF-008.
--
-- `drop` e não `create or replace`: mudar a lista de colunas de uma função
-- `returns table` é mudar o tipo de retorno, e o Postgres recusa a substituição.
-- ============================================================================

drop function if exists ler_contexto_sessao();

create function ler_contexto_sessao()
returns table (
  papeis papel[],
  cadastro_curador_concluido boolean,
  situacao situacao_conta,
  situacao_curador situacao_curador,
  onboarding_visto boolean,
  ultimo_ambiente papel
)
language sql
security definer
stable
set search_path = ''
as $funcao$
  -- `from (values (auth.uid()))` com `left join` em vez de subconsultas
  -- escalares: garante **exatamente uma** linha mesmo quando não há `perfil`,
  -- e o chamador em TypeScript usa `.single()`. Zero linhas ali viraria uma
  -- exceção no middleware, ou seja, um 500 em toda navegação.
  select
    coalesce(pap.papeis, '{}'::public.papel[]),
    cur.cadastro_concluido_em is not null,
    p.situacao,
    cur.situacao,
    p.onboarding_visto_em is not null,
    p.ultimo_ambiente
  from (values (auth.uid())) as sessao (id)
  left join public.perfil p on p.id = sessao.id
  left join public.perfil_curador cur on cur.perfil_id = sessao.id
  left join lateral (
    select array_agg(pu.papel order by pu.papel) as papeis
      from public.papel_usuario pu
     where pu.perfil_id = sessao.id
       and pu.ativo
  ) pap on true;
$funcao$;

comment on function ler_contexto_sessao() is
  'Papeis, cadastro do curador, situacao da conta, situacao do curador, onboarding e ultimo ambiente — numa ida ao banco. Consumida pelo middleware a cada navegacao.';

revoke execute on function ler_contexto_sessao() from public, anon;
grant execute on function ler_contexto_sessao() to authenticated;
