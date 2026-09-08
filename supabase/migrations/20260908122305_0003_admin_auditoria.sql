-- ============================================================================
-- 0003 · Admin, permissões e auditoria  (R1)
--
-- `membro_admin`, `convite_admin`, `permissao_admin`, `log_auditoria`,
-- `registrar_auditoria()`, `tem_permissao()` e `aceitar_convite_admin()`.
-- Ver data-model §4.
--
-- Três desvios do data-model, cada um justificado no lugar:
--   · `permissao_admin` ganha `criado_em`/`atualizado_em` — é mutável pela
--     tela 27.4 e é alvo do trigger de auditoria (lacuna g do plano);
--   · `log_auditoria.registro_id` é `text`, não `uuid` — `lancamento_clave.id`
--     é `bigint`, e com `uuid` o único ledger financeiro ficaria sem chave;
--   · `tem_permissao(modulo, escrita)` nasce aqui, e não em migration nenhuma
--     no data-model, embora architecture §5.2 a exija (lacuna a).
-- ============================================================================

-- -------------------------------------------------------------- membro_admin

create table membro_admin (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null unique references perfil (id) on delete cascade,
  cargo text,
  papel_admin papel_admin not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table membro_admin is
  'Equipe administrativa (27.2). Nasce por convite; nunca por autocadastro (regras 9.1).';

create index membro_admin_ativos_idx on membro_admin (papel_admin) where ativo;

create trigger membro_admin_atualizado_em
  before update on membro_admin
  for each row execute function atualizar_atualizado_em();

-- ------------------------------------------------------------- convite_admin

create table convite_admin (
  id uuid primary key default gen_random_uuid(),
  email extensions.citext not null,
  papel_admin papel_admin not null,
  token_hash text not null,
  expira_em timestamptz not null,
  aceito_em timestamptz,
  convidado_por uuid not null references perfil (id) on delete restrict,
  criado_em timestamptz not null default now()
);

comment on table convite_admin is
  'Convites da equipe (27.3). O token em claro so existe no e-mail; aqui fica o hash.';
comment on column convite_admin.token_hash is
  'sha256 do token, em hex. Nenhum papel le esta tabela alem da propria equipe.';

-- Único parcial: pode haver vários convites históricos para o mesmo e-mail,
-- mas apenas um pendente por vez.
create unique index convite_admin_um_pendente_por_email
  on convite_admin (email) where aceito_em is null;

create index convite_admin_expiracao_idx on convite_admin (expira_em)
  where aceito_em is null;

-- ----------------------------------------------------------- permissao_admin

create table permissao_admin (
  id uuid primary key default gen_random_uuid(),
  papel_admin papel_admin not null,
  modulo text not null,
  pode_ler boolean not null default false,
  pode_escrever boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint permissao_admin_unica unique (papel_admin, modulo),
  -- Escrever sem poder ler é um estado incoerente que a tela 27.4 não oferece.
  constraint permissao_admin_escrever_exige_ler check (not pode_escrever or pode_ler)
);

comment on table permissao_admin is
  'Matriz de permissoes por papel de admin (27.4). Seed derivado do prototipo da R2 — ver o bloco de seed.';

create trigger permissao_admin_atualizado_em
  before update on permissao_admin
  for each row execute function atualizar_atualizado_em();

-- -------------------------------------------------------------- log_auditoria

create table log_auditoria (
  id bigint primary key generated always as identity,
  tabela text not null,
  registro_id text,
  acao text not null,
  ator_id uuid references perfil (id) on delete set null,
  motivo text,
  antes jsonb,
  depois jsonb,
  criado_em timestamptz not null default now()
);

comment on table log_auditoria is
  'Rastro de acoes sensiveis. Append-only: nao existe policy de escrita, so o trigger security definer escreve.';
comment on column log_auditoria.registro_id is
  'text, e nao uuid: lancamento_clave.id e bigint e precisa caber aqui.';
comment on column log_auditoria.ator_id is
  'on delete set null para o rastro sobreviver ao expurgo LGPD do autor.';

create index log_auditoria_registro_idx on log_auditoria (tabela, registro_id);
create index log_auditoria_recentes_idx on log_auditoria (criado_em desc);
create index log_auditoria_ator_idx on log_auditoria (ator_id);

-- ---------------------------------------------------- trigger de auditoria

-- Genérica: usa `tg_table_name` e `to_jsonb`, então não referencia tabela
-- nenhuma e pode nascer inteira aqui. Os `create trigger` é que se dividem
-- entre as migrations — `pacote_clave` e `lancamento_clave` só existem na
-- 0007, e `ganho_curador` na 0009.
--
-- `motivo` é obrigatório em bloqueio, exclusão e decisão de classe, e um
-- trigger genérico não tem como sabê-lo. O contrato é: a Server Action faz
--
--     set local dissona.motivo = '...'
--
-- antes da escrita, e o trigger lê daí. Um `check` não é viável, porque a
-- mesma tabela recebe escritas que exigem motivo e escritas que não.
create or replace function registrar_auditoria()
returns trigger
language plpgsql
security definer
set search_path = ''
as $funcao$
declare
  v_antes jsonb;
  v_depois jsonb;
  v_id text;
  -- Nunca copiar segredo para o log: ele é legível por toda a equipe.
  v_sensiveis text[] := array[
    'token_hash', 'chave_pix', 'asaas_carteira_id', 'encrypted_password'
  ];
  v_chave text;
begin
  if tg_op = 'DELETE' then
    v_antes := to_jsonb(old);
  elsif tg_op = 'INSERT' then
    v_depois := to_jsonb(new);
  else
    v_antes := to_jsonb(old);
    v_depois := to_jsonb(new);
  end if;

  foreach v_chave in array v_sensiveis loop
    if v_antes ? v_chave then v_antes := v_antes - v_chave; end if;
    if v_depois ? v_chave then v_depois := v_depois - v_chave; end if;
  end loop;

  v_id := coalesce(v_depois ->> 'id', v_antes ->> 'id');

  insert into public.log_auditoria (tabela, registro_id, acao, ator_id, motivo, antes, depois)
  values (
    tg_table_name,
    v_id,
    lower(tg_op),
    auth.uid(),
    nullif(btrim(coalesce(current_setting('dissona.motivo', true), '')), ''),
    v_antes,
    v_depois
  );

  return coalesce(new, old);
end;
$funcao$;

comment on function registrar_auditoria() is
  'Trigger generico de auditoria. Le o motivo de current_setting(dissona.motivo).';

revoke execute on function registrar_auditoria() from public, anon, authenticated;

create trigger perfil_auditoria
  after insert or update or delete on perfil
  for each row execute function registrar_auditoria();

create trigger papel_usuario_auditoria
  after insert or update or delete on papel_usuario
  for each row execute function registrar_auditoria();

create trigger perfil_curador_auditoria
  after insert or update or delete on perfil_curador
  for each row execute function registrar_auditoria();

create trigger membro_admin_auditoria
  after insert or update or delete on membro_admin
  for each row execute function registrar_auditoria();

create trigger permissao_admin_auditoria
  after insert or update or delete on permissao_admin
  for each row execute function registrar_auditoria();

-- `configuracao` nasce na 0004 e é a 9ª tabela auditada — um desvio do
-- data-model, que lista oito. Mudar um piso de remuneração é a alteração mais
-- sensível do sistema; deixá-la fora do rastro seria incoerente.

-- --------------------------------------------------------- tem_permissao

-- `security definer` é obrigatório: sem ele, a policy de `permissao_admin`
-- chamaria esta função, que lê `permissao_admin`, que dispara a policy →
-- recursão infinita (42P17).
create or replace function tem_permissao(p_modulo text, p_escrita boolean default false)
returns boolean
language sql
security definer
stable
set search_path = ''
as $funcao$
  select coalesce((
    select case when p_escrita then pa.pode_escrever else pa.pode_ler end
      from public.membro_admin ma
      join public.permissao_admin pa on pa.papel_admin = ma.papel_admin
     where ma.perfil_id = auth.uid()
       and ma.ativo
       and pa.modulo = p_modulo
  ), false);
$funcao$;

comment on function tem_permissao(text, boolean) is
  'Permissao do admin da sessao no modulo. architecture 5.2, 3a camada. Nao entra no middleware: seria uma consulta por requisicao.';

revoke execute on function tem_permissao(text, boolean) from public, anon;
grant execute on function tem_permissao(text, boolean) to authenticated;

-- ------------------------------------------------- aceitar_convite_admin

-- O papel `admin` é o único que `papel_usuario` recusa por policy
-- (escalonamento de privilégio, 0001). Ele entra só por aqui.
--
-- `security definer` por dois motivos: precisa furar aquela policy, e precisa
-- ler `convite_admin`, que nenhum papel fora da equipe pode consultar — o
-- convidado, no momento do aceite, ainda não é da equipe.
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
  if v_convite.email <> v_email then
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

-- ---------------------------------------------------------------- seed ----

-- Matriz derivada do protótipo do Admin da R2, que traz:
--
--   Moderador  : { gestao: true,  moderacao: true,  financeiro: false, equipe: false }
--   Financeiro : { gestao: false, moderacao: false, financeiro: true,  equipe: false }
--   Suporte    : { gestao: true,  moderacao: false, financeiro: false, equipe: false }
--
-- mais a regra de tela "Só o Administrador gere equipe e papéis".
--
-- O protótipo tem **um** booleano por módulo; esta tabela tem `pode_ler` e
-- `pode_escrever`. A tradução é conservadora — menor privilégio: `true` vira
-- leitura sempre, e escrita só onde escrever é a razão de ser do papel. Assim
-- o caminho de negação fica exercitado desde já, em vez de dormir até a
-- matriz definitiva chegar (open-questions #11).
--
-- Dois módulos não existem no protótipo e foram derivados: `pacotes`, que no
-- protótipo vive no grupo Financeiro da navegação, acompanha `financeiro`; e
-- `configuracao`, que guarda os pisos de remuneração, fica só com o
-- administrador.
insert into permissao_admin (papel_admin, modulo, pode_ler, pode_escrever) values
  ('administrador', 'gestao',       true,  true),
  ('administrador', 'moderacao',    true,  true),
  ('administrador', 'financeiro',   true,  true),
  ('administrador', 'pacotes',      true,  true),
  ('administrador', 'equipe',       true,  true),
  ('administrador', 'configuracao', true,  true),

  ('moderador',     'gestao',       true,  false),
  ('moderador',     'moderacao',    true,  true),
  ('moderador',     'financeiro',   false, false),
  ('moderador',     'pacotes',      false, false),
  ('moderador',     'equipe',       false, false),
  ('moderador',     'configuracao', false, false),

  ('financeiro',    'gestao',       false, false),
  ('financeiro',    'moderacao',    false, false),
  ('financeiro',    'financeiro',   true,  true),
  ('financeiro',    'pacotes',      true,  true),
  ('financeiro',    'equipe',       false, false),
  ('financeiro',    'configuracao', false, false),

  ('suporte',       'gestao',       true,  false),
  ('suporte',       'moderacao',    false, false),
  ('suporte',       'financeiro',   false, false),
  ('suporte',       'pacotes',      false, false),
  ('suporte',       'equipe',       false, false),
  ('suporte',       'configuracao', false, false);

-- ------------------------------------------------------------------------ RLS

alter table membro_admin enable row level security;
alter table convite_admin enable row level security;
alter table permissao_admin enable row level security;
alter table log_auditoria enable row level security;

-- membro_admin: o próprio membro lê a sua linha (tela 27.1) e a equipe lê tudo.
create policy "membro_admin: proprio membro e a equipe leem"
  on membro_admin for select
  to authenticated
  using (perfil_id = auth.uid() or e_admin());

create policy "membro_admin: quem gere equipe escreve"
  on membro_admin for insert
  to authenticated
  with check (tem_permissao('equipe', true));

create policy "membro_admin: quem gere equipe atualiza"
  on membro_admin for update
  to authenticated
  using (tem_permissao('equipe', true))
  with check (tem_permissao('equipe', true));

-- Sem delete: desligar membro é `ativo = false`. Um delete físico apagaria o
-- rastro de quem já teve acesso administrativo.

-- convite_admin: **nenhuma leitura para o convidado**. O `token_hash` não pode
-- ser legível por quem não é da equipe, e o aceite acontece por
-- `aceitar_convite_admin`, que é `security definer` e compara o hash por dentro.
create policy "convite_admin: so quem gere equipe le"
  on convite_admin for select
  to authenticated
  using (tem_permissao('equipe'));

create policy "convite_admin: so quem gere equipe convida"
  on convite_admin for insert
  to authenticated
  with check (tem_permissao('equipe', true) and convidado_por = auth.uid());

create policy "convite_admin: so quem gere equipe revoga"
  on convite_admin for delete
  to authenticated
  using (tem_permissao('equipe', true));

-- permissao_admin: legível por toda a equipe (a tela 27.4 mostra a matriz),
-- escrita só por quem gere equipe.
create policy "permissao_admin: equipe le a matriz"
  on permissao_admin for select
  to authenticated
  using (e_admin());

create policy "permissao_admin: quem gere equipe altera a matriz"
  on permissao_admin for update
  to authenticated
  using (tem_permissao('equipe', true))
  with check (tem_permissao('equipe', true));

-- Sem insert nem delete: o conjunto de (papel, módulo) é definido por
-- migration. Um módulo novo é código novo, não ato de usuário.

-- log_auditoria: leitura para a equipe, **zero policy de escrita**. É assim
-- que o append-only é garantido pela RLS, e não por convenção.
create policy "log_auditoria: equipe le o rastro"
  on log_auditoria for select
  to authenticated
  using (e_admin());
