-- ============================================================================
-- 0001d · Sessões ativas da conta  (R1)
--
-- O painel de "Sessões ativas" das telas 7.4 e 17.4 — dispositivo, local e
-- último acesso, com a opção de encerrar cada uma.
--
-- ## Por que RPC, e não a service role
--
-- A decisão registrada para esta fatia era "ler `auth.sessions` com a service
-- role". Ao implementar, o caminho se mostrou impossível **e** desnecessário:
--
--  - **Impossível pelo PostgREST.** Ele expõe apenas os schemas configurados
--    (`public` e `graphql_public`). O schema `auth` não está entre eles, então
--    `supabase.from('sessions')` não alcança a tabela nem com a chave de
--    serviço. Só um cliente Postgres direto chegaria lá, e o projeto não tem
--    um.
--  - **Desnecessário.** Uma função `security definer` de dono `postgres` lê
--    `auth.sessions` do mesmo jeito, e com uma vantagem: o filtro `user_id =
--    auth.uid()` fica **dentro do SQL**, e não num `where` do TypeScript. Com a
--    service role, esquecer aquele filtro entregaria a lista de sessões de
--    todo mundo; aqui não há como esquecê-lo.
--
-- A capacidade é a mesma que foi decidida — o painel lê `auth.sessions`. O
-- mecanismo é o que mantém a fronteira no banco.
--
-- ## O que não tem
--
-- **Cidade.** O protótipo mostra "Chrome · São Paulo", e `auth.sessions` tem
-- `ip`, não geolocalização. Resolver o IP exigiria um serviço externo por
-- linha da lista, num painel de segurança — e um "São Paulo" errado numa tela
-- que serve para reconhecer acesso indevido é pior que nenhum. Devolvemos o IP,
-- que é verificável.
-- ============================================================================

-- --------------------------------------------------- ler_sessoes_da_conta ---

create or replace function ler_sessoes_da_conta()
returns table (
  id uuid,
  criada_em timestamptz,
  visto_em timestamptz,
  agente text,
  ip text,
  atual boolean
)
language sql
security definer
stable
set search_path = ''
as $funcao$
  select
    s.id,
    s.created_at,
    -- `refreshed_at` é quando o token foi renovado pela última vez, e é a
    -- melhor aproximação de "último acesso" que existe aqui. Cai para
    -- `updated_at` nas sessões que ainda não renovaram nenhuma vez.
    coalesce(s.refreshed_at, s.updated_at, s.created_at),
    s.user_agent,
    pg_catalog.host(s.ip),
    -- `session_id` é claim do access token, e é o que identifica a sessão que
    -- está fazendo esta chamada. Sem ele o painel não teria como marcar
    -- "Atual", e ofereceria à pessoa encerrar a própria sessão como se fosse a
    -- de outro dispositivo.
    s.id::text = (auth.jwt() ->> 'session_id')
  from auth.sessions s
  where s.user_id = auth.uid()
    and (s.not_after is null or s.not_after > now())
  order by coalesce(s.refreshed_at, s.updated_at, s.created_at) desc;
$funcao$;

comment on function ler_sessoes_da_conta() is
  'Sessoes ativas da propria conta (7.4 / 17.4). O filtro por auth.uid() vive aqui, e nao no codigo.';

revoke execute on function ler_sessoes_da_conta() from public, anon;
grant execute on function ler_sessoes_da_conta() to authenticated;

-- ----------------------------------------------- encerrar_sessao_da_conta ---

-- Apagar a linha de `auth.sessions` invalida o refresh token dela — a FK de
-- `auth.refresh_tokens` cascateia. É o que "Encerrar" faz na tela.
--
-- A sessão **atual** não é encerrável por aqui de propósito: para sair deste
-- dispositivo existe o "Sair", e um "Encerrar" na própria linha faria a pessoa
-- se deslogar sem entender que foi isso que ela pediu. A tela também não
-- oferece o botão nessa linha; a guarda aqui é a segunda camada.
create or replace function encerrar_sessao_da_conta(p_sessao_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $funcao$
declare
  v_atual text := auth.jwt() ->> 'session_id';
begin
  if auth.uid() is null then
    raise exception 'e preciso estar autenticado' using errcode = 'DS020';
  end if;

  if p_sessao_id::text = v_atual then
    raise exception 'a sessao atual se encerra pelo Sair' using errcode = 'DS020';
  end if;

  delete from auth.sessions s
   where s.id = p_sessao_id
     and s.user_id = auth.uid();

  -- `false` quando não havia o que encerrar: a sessão já expirou, ou é de
  -- outra conta. Não é erro — é a resposta honesta, e a tela relista.
  return found;
end;
$funcao$;

comment on function encerrar_sessao_da_conta(uuid) is
  'Encerra uma sessao da propria conta (7.4 / 17.4). A sessao atual sai pelo Sair.';

revoke execute on function encerrar_sessao_da_conta(uuid) from public, anon;
grant execute on function encerrar_sessao_da_conta(uuid) to authenticated;
