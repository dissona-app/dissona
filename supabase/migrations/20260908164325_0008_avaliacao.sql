-- ============================================================================
-- 0008 · Avaliação  (R2)
--
-- `criterio` (seed), `avaliacao`, `nota_criterio`, `compartilhamento` e as
-- views `nota_avaliacao` e `nota_artista`. Ver data-model §9.
--
-- O seed de `criterio` resolve duas pendências que o backlog listava como
-- bloqueio da R2, e resolve pelo protótipo, que o AGENTS.md põe acima do board:
--
--   #2 · o 11º critério. O grupo Produção tem **dois** itens, Mixagem e
--        Arranjo. O board não perdeu um item, perdeu dois — 2+2+3+2+2 = 11.
--   #3 · quais cinco são obrigatórios. São afinação, ritmo, melodia,
--        personalidade e conexão. **Não** é um por grupo: Execução técnica tem
--        dois obrigatórios e Produção nenhum.
--
-- `nota_artista` não está na tabela de migrations do data-model §11, embora a
-- §3 a cite. Nasce aqui, junto de `nota_avaliacao`, de que deriva.
-- ============================================================================

-- ------------------------------------------------------------------- criterio

create table criterio (
  chave text primary key,
  grupo grupo_criterio not null,
  rotulo text not null,
  -- **Conveniência de UI, não fonte.** A fonte dos obrigatórios é
  -- `configuracao.criterios_obrigatorios`, que a RPC `enviar_avaliacao` lê —
  -- assim a pendência #3 vira `update` de uma linha de configuração, e não
  -- migration. O teste de RLS confere que os dois lados concordam.
  obrigatorio boolean not null default false,
  ordem smallint not null,
  ativo boolean not null default true,

  constraint criterio_ordem_positiva check (ordem > 0),
  constraint criterio_rotulo_nao_vazio check (char_length(btrim(rotulo)) > 0)
);

comment on table criterio is
  'Catalogo dos 11 itens de nota (regras 5.1). Seed do prototipo da R2; resolve open-questions #2 e #3.';
comment on column criterio.obrigatorio is
  'Conveniencia de UI. A fonte e configuracao.criterios_obrigatorios.';

create index criterio_ordem_idx on criterio (ordem) where ativo;

-- Os 11 critérios, exatamente como `avGruposMeta()` do protótipo do curador.
insert into criterio (chave, grupo, rotulo, obrigatorio, ordem) values
  ('afinacao',       'execucao_tecnica', 'Afinação',      true,  1),
  ('ritmo',          'execucao_tecnica', 'Ritmo',         true,  2),
  ('melodia',        'composicao',       'Melodia',       true,  3),
  ('letra',          'composicao',       'Letra',         false, 4),
  ('personalidade',  'identidade',       'Personalidade', true,  5),
  ('expressividade', 'identidade',       'Expressividade', false, 6),
  ('originalidade',  'identidade',       'Originalidade', false, 7),
  ('conexao',        'impacto',          'Conexão',       true,  8),
  ('memorabilidade', 'impacto',          'Memorabilidade', false, 9),
  ('mixagem',        'producao',         'Mixagem',       false, 10),
  ('arranjo',        'producao',         'Arranjo',       false, 11);

-- ------------------------------------------------------------------ avaliacao

create table avaliacao (
  id uuid primary key default gen_random_uuid(),
  envio_id uuid not null unique references envio (id) on delete cascade,
  -- Denormalizado de propósito: a RLS e as métricas da R3 consultam por
  -- curador, e sem esta coluna toda policy precisaria de um join até `envio`.
  perfil_curador_id uuid not null references perfil_curador (id) on delete restrict,
  nota_subjetiva numeric(2, 1),
  feedback text,
  escuta_percentual numeric(5, 2) not null default 0,
  situacao situacao_avaliacao not null default 'rascunho',
  passo_atual smallint not null default 1,
  -- Congelados na conclusão: a classe do curador muda ao longo do tempo, e o
  -- ganho tem de continuar explicável pelo que valia no momento da entrega.
  no_prazo boolean,
  classe_no_momento classe_curador,
  concluida_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint avaliacao_nota_subjetiva_0_a_5
    check (nota_subjetiva is null
           or (nota_subjetiva between 0 and 5 and nota_subjetiva = round(nota_subjetiva, 1))),
  constraint avaliacao_escuta_0_a_100 check (escuta_percentual between 0 and 100),
  constraint avaliacao_passo_1_a_5 check (passo_atual between 1 and 5),
  -- Concluída sem os campos congelados seria um ganho sem explicação.
  constraint avaliacao_concluida_congela check (
    situacao <> 'concluida'
    or (concluida_em is not null and no_prazo is not null and classe_no_momento is not null)
  )
);

