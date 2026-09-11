-- ============================================================================
-- 0002d · O aceite de termos entra no contexto de sessão  (R1)
--
-- Deveria ter entrado na `0002b`, junto das outras quatro informações. Não
-- entrou porque a necessidade só aparece com o **login social**, e ela aparece
-- de forma que não dá para contornar na aplicação.
--
-- No cadastro por e-mail o aceite é obrigatório e o trigger
-- `criar_perfil_para_novo_usuario` grava `aceite_termos_em` a partir de
-- `raw_user_meta_data`. No login social não existe esse momento: o provedor
-- devolve nome e e-mail, a conta nasce no callback, e **ninguém aceitou nada**.
-- O protótipo resolve prometendo que "você confirma antes de criar", o que um
-- provider nativo não permite — a conta já existe quando voltamos.
--
-- A solução é uma tela de confirmação depois do callback (`/cadastrar/confirmar`),
-- e é aí que o contexto de sessão passa a importar: sem `aceite_termos` aqui, a
-- pessoa que fecha a aba naquela tela volta a entrar com sessão válida e
-- **nunca mais** a vê. Ficaria uma conta ativa sem aceite registrado, que é
-- exatamente o que a LGPD exige que exista (RF-010).
--
-- Com o campo no contexto, a guarda de rota trata o aceite como trata o papel:
-- enquanto falta, todo caminho leva de volta à tela que o coleta.
-- ============================================================================

drop function if exists ler_contexto_sessao();

create function ler_contexto_sessao()
returns table (
  papeis papel[],
  cadastro_curador_concluido boolean,
  situacao situacao_conta,
  situacao_curador situacao_curador,
  onboarding_visto boolean,
  ultimo_ambiente papel,
  aceite_termos boolean
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
    p.ultimo_ambiente,
    p.aceite_termos_em is not null
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
  'Papeis, cadastro do curador, situacao da conta, situacao do curador, onboarding, ultimo ambiente e aceite de termos — numa ida ao banco. Consumida pelo middleware a cada navegacao.';

revoke execute on function ler_contexto_sessao() from public, anon;
grant execute on function ler_contexto_sessao() to authenticated;
