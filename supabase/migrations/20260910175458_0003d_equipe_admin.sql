-- ============================================================================
-- 0003d · equipe, papéis e o motivo da auditoria  (R1 · módulo 27)
--
-- A `0003` entregou as tabelas, as policies e o aceite de convite; a `0003b` a
-- emissão. O que falta para a tela 27 existir são quatro coisas que a RLS
-- sozinha não resolve.
--
-- 1 · **O e-mail dos integrantes.** A tela 27.2 mostra "helena@dissona.com.br"
--     em cada linha, e `perfil` não tem e-mail — ele vive em `auth.users`, que
--     o PostgREST não expõe. Sem uma função `security definer`, a lista de
--     equipe é uma lista sem endereços.
--
-- 2 · **A lista é a união de duas tabelas.** No protótipo, quem foi convidado e
--     ainda não aceitou aparece como uma linha de status "Convite pendente",
--     com o botão "Reenviar convite". Isso não é `membro_admin` — a linha de
--     membro só nasce no aceite — é `convite_admin`. Unir no cliente daria duas
--     viagens e a ordenação errada; unir aqui dá uma lista só, já ordenada.
--
-- 3 · **O motivo da auditoria.** `registrar_auditoria()` (0003) lê
--     `current_setting('dissona.motivo')`, e `set local` só vale dentro de uma
--     transação. Pelo PostgREST, cada `update` é a sua própria transação e não
--     há onde marcá-la — então **toda escrita que precisa de motivo tem de ser
--     uma função**. É por isso que as três mutações da equipe estão aqui em vez
--     de serem `update` do cliente.
--
-- 4 · **O próprio cargo.** A tela 27.1 deixa o integrante editar nome e cargo,
--     e a policy de update de `membro_admin` exige `tem_permissao('equipe',
--     true)` — quem é `suporte` não conseguiria salvar o próprio cargo. Uma
--     policy para a própria linha não serve: a RLS não restringe **coluna**, e
--     ela deixaria a pessoa reescrever `papel_admin` e `ativo`. Uma função que
--     toca só `cargo` restringe.
--
-- ## `security invoker` nas mutações, e não `definer`
--
-- As três funções de escrita rodam **como quem chama**, de propósito: assim a
-- policy `tem_permissao('equipe', true)` continua sendo a cerca, e não uma
-- checagem que eu tenha de reescrever aqui. `set_config(..., is_local => true)`
-- funciona igual — a transação é a do pedido.
--
-- A checagem explícita de permissão aparece de todo modo, antes do `update`,
-- porque um `update` que a RLS recusa afeta **zero linhas sem erro nenhum**: a
-- tela mostraria "salvo" e nada teria mudado.
--
-- ## Duas regras que o protótipo põe na tela e que aqui viram lei
--
-- `lockPapel: mb.voce` e `showToggle: !mb.voce` — ninguém muda o próprio papel
-- nem desativa a própria conta. Na tela isso é um `select` desabilitado; aqui é
-- uma exceção. A diferença importa: o único administrador que se rebaixasse a
-- `suporte` trancaria a organização fora da gestão de equipe, sem caminho de
-- volta pela interface.
-- ============================================================================

-- ---------------------------------------------------------- leitura -------

-- A situação de cada linha, num tipo só, porque a lista mistura membro e
-- convite: 'ativo' e 'inativo' vêm de `membro_admin.ativo`; 'pendente' e
-- 'expirado' vêm de `convite_admin`.
create type situacao_membro_admin as enum ('ativo', 'inativo', 'pendente', 'expirado');

comment on type situacao_membro_admin is
  'Status de uma linha da lista de equipe (27.2). Une membro_admin e convite_admin pendente.';

