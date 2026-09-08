-- ============================================================================
-- 0006c · `proibir_editar_faixa_em_curadoria` deixa de ser `security definer`
--
-- Na `0006` a função nasceu `security definer` **e** decidindo por
-- `current_user <> 'authenticated'`. As duas coisas juntas se anulam: dentro de
-- uma função `security definer` o `current_user` já é o dono (`postgres`),
-- então a primeira linha do corpo sempre dava a saída e o trigger nunca
-- bloqueava nada. O artista reescrevia o título de uma faixa em curadoria.
--
-- O critério de `current_user` está certo — é o que distingue, sem GUC
-- falsificável, uma escrita vinda do PostgREST de uma escrita vinda das RPCs.
-- O que estava errado era torná-lo cego. A função passa a `security invoker`:
--
--   · cliente pelo PostgREST  -> current_user = 'authenticated' -> bloqueia
--   · dentro de RPC `definer` -> current_user = 'postgres'      -> libera
--
-- Ela não lê tabela nenhuma (só OLD/NEW), e a chamada a `e_admin()` continua
-- funcionando: invocar uma função `definer` não muda o `current_user` de quem
-- invoca.
--
-- Comparação útil, porque a diferença é sutil: o irmão desta função em `0002`,
-- `proibir_autopromocao_de_classe`, é `security definer` de propósito — ele
-- decide por `e_admin()` e não por `current_user`, e por isso não sofre do
-- mesmo problema.
-- ============================================================================

create or replace function proibir_editar_faixa_em_curadoria()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $funcao$
begin
  -- `current_user` deixa de ser `authenticated` dentro das RPCs
  -- `security definer`, e é assim que elas passam por aqui.
  if current_user <> 'authenticated' or public.e_admin() then
    return new;
  end if;

  if old.situacao <> 'rascunho' and (
       new.titulo is distinct from old.titulo
    or new.arquivo_caminho is distinct from old.arquivo_caminho
    or new.url_spotify is distinct from old.url_spotify
    or new.url_youtube is distinct from old.url_youtube
    or new.contexto_curador is distinct from old.contexto_curador
    or new.genero is distinct from old.genero
    or new.duracao_segundos is distinct from old.duracao_segundos
  ) then
    raise exception 'faixa fora de rascunho nao muda de conteudo'
      using errcode = 'DS013';
  end if;

  return new;
end;
$funcao$;

revoke execute on function proibir_editar_faixa_em_curadoria() from public, anon, authenticated;
