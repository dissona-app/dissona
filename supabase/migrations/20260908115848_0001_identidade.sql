-- ============================================================================
-- 0001 · Identidade e papéis  (R1)
--
-- Enums base, `perfil`, `papel_usuario`, os helpers de RLS e o trigger de
-- `atualizado_em`. Ver data-model §1 e §2.
--
-- Os 18 enums nascem todos aqui, inclusive os que só serão usados na R2 e
-- adiante: enum é tipo, não tabela, e a proibição de "criar tabela de release
-- futura" não se aplica. Concentrá-los evita `alter type` no meio do caminho.
-- ============================================================================

-- --------------------------------------------------------------------- enums

create type papel as enum ('artista', 'curador', 'admin');
create type situacao_conta as enum ('ativa', 'bloqueada', 'desativada', 'excluida');
create type classe_curador as enum ('bronze', 'prata', 'ouro');
create type situacao_curador as enum (
  'rascunho', 'bronze_aprovado', 'prata_em_analise', 'prata_aprovado', 'prata_recusado'
);
create type tipo_midia as enum (
  'playlist', 'youtube', 'instagram', 'site', 'blog', 'radio', 'podcast', 'outro'
);
create type tipo_servico as enum ('feedback', 'playlist', 'post', 'materia', 'outro');
create type origem_faixa as enum ('link', 'arquivo');
create type situacao_faixa as enum ('rascunho', 'aguardando_selecao', 'em_curadoria', 'concluida');
create type situacao_envio as enum (
  'recebeu', 'ouviu', 'avaliando', 'pronto', 'devolvido', 'cancelado'
);
create type tipo_lancamento_clave as enum ('compra', 'consumo', 'devolucao', 'estorno', 'ajuste');
create type situacao_pedido as enum (
  'criado', 'processando', 'aprovado', 'recusado', 'expirado', 'estornado'
);
create type meio_pagamento as enum ('pix', 'cartao');
create type grupo_criterio as enum (
  'execucao_tecnica', 'composicao', 'identidade', 'impacto', 'producao'
);
create type situacao_avaliacao as enum ('rascunho', 'concluida');
create type modalidade_compartilhamento as enum (
  'playlist', 'post', 'materia', 'outros', 'nao_compartilhou'
);
create type situacao_ganho as enum ('liberado', 'em_saque', 'pago', 'cancelado');
create type papel_admin as enum ('administrador', 'moderador', 'financeiro', 'suporte');
create type canal_notificacao as enum ('in_app', 'email');

-- --------------------------------------------------- trigger de atualizado_em

create or replace function atualizar_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $funcao$
begin
  new.atualizado_em := now();
  return new;
end;
$funcao$;

comment on function atualizar_atualizado_em() is
  'Trigger before update: mantem atualizado_em. Aplicado a toda tabela mutavel.';

-- --------------------------------------------------------------------- perfil

-- Extensão de `auth.users`. E-mail e senha vivem no Supabase Auth; aqui fica
-- só o que é do produto.
create table perfil (
  id uuid primary key references auth.users (id) on delete cascade,
  nome_completo text not null,
  nome_exibicao text,
  handle extensions.citext unique,
  foto_caminho text,
  cidade text,
  idioma text not null default 'pt-BR',
  situacao situacao_conta not null default 'ativa',
  aceite_termos_em timestamptz,
  desativada_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint perfil_idioma_conhecido check (idioma in ('pt-BR', 'es', 'en')),
  constraint perfil_handle_formato check (handle ~ '^[a-z0-9_]{3,30}$'),
  constraint perfil_nome_completo_nao_vazio check (char_length(btrim(nome_completo)) > 0)
);

comment on table perfil is
  'Uma linha por conta (RF-003). Nasce por trigger em auth.users, nunca por insert do usuario.';
comment on column perfil.desativada_em is
  'Inicio dos 30 dias ate o expurgo (LGPD). Ver job expurgar_contas_excluidas.';

create index perfil_situacao_idx on perfil (situacao);

-- Índice parcial: o job de expurgo consulta exatamente este recorte, e um
-- índice cheio cresceria com todo o histórico de contas ativas.
create index perfil_desativada_em_idx on perfil (desativada_em)
  where situacao = 'desativada';

create trigger perfil_atualizado_em
  before update on perfil
  for each row execute function atualizar_atualizado_em();

-- -------------------------------------------------------------- papel_usuario

