-- ============================================================================
-- 0002f · `curador_publico` — o que o artista pode ver de um curador
--
-- ## O problema
--
-- `perfil_curador` já é legível por qualquer autenticado quando a situação é
-- `bronze_aprovado` ou `prata_aprovado` (policy da `0002`). Mas o **nome** não
-- mora ali: mora em `perfil`, cuja policy é
--
--     using (id = auth.uid() or e_admin())
--
-- Ou seja: o artista enxerga a linha do curador e **não** enxerga o nome dele.
-- Na prática, toda tela que lista curadores devolve zero linha — o embed
-- `perfil!inner(...)` do PostgREST vira um inner join com nada visível do outro
-- lado, e o resultado é uma lista vazia **sem erro nenhum**.
--
-- Apareceu ao montar o placeholder de seleção da R2, e bloquearia igualmente a
-- Seleção de Curadores (módulo 4) da R3, que é a tela de verdade.
--
-- ## Por que uma view, e não uma policy em `perfil`
--
-- Uma policy `for select` em `perfil` resolveria em uma linha, e foi descartada:
-- **RLS filtra linha, não coluna**. Liberar a linha do curador liberaria junto
-- `handle`, `cidade`, `idioma`, `situacao`, `aceite_termos_em` e
-- `desativada_em` — muito além do nome que a tela precisa.
--
-- A view expõe **exatamente** quatro colunas e nada mais. É o caso em que uma
-- view sem `security_invoker` é a ferramenta certa, e não um risco: ela roda
-- como o dono e por isso enxerga `perfil`, mas só pode devolver o que a sua
-- própria projeção nomeia, e o `where` a prende aos curadores aprovados.
--
-- ⚠️ É o **oposto** da decisão de `saldo_carteira`, que é `security_invoker =
-- true` justamente para herdar a RLS. A diferença é o propósito: lá a view é um
-- recorte privado de dado financeiro; aqui é uma vitrine deliberadamente
-- pública. Quem mexer nesta view precisa saber que está editando a fronteira.
-- ============================================================================

create view curador_publico as
select
  pc.id            as perfil_curador_id,
  pc.classe,
  pc.situacao,
  -- O nome de exibição quando existe; o completo como fallback. É a mesma
  -- precedência que o resto do produto usa.
  coalesce(p.nome_exibicao, p.nome_completo) as nome
from perfil_curador pc
join perfil p on p.id = pc.perfil_id
where pc.situacao in ('bronze_aprovado', 'prata_aprovado')
  and p.situacao = 'ativa';

comment on view curador_publico is
  'Projecao publica do curador aprovado: so id, classe, situacao e nome. Sem security_invoker de proposito — `perfil` e privado, e esta view e a unica porta. Ver o cabecalho da 0002f.';

-- `anon` fica de fora: a vitrine pública da homepage é R5 e terá o seu próprio
-- recorte. Hoje só quem está autenticado escolhe curador.
revoke all on curador_publico from public, anon;
grant select on curador_publico to authenticated;