create or replace function ler_equipe_admin()
returns table (
  membro_id uuid,
  convite_id uuid,
  perfil_id uuid,
  nome text,
  email text,
  cargo text,
  papel_admin papel_admin,
  situacao situacao_membro_admin,
  expira_em timestamptz,
  sou_eu boolean
)
language sql
security definer
set search_path = ''
as $funcao$
  -- O `union` vive dentro de um `from`, e não solto, porque a ordenação usa
  -- **expressões** (`sou_eu desc`, `convite_id is not null`) e o `order by` de
  -- um `union` aceita só nome de coluna de saída. Envolver é mais honesto que
  -- inventar uma coluna de ordenação no `select`.
  select
    linha.membro_id,
    linha.convite_id,
    linha.perfil_id,
    linha.nome,
    linha.email,
    linha.cargo,
    linha.papel_admin,
    linha.situacao,
    linha.expira_em,
    linha.sou_eu
  from (
  -- Integrantes de verdade.
  select
    m.id as membro_id,
    null::uuid as convite_id,
    m.perfil_id,
    p.nome_completo as nome,
    u.email::text as email,
    m.cargo,
    m.papel_admin,
    (case when m.ativo then 'ativo' else 'inativo' end)::public.situacao_membro_admin as situacao,
    null::timestamptz as expira_em,
    m.perfil_id = auth.uid() as sou_eu
  from public.membro_admin m
  join public.perfil p on p.id = m.perfil_id
  join auth.users u on u.id = m.perfil_id
  where public.tem_permissao('equipe')

  union all

  -- Convites que ainda não viraram integrante.
  --
  -- O `not exists` evita a linha dobrada de quem foi desativado e reconvidado:
  -- `aceitar_convite_admin` faz upsert por `perfil_id`, então o convite pendente
  -- e o membro existente são a **mesma** pessoa, e ela já aparece acima.
  select
    null::uuid as membro_id,
    c.id as convite_id,
    null::uuid as perfil_id,
    null::text as nome,
    c.email::text as email,
    null::text as cargo,
    c.papel_admin,
    (case when c.expira_em > now() then 'pendente' else 'expirado' end)::public.situacao_membro_admin,
    c.expira_em,
    false as sou_eu
  from public.convite_admin c
  where public.tem_permissao('equipe')
    and c.aceito_em is null
    and not exists (
      select 1
        from public.membro_admin m2
        join auth.users u2 on u2.id = m2.perfil_id
       where u2.email::extensions.citext operator(extensions.=) c.email
    )

  ) as linha
  -- Eu primeiro (é a linha que a pessoa procura), depois integrantes por nome,
  -- e os convites ao fim — são pendências, não equipe.
  order by
    linha.sou_eu desc,
    linha.convite_id is not null,
    linha.nome nulls last,
    linha.email;
$funcao$;

comment on function ler_equipe_admin() is
  'Lista de equipe (27.2): membro_admin com e-mail de auth.users, mais convites pendentes. Fechada por tem_permissao(equipe).';

revoke execute on function ler_equipe_admin() from public, anon;
grant execute on function ler_equipe_admin() to authenticated;

-- --------------------------------------------------------- mutações -------

-- Papel de um integrante (27.2).
create or replace function alterar_papel_do_membro(
  p_membro_id uuid,
  p_papel papel_admin,
  p_motivo text
)
returns void
language plpgsql
set search_path = ''
as $funcao$
declare
  v_perfil_id uuid;
begin
  if not public.tem_permissao('equipe', true) then
    raise exception 'so quem gere equipe altera papel' using errcode = 'DS020';
  end if;

  select m.perfil_id into v_perfil_id from public.membro_admin m where m.id = p_membro_id;

  if v_perfil_id is null then
    raise exception 'integrante inexistente' using errcode = 'DS021';
  end if;

  if v_perfil_id = auth.uid() then
    raise exception 'ninguem altera o proprio papel' using errcode = 'DS020';
  end if;

  perform pg_catalog.set_config('dissona.motivo', p_motivo, true);

  update public.membro_admin set papel_admin = p_papel where id = p_membro_id;
end;
$funcao$;

comment on function alterar_papel_do_membro(uuid, papel_admin, text) is
  'Troca o papel de um integrante (27.2), com motivo na auditoria. Recusa a propria linha.';

revoke execute on function alterar_papel_do_membro(uuid, papel_admin, text) from public, anon;
grant execute on function alterar_papel_do_membro(uuid, papel_admin, text) to authenticated;

-- Ativar / desativar um integrante (27.2).
create or replace function alterar_acesso_do_membro(
  p_membro_id uuid,
  p_ativo boolean,
  p_motivo text
)
returns void
language plpgsql
set search_path = ''
as $funcao$
declare
  v_perfil_id uuid;
