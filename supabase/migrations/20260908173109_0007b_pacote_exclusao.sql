-- ============================================================================
-- 0007b · Exclusão de pacote  (corretiva da 0007)
--
-- A `0007` deu a `pacote_clave` policies de insert e update e **nenhuma** de
-- delete, com o comentário "excluir pacote na tela A3 é `ativo = false`". Ao
-- portar a tela, o protótipo mostrou que isso não fecha: a tela 21 tem as duas
-- ações, com consequências diferentes e copy que as distingue.
--
--   Desativar → "Só os pacotes ativos aparecem na Carteira do artista."
--               O pacote continua na lista do admin, com status Inativo, e
--               volta com um clique.
--   Excluir   → "O pacote sai da Carteira do artista na hora. Compras já
--               feitas continuam válidas e a exclusão fica registrada em log.
--               Se a ideia for só tirar de circulação, desative."
--
-- Se as duas virarem `ativo = false`, a segunda frase do modal passa a
-- descrever a primeira ação, e a tela fica sem como mostrar o resultado de
-- cada uma. Daí `excluido_em`: exclusão lógica, que preserva a FK de
-- `pedido_clave` (é o que faz "compras já feitas continuam válidas" ser
-- verdade) e mantém a linha para o log de auditoria apontar.
--
-- Duas garantias no schema, em vez de confiança no código:
--
--  1. `check (excluido_em is null or not ativo)` — excluir implica inativo.
--     Assim a policy de leitura da `0007` (`ativo or tem_permissao('pacotes')`)
--     já esconde o excluído do artista, sem precisar de emenda.
--  2. Trigger que proíbe ressuscitar. "Excluir" é irreversível pela tela; um
--     `update` que zere `excluido_em` é recusado, e não silenciosamente aceito.
-- ============================================================================

alter table pacote_clave
  add column excluido_em timestamptz;

comment on column pacote_clave.excluido_em is
  'Exclusao logica (21, acao Excluir). Distinta de ativo=false (acao Desativar): o excluido sai da lista do admin, o inativo permanece com status Inativo. Nulavel porque pedido_clave referencia o pacote e compra feita continua valida.';

alter table pacote_clave
  add constraint pacote_clave_excluido_e_inativo
    check (excluido_em is null or not ativo);

-- Índice parcial para a lista do admin, que é sempre "não excluídos".
create index pacote_clave_vivos_idx on pacote_clave (quantidade_claves)
  where excluido_em is null;

-- --------------------------------------------------------- guarda de exclusão

-- `security invoker` de propósito. A lição da `0006c`: uma guarda `security
-- definer` que decide por `current_user` nunca dispara, porque dentro de uma
-- função definer o `current_user` já é o dono. Aqui a guarda não olha para
-- `current_user` nenhum — mas fica `invoker` pelo mesmo princípio: guarda de
-- integridade não precisa de privilégio, e privilégio que não é preciso é
-- superfície de ataque.
create or replace function proibir_reviver_pacote()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $funcao$
begin
  if old.excluido_em is not null and new.excluido_em is null then
    raise exception 'pacote excluido nao volta; crie um novo'
      using errcode = 'DS030';
  end if;
  return new;
end $funcao$;

comment on function proibir_reviver_pacote() is
  'Exclusao de pacote e irreversivel. Sem isto, um update que zere excluido_em traria de volta um pacote cujo preco ja saiu de circulacao.';

create trigger pacote_clave_exclusao_irreversivel
  before update of excluido_em on pacote_clave
  for each row execute function proibir_reviver_pacote();