comment on table avaliacao is
  'Uma avaliacao por envio. situacao=rascunho e passo_atual sustentam o "Salvar e sair" (14).';
comment on column avaliacao.escuta_percentual is
  'Maximo medido pelo player, persistido monotonicamente pelo trigger: o medidor zera se a pagina recarregar.';

create index avaliacao_do_curador_idx on avaliacao (perfil_curador_id, situacao);

create trigger avaliacao_atualizado_em
  before update on avaliacao
  for each row execute function atualizar_atualizado_em();

-- A escuta só cresce. O `MedidorDeEscuta` do cliente zera a cada carregamento
-- da página, e sem isto um F5 no meio da avaliação apagaria o progresso já
-- medido — e o curador teria de ouvir tudo de novo.
create or replace function escuta_monotonica()
returns trigger
language plpgsql
set search_path = ''
as $funcao$
begin
  new.escuta_percentual := greatest(coalesce(old.escuta_percentual, 0),
                                    coalesce(new.escuta_percentual, 0));
  return new;
end;
$funcao$;

revoke execute on function escuta_monotonica() from public, anon, authenticated;

create trigger avaliacao_escuta_so_cresce
  before update on avaliacao
  for each row execute function escuta_monotonica();

-- Avaliação concluída é entrega feita e crédito liberado: não se reescreve.
create or replace function proibir_editar_avaliacao_concluida()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $funcao$
begin
  -- `current_user` deixa de ser `authenticated` dentro das RPCs
  -- `security definer` — é assim que `enviar_avaliacao` passa por aqui.
  if current_user <> 'authenticated' then
    return new;
  end if;

  if old.situacao = 'concluida' then
    raise exception 'avaliacao concluida nao e reescrita'
      using errcode = 'DS005';
  end if;

  -- Concluir é ato da RPC, que calcula a remuneração no mesmo instante.
  if new.situacao = 'concluida' then
    raise exception 'concluir avaliacao so por enviar_avaliacao'
      using errcode = 'DS004';
  end if;

  return new;
end;
$funcao$;

revoke execute on function proibir_editar_avaliacao_concluida() from public, anon, authenticated;

create trigger avaliacao_concluida_e_final
  before update on avaliacao
  for each row execute function proibir_editar_avaliacao_concluida();

-- --------------------------------------------------------------- nota_criterio

create table nota_criterio (
  id uuid primary key default gen_random_uuid(),
  avaliacao_id uuid not null references avaliacao (id) on delete cascade,
  criterio text not null references criterio (chave) on delete restrict,
  nota numeric(2, 1) not null,
  justificativa text,

  constraint nota_criterio_unica unique (avaliacao_id, criterio),
  -- 0 a 5 com **uma** casa decimal (regras 5.1). O `round` cobre entrada por
  -- RPC, que não passa pelo `step` do `CampoNota`.
  constraint nota_criterio_0_a_5_uma_casa
    check (nota between 0 and 5 and nota = round(nota, 1))
);

comment on table nota_criterio is
  'Nota por criterio. Justificativa >= configuracao.justificativa_min_caracteres rende acrescimo.';

create index nota_criterio_da_avaliacao_idx on nota_criterio (avaliacao_id);

-- ------------------------------------------------------------ compartilhamento

create table compartilhamento (
  id uuid primary key default gen_random_uuid(),
  avaliacao_id uuid not null unique references avaliacao (id) on delete cascade,
  modalidade modalidade_compartilhamento not null,
  midia_curador_id uuid references midia_curador (id) on delete set null,
  descricao text,
  url text,
  verificado_em timestamptz,
  criado_em timestamptz not null default now(),

  -- Declarar que não vai compartilhar e anexar link é incoerente, e o registro
  -- precisa ser auditável (data-model §9).
  constraint compartilhamento_nao_compartilhou_e_vazio check (
    modalidade <> 'nao_compartilhou'
    or (midia_curador_id is null and url is null)
  ),
  -- "Outros" exige dizer onde (14.3).
  constraint compartilhamento_outros_exige_descricao check (
    modalidade <> 'outros' or char_length(btrim(coalesce(descricao, ''))) > 0
  )
);

