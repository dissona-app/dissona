-- ============================================================================
-- 0003e · `NULLIF` é gramática, não função  (R1)
--
-- `atualizar_meu_cargo` (0003d) chamava `pg_catalog.nullif(...)`, e essa função
-- **não existe**:
--
--     function pg_catalog.nullif(unknown, unknown) does not exist   -- 42883
--
-- `NULLIF` é uma construção da gramática SQL, como `CASE` e `COALESCE` — o
-- parser a expande em `CASE WHEN a = b THEN NULL ELSE a END`. Nenhuma delas
-- está em `pg_proc`, então nenhuma delas pode ser qualificada por schema.
--
-- ## Por que o erro apareceu
--
-- É o efeito colateral de uma regra boa. Toda função nossa tem
-- `set search_path = ''` (architecture §5.4), e sob search_path vazio **toda
-- chamada de função** precisa de schema — `btrim` vira `pg_catalog.btrim`,
-- `encode` vira `pg_catalog.encode`. Aplicar a mesma disciplina a `nullif`
-- parece consistente e é um erro de categoria: ela não é função.
--
-- A lista das construções que **não** se qualificam, e por isso são seguras
-- como estão sob search_path vazio: `CASE`, `COALESCE`, `NULLIF`, `GREATEST`,
-- `LEAST`, `CAST`, `EXTRACT`, `OVERLAY`, `POSITION`, `SUBSTRING`, `TRIM`, os
-- operadores (que se qualificam com `operator(schema.=)`, como a `0003c`
-- registrou) e os agregados de janela.
--
-- ## Por que uma migration nova
--
-- Mesma razão da `0003c` sobre a `0003b`: a `0003d` já está aplicada, e o
-- arquivo tem de continuar batendo byte a byte com o que rodou. Corrigir no
-- lugar deixaria o repositório descrevendo um banco que não existe.
--
-- Encontrado pela suíte `0003d_equipe_admin.testes.sql`, na asserção de que
-- uma conta fora da equipe recebe `DS020` — ela recebia `42883`, e a diferença
-- é a única evidência de que a função nunca teria funcionado para ninguém.
-- ============================================================================

create or replace function atualizar_meu_cargo(p_cargo text)
returns void
language plpgsql
security definer
set search_path = ''
as $funcao$
begin
  if auth.uid() is null then
    raise exception 'e preciso estar autenticado' using errcode = 'DS020';
  end if;

  update public.membro_admin
     -- `nullif` sem schema: é gramática, e qualificá-la é 42883. Ver o
     -- cabeçalho desta migration.
     set cargo = nullif(pg_catalog.btrim(p_cargo), '')
   where perfil_id = auth.uid();

  if not found then
    raise exception 'esta conta nao e da equipe administrativa' using errcode = 'DS020';
  end if;
end;
$funcao$;

comment on function atualizar_meu_cargo(text) is
  'Cargo do proprio integrante (27.1). Uma coluna so: papel_admin e ativo seguem sendo de quem gere equipe.';

revoke execute on function atualizar_meu_cargo(text) from public, anon;
grant execute on function atualizar_meu_cargo(text) to authenticated;