-- Papéis são acumuláveis e reversíveis (regras §9.1). Reverter é `ativo =
-- false`, nunca delete — o histórico de quem já foi curador precisa sobreviver.
create table papel_usuario (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references perfil (id) on delete cascade,
  papel papel not null,
  ativo boolean not null default true,
  ativado_em timestamptz not null default now(),

  constraint papel_usuario_unico unique (perfil_id, papel)
);

comment on table papel_usuario is
  'Papeis acumulaveis por conta. O papel admin so entra por RPC de convite (0003).';

-- É a leitura de toda requisição do middleware; o índice parcial é o recorte
-- que ele consulta.
create index papel_usuario_ativos_idx on papel_usuario (perfil_id) where ativo;

-- ------------------------------------------------------------- helpers de RLS

-- `security definer` porque são chamadas de dentro das policies de outras
-- tabelas — e da própria `papel_usuario`: sem isso, ler `papel_usuario` para
-- decidir o acesso a `papel_usuario` recursiona (42P17). `stable` para o
-- planner avaliar uma vez por consulta, e `search_path` vazio com tudo
-- qualificado para não haver sequestro de objeto por schema do chamador.
create or replace function tem_papel(p papel)
returns boolean
language sql
security definer
stable
set search_path = ''
as $funcao$
  select exists (
    select 1
      from public.papel_usuario pu
     where pu.perfil_id = auth.uid()
       and pu.papel = p
       and pu.ativo
  );
$funcao$;

comment on function tem_papel(papel) is
  'Helper de RLS: a sessao tem o papel indicado, ativo. architecture 5.2.';

create or replace function e_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $funcao$
  select public.tem_papel('admin'::public.papel);
$funcao$;

comment on function e_admin() is 'Helper de RLS: a sessao e admin.';

revoke execute on function tem_papel(papel) from public;
revoke execute on function e_admin() from public;
grant execute on function tem_papel(papel) to authenticated;
grant execute on function e_admin() to authenticated;

-- --------------------------------------------- criação do perfil no cadastro

-- `perfil` não tem policy de insert de propósito: se o usuário pudesse inserir
-- a própria linha, poderia inseri-la com `situacao` à escolha. A linha nasce
-- aqui, no mesmo instante que a conta do Auth.
--
-- `coalesce` no nome porque o trigger não pode falhar — uma exceção aqui
-- derruba o cadastro inteiro. Nome ausente cai para o e-mail, e a tela de
-- perfil (7.1) corrige depois.
create or replace function criar_perfil_para_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $funcao$
begin
  insert into public.perfil (id, nome_completo, aceite_termos_em)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'nome_completo'), ''), new.email),
    case
      when (new.raw_user_meta_data ->> 'aceite_termos') = 'true' then now()
      else null
    end
  )
  on conflict (id) do nothing;

  return new;
end;
$funcao$;

comment on function criar_perfil_para_novo_usuario() is
  'Trigger em auth.users: cria a linha de perfil. RF-003 e RF-010.';

create trigger criar_perfil_ao_cadastrar
  after insert on auth.users
  for each row execute function criar_perfil_para_novo_usuario();

-- ------------------------------------------------------------------------ RLS

alter table perfil enable row level security;
alter table papel_usuario enable row level security;

create policy "perfil: dono le a propria linha"
  on perfil for select
  to authenticated
  using (id = auth.uid() or e_admin());

create policy "perfil: dono atualiza a propria linha"
  on perfil for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "perfil: admin atualiza qualquer linha"
  on perfil for update
  to authenticated
  using (e_admin())
  with check (e_admin());

-- Sem policy de insert (a linha vem do trigger) e sem delete: exclusão de
-- conta é `situacao = 'desativada'` mais o job de expurgo (regras §10).

create policy "papel_usuario: dono le os proprios papeis"
  on papel_usuario for select
  to authenticated
  using (perfil_id = auth.uid() or e_admin());

-- `papel <> 'admin'` é o que impede escalonamento de privilégio: a tela de
-- seleção de perfil (1.4) insere aqui, e sem essa cláusula qualquer conta
-- poderia se tornar admin. Conta de admin nasce por convite (regras §9.1).
create policy "papel_usuario: dono ativa papel nao administrativo"
  on papel_usuario for insert
  to authenticated
  with check (perfil_id = auth.uid() and papel <> 'admin');

create policy "papel_usuario: dono alterna papel nao administrativo"
  on papel_usuario for update
  to authenticated
  using (perfil_id = auth.uid() and papel <> 'admin')
  with check (perfil_id = auth.uid() and papel <> 'admin');