comment on table compartilhamento is
  'Uma escolha por avaliacao, inclusive nao_compartilhou — o credito libera nos dois caminhos e a diferenca precisa ser auditavel.';
comment on column compartilhamento.verificado_em is
  'A equipe confere antes de liberar o acrescimo. Com configuracao.compartilhamento.acrescimo_retido = false o acrescimo sai na hora; a coluna existe para a virada de open-questions #8.';

-- Fila de conferência da equipe (12/23).
create index compartilhamento_a_verificar_idx on compartilhamento (criado_em)
  where verificado_em is null and modalidade <> 'nao_compartilhou';

-- --------------------------------------------------------------------- views

-- NO = média das notas objetivas; NS = nota subjetiva; NF = NO + NS
-- (regras 5.4). Escala resultante: **0 a 10**.
--
-- Registrado porque atravessa releases: a fórmula do ranking (regras 4.1) usa
-- "média das notas ÷ 5", que pressupõe 0–5. As duas coisas não estão na mesma
-- escala, e a R3 vai precisar decidir qual normalizar. Aqui as colunas ficam
-- sem normalização, com o nome do documento.
create view nota_avaliacao with (security_invoker = true) as
select
  a.id as avaliacao_id,
  a.envio_id,
  a.perfil_curador_id,
  round(avg(nc.nota), 2) as no,
  a.nota_subjetiva as ns,
  round(avg(nc.nota), 2) + coalesce(a.nota_subjetiva, 0) as nf,
  count(nc.id) as criterios_respondidos
from avaliacao a
left join nota_criterio nc on nc.avaliacao_id = a.id
where a.situacao = 'concluida'
group by a.id, a.envio_id, a.perfil_curador_id, a.nota_subjetiva;

comment on view nota_avaliacao is
  'NO, NS e NF por avaliacao concluida (regras 5.4). NF vive na escala 0-10; a formula do ranking (regras 4.1) pressupoe 0-5 — divergencia a resolver na R3.';

-- Nota média do artista: média das NF das faixas concluídas. Não é coluna de
-- `perfil_artista` de propósito (data-model §3).
create view nota_artista with (security_invoker = true) as
select
  f.perfil_artista_id,
  round(avg(na.nf), 2) as nf_media,
  count(distinct f.id) as faixas_avaliadas,
  count(*) as avaliacoes
from nota_avaliacao na
join envio e on e.id = na.envio_id
join faixa f on f.id = e.faixa_id
group by f.perfil_artista_id;

comment on view nota_artista is
  'Media das NF por artista. Nao esta na tabela de migrations do data-model 11, mas a 3 a exige — nasce aqui, com nota_avaliacao.';

-- `security_invoker` nas duas: sem ele a view roda como o dono e ignora a RLS
-- das tabelas base, e a nota de um artista ficaria legível por qualquer um.

-- --------------------------------------------------------- helpers de acesso

-- Mesma regra da `0006b`: policy que precisa de outra tabela protegida por RLS
-- chama função `security definer`, nunca `exists` direto. Sem isso, a policy de
-- `avaliacao` consultaria `envio`, cuja policy consulta `faixa`, e o Postgres
-- aborta com `42P17 infinite recursion detected in policy`.

