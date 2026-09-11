-- ============================================================================
-- 0003c · `citext` não é `citext` quando o `search_path` está vazio  (R1)
--
-- Bug encontrado pela suíte da `0003b`, e ele vale como regra para todas as
-- funções deste projeto.
--
-- Toda função nossa declara `set search_path = ''` — proteção contra sequestro
-- de objeto por schema do chamador, e requisito do `get_advisors`. O efeito
-- colateral é que a resolução de **operador** também passa a ver só
-- `pg_catalog`: o `=` de `citext` vive no schema `extensions` e fica invisível.
-- O Postgres então não falha — ele acha uma alternativa, promove os dois lados
-- a `text` e usa `text = text`. A comparação volta a ser **sensível à caixa**,
-- em silêncio.
--
-- Sonda que confirma, dentro de uma função com `search_path = ''`:
--
--     'ABC'::extensions.citext = 'abc'::extensions.citext                → false
--     'ABC'::extensions.citext operator(extensions.=) 'abc'::…::citext   → true
--
-- Nada disso aparece em `create`, em `explain` ou em advisor. E o índice único
-- **não** disfarça: ele guarda a classe de operadores de `citext` desde a
-- criação e continua sendo insensível à caixa. Então o par
-- "consulta case-sensitive + índice case-insensitive" produz exatamente o
-- sintoma que a suíte pegou — um `delete` que não acha a linha, seguido de um
-- `insert` que colide com ela.
--
-- Duas funções comparavam `citext` assim:
--
--   `criar_convite_admin` (0003b) — o `delete` do convite pendente. "Reenviar
--   convite" para `NOVO@dissona.com.br` não apagava o pendente de
--   `novo@dissona.com.br`, e estourava `23505`.
--
--   `aceitar_convite_admin` (0003) — a conferência de que o convite pertence a
--   quem está aceitando. Um convite emitido com uma caixa e uma conta do Auth
--   com outra davam "o convite nao pertence a esta conta". Bug latente desde a
--   `0003`, que só não apareceu porque nada exercitava a diferença de caixa.
--
-- **Regra para as migrations seguintes:** comparação de `citext` dentro de
-- função com `search_path` vazio usa `operator(extensions.=)` e
-- `operator(extensions.<>)`, sempre. Comparar por `lower()` também
-- funcionaria, mas descartaria o índice.
-- ============================================================================

-- ------------------------------------------------- criar_convite_admin ------

create or replace function criar_convite_admin(
  p_email text,
  p_papel_admin papel_admin,
  p_validade_horas integer default 168
)
returns table (convite_id uuid, token text, expira_em timestamptz)
language plpgsql
security definer
set search_path = ''
as $funcao$
declare
  v_email extensions.citext;
  v_token text;
  v_expira timestamptz;
  v_id uuid;
begin
  -- Terceira camada de autorização (architecture §5.2): a policy de
  -- `convite_admin` já exige `tem_permissao('equipe', true)`, mas esta função é
  -- `security definer` e roda com a policy desligada. Sem a checagem explícita,
  -- qualquer conta autenticada emitiria convite de administrador.
  if not public.tem_permissao('equipe', true) then
    raise exception 'so quem gere equipe convida membros' using errcode = 'DS020';
  end if;

  v_email := btrim(p_email)::extensions.citext;

  if v_email operator(extensions.=) '' or position('@' in v_email::text) = 0 then
    raise exception 'e-mail de convite invalido' using errcode = 'DS021';
  end if;

  if p_validade_horas <= 0 then
    raise exception 'validade do convite tem de ser positiva' using errcode = 'DS021';
  end if;

  -- 32 bytes de aleatoriedade criptográfica em hex. O índice único parcial
  -- `convite_admin_um_pendente_por_email` só admite um pendente por endereço,
  -- então "Reenviar convite" (27.2) é substituir o pendente — e substituir
  -- **rotaciona** o token, que é o comportamento certo: o link antigo pode ter
  -- ido para a caixa errada.
  --
  -- `operator(extensions.=)` e não `=`: ver o cabeçalho. Com `=` este `delete`
  -- não alcança um pendente que difere só na caixa, e o `insert` abaixo colide
  -- com ele no índice único.
  delete from public.convite_admin c
   where c.email operator(extensions.=) v_email
     and c.aceito_em is null;

  v_token := pg_catalog.encode(extensions.gen_random_bytes(32), 'hex');
  v_expira := now() + pg_catalog.make_interval(hours => p_validade_horas);

  insert into public.convite_admin (email, papel_admin, token_hash, expira_em, convidado_por)
  values (
    v_email,
    p_papel_admin,
    pg_catalog.encode(extensions.digest(v_token, 'sha256'), 'hex'),
    v_expira,
    auth.uid()
  )
  returning id into v_id;

  return query select v_id, v_token, v_expira;
end;
$funcao$;

comment on function criar_convite_admin(text, papel_admin, integer) is
  'Emite convite da equipe (27.3). Devolve o token em claro uma unica vez; o banco guarda so o sha256. Reenviar rotaciona o token.';

revoke execute on function criar_convite_admin(text, papel_admin, integer)
  from public, anon;
grant execute on function criar_convite_admin(text, papel_admin, integer) to authenticated;

-- ----------------------------------------------- aceitar_convite_admin -----

-- Igual à da `0003`, com uma diferença: a conferência do dono do convite usa
-- `operator(extensions.<>)`. Sem isso, um convite emitido com uma caixa e a
-- conta do Auth com outra recusavam-se mutuamente.
create or replace function aceitar_convite_admin(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $funcao$
declare
  v_convite public.convite_admin;
  v_email extensions.citext;
  v_membro_id uuid;
begin
  if auth.uid() is null then
    raise exception 'e preciso estar autenticado para aceitar o convite'
      using errcode = 'DS020';
  end if;

  select u.email::extensions.citext into v_email from auth.users u where u.id = auth.uid();

  select * into v_convite
    from public.convite_admin c
   where c.token_hash = pg_catalog.encode(
           extensions.digest(p_token, 'sha256'), 'hex')
     and c.aceito_em is null
   for update;

  if not found then
    raise exception 'convite inexistente ou ja utilizado' using errcode = 'DS021';
  end if;

  if v_convite.expira_em <= now() then
    raise exception 'convite expirado' using errcode = 'DS021';
  end if;

  -- O convite vale para o endereço convidado, e não para quem tiver o link.
  if v_convite.email operator(extensions.<>) v_email then
    raise exception 'o convite nao pertence a esta conta' using errcode = 'DS020';
  end if;

  insert into public.membro_admin (perfil_id, papel_admin)
  values (auth.uid(), v_convite.papel_admin)
  on conflict (perfil_id) do update set papel_admin = excluded.papel_admin, ativo = true
  returning id into v_membro_id;

  insert into public.papel_usuario (perfil_id, papel)
  values (auth.uid(), 'admin')
  on conflict (perfil_id, papel) do update set ativo = true;

  update public.convite_admin set aceito_em = now() where id = v_convite.id;

  return v_membro_id;
end;
$funcao$;

comment on function aceitar_convite_admin(text) is
  'Aceite de convite da equipe (27.3). Unico caminho para o papel admin.';

revoke execute on function aceitar_convite_admin(text) from public, anon;
grant execute on function aceitar_convite_admin(text) to authenticated;