begin
  if not public.tem_permissao('equipe', true) then
    raise exception 'so quem gere equipe ativa e desativa' using errcode = 'DS020';
  end if;

  select m.perfil_id into v_perfil_id from public.membro_admin m where m.id = p_membro_id;

  if v_perfil_id is null then
    raise exception 'integrante inexistente' using errcode = 'DS021';
  end if;

  if v_perfil_id = auth.uid() then
    raise exception 'ninguem desativa a propria conta administrativa' using errcode = 'DS020';
  end if;

  perform pg_catalog.set_config('dissona.motivo', p_motivo, true);

  update public.membro_admin set ativo = p_ativo where id = p_membro_id;
end;
$funcao$;

comment on function alterar_acesso_do_membro(uuid, boolean, text) is
  'Ativa ou desativa um integrante (27.2), com motivo na auditoria. Recusa a propria linha.';

revoke execute on function alterar_acesso_do_membro(uuid, boolean, text) from public, anon;
grant execute on function alterar_acesso_do_membro(uuid, boolean, text) to authenticated;

-- Matriz de permissões (27.4).
--
-- Recebe a matriz inteira em `jsonb` porque a tela tem **um** botão Salvar para
-- as dezesseis células: uma chamada por célula daria dezesseis transações, e
-- uma falha no meio deixaria a matriz metade nova e metade velha.
--
-- Duas invariantes, as mesmas que a tela desenha travadas:
--
--  · `administrador` não é editável. Ele "mantém acesso total, inclusive a
--    equipe e papéis", diz o pé da tela. Um administrador que se cortasse de
--    `equipe` trancaria a organização fora da própria gestão.
--  · `equipe` é exclusiva do `administrador`. É a permissão que concede
--    permissões; dá-la a outro papel é dar o papel de administrador com outro
--    nome.
create or replace function definir_permissoes_admin(p_permissoes jsonb, p_motivo text)
returns integer
language plpgsql
set search_path = ''
as $funcao$
declare
  v_item jsonb;
  v_papel public.papel_admin;
  v_modulo text;
  v_ler boolean;
  v_escrever boolean;
  v_total integer := 0;
begin
  if not public.tem_permissao('equipe', true) then
    raise exception 'so quem gere equipe altera a matriz' using errcode = 'DS020';
  end if;

  if pg_catalog.jsonb_typeof(p_permissoes) <> 'array' then
    raise exception 'a matriz de permissoes tem de ser uma lista' using errcode = 'DS021';
  end if;

  perform pg_catalog.set_config('dissona.motivo', p_motivo, true);

  for v_item in select * from pg_catalog.jsonb_array_elements(p_permissoes) loop
    v_papel := (v_item ->> 'papel')::public.papel_admin;
    v_modulo := v_item ->> 'modulo';
    v_ler := (v_item ->> 'pode_ler')::boolean;
    v_escrever := (v_item ->> 'pode_escrever')::boolean;

    if v_papel = 'administrador' then
      raise exception 'o administrador mantem acesso total' using errcode = 'DS020';
    end if;

    if v_modulo = 'equipe' and (v_ler or v_escrever) then
      raise exception 'gerir equipe e papeis e exclusivo do administrador'
        using errcode = 'DS020';
    end if;

    -- `escrever` implica `ler`: é o `check permissao_admin_escrever_exige_ler`,
    -- normalizado aqui para a tela não ter de conhecê-lo.
    update public.permissao_admin
       set pode_ler = (v_ler or v_escrever),
           pode_escrever = v_escrever
     where papel_admin = v_papel
       and modulo = v_modulo;

    if not found then
      raise exception 'permissao inexistente: % / %', v_papel, v_modulo using errcode = 'DS021';
    end if;

    v_total := v_total + 1;
  end loop;

  return v_total;
end;
$funcao$;

comment on function definir_permissoes_admin(jsonb, text) is
  'Grava a matriz de permissoes (27.4) numa transacao, com motivo na auditoria. Administrador e imutavel; equipe e exclusiva dele.';

revoke execute on function definir_permissoes_admin(jsonb, text) from public, anon;
grant execute on function definir_permissoes_admin(jsonb, text) to authenticated;

-- O próprio cargo (27.1).
--
-- `security definer` e uma coluna só. A alternativa seria uma policy de update
-- para a própria linha de `membro_admin`, e ela não serve: a RLS não restringe
-- coluna, então a mesma policy que deixasse alguém escrever o próprio `cargo`
-- deixaria escrever o próprio `papel_admin`.
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
     set cargo = pg_catalog.nullif(pg_catalog.btrim(p_cargo), '')
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