create or replace function sou_dono_do_envio(p_envio_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $funcao$
  select exists (
    select 1
      from public.envio e
      join public.faixa f on f.id = e.faixa_id
      join public.perfil_artista pa on pa.id = f.perfil_artista_id
     where e.id = p_envio_id
       and pa.perfil_id = auth.uid()
  );
$funcao$;

comment on function sou_dono_do_envio(uuid) is
  'O artista da sessao e dono da faixa deste envio? Para a policy de avaliacao.';

-- Quem pode ver esta avaliação: o curador dono, o admin, ou o artista — este
-- último **só depois de concluída**. Rascunho é trabalho em andamento.
create or replace function posso_ver_avaliacao(p_avaliacao_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $funcao$
  select exists (
    select 1
      from public.avaliacao a
      join public.perfil_curador pc on pc.id = a.perfil_curador_id
     where a.id = p_avaliacao_id
       and pc.perfil_id = auth.uid()
  )
  or exists (
    select 1
      from public.avaliacao a
      join public.envio e on e.id = a.envio_id
      join public.faixa f on f.id = e.faixa_id
      join public.perfil_artista pa on pa.id = f.perfil_artista_id
     where a.id = p_avaliacao_id
       and a.situacao = 'concluida'
       and pa.perfil_id = auth.uid()
  )
  or public.e_admin();
$funcao$;

comment on function posso_ver_avaliacao(uuid) is
  'Visibilidade da avaliacao. O artista so ve a concluida; rascunho e do curador.';

-- A avaliação é do curador da sessão **e** ainda está em rascunho? É o recorte
-- de escrita: notas e compartilhamento só mudam antes de concluir.
create or replace function avaliacao_em_rascunho_do_curador(p_avaliacao_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $funcao$
  select exists (
    select 1
      from public.avaliacao a
      join public.perfil_curador pc on pc.id = a.perfil_curador_id
     where a.id = p_avaliacao_id
       and pc.perfil_id = auth.uid()
       and a.situacao = 'rascunho'
  );
$funcao$;

comment on function avaliacao_em_rascunho_do_curador(uuid) is
  'Recorte de escrita de nota_criterio e compartilhamento: do dono, e so em rascunho.';

revoke execute on function sou_dono_do_envio(uuid) from public, anon;
revoke execute on function posso_ver_avaliacao(uuid) from public, anon;
revoke execute on function avaliacao_em_rascunho_do_curador(uuid) from public, anon;
grant execute on function sou_dono_do_envio(uuid) to authenticated;
grant execute on function posso_ver_avaliacao(uuid) to authenticated;
grant execute on function avaliacao_em_rascunho_do_curador(uuid) to authenticated;

-- ------------------------------------------------------------------------ RLS

alter table criterio enable row level security;
alter table avaliacao enable row level security;
alter table nota_criterio enable row level security;
alter table compartilhamento enable row level security;

-- criterio: catálogo. Leitura para autenticado, nenhuma escrita — item novo é
-- migration, como em `evento_notificacao`.
create policy "criterio: autenticado le o catalogo"
  on criterio for select
  to authenticated
  using (true);

-- avaliacao ------------------------------------------------------------------

-- O artista lê a avaliação **concluída** da própria faixa. Rascunho é trabalho
-- em andamento do curador e não é visível.
create policy "avaliacao: curador dono le, artista le as concluidas da propria faixa"
  on avaliacao for select
  to authenticated
  using (
    perfil_curador_id = meu_perfil_curador_id()
    or e_admin()
    or (situacao = 'concluida' and sou_dono_do_envio(envio_id))
  );

create policy "avaliacao: curador dono cria"
  on avaliacao for insert
  to authenticated
  with check (perfil_curador_id = meu_perfil_curador_id());

create policy "avaliacao: curador dono edita o rascunho"
  on avaliacao for update
  to authenticated
  using (perfil_curador_id = meu_perfil_curador_id())
  with check (perfil_curador_id = meu_perfil_curador_id());

-- nota_criterio e compartilhamento: seguem a avaliação.

create policy "nota_criterio: segue a avaliacao"
  on nota_criterio for select
  to authenticated
  using (posso_ver_avaliacao(avaliacao_id));

create policy "nota_criterio: curador dono gerencia enquanto e rascunho"
  on nota_criterio for all
  to authenticated
  using (avaliacao_em_rascunho_do_curador(avaliacao_id))
  with check (avaliacao_em_rascunho_do_curador(avaliacao_id));

create policy "compartilhamento: segue a avaliacao"
  on compartilhamento for select
  to authenticated
  using (posso_ver_avaliacao(avaliacao_id));

create policy "compartilhamento: curador dono gerencia enquanto e rascunho"
  on compartilhamento for all
  to authenticated
  using (avaliacao_em_rascunho_do_curador(avaliacao_id))
  with check (avaliacao_em_rascunho_do_curador(avaliacao_id));
