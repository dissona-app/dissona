-- ============================================================================
-- 0002 · Perfis de artista e curador  (R1)
--
-- `perfil_artista`, `perfil_curador`, `credencial_curador`, `midia_curador`,
-- `servico_curador`. Ver data-model §3.
--
-- Acrescenta dois helpers que não estão na especificação e que existem para
-- evitar um erro sistêmico — ver o bloco "helpers de dono" abaixo.
-- ============================================================================

-- ------------------------------------------------------------ perfil_artista

create table perfil_artista (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null unique references perfil (id) on delete cascade,
  bio text,
  generos text[],
  link_instagram text,
  link_spotify text,
  link_youtube text,
  link_site text,
  cobranca_nome text,
  cobranca_documento text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint perfil_artista_bio_ate_280 check (char_length(bio) <= 280),
  constraint perfil_artista_ate_3_generos check (coalesce(array_length(generos, 1), 0) <= 3)
);

comment on table perfil_artista is
  'Perfil publico do artista (7.1). A nota media nao e coluna: vem da view nota_artista (0008).';

create trigger perfil_artista_atualizado_em
  before update on perfil_artista
  for each row execute function atualizar_atualizado_em();

-- ------------------------------------------------------------ perfil_curador

create table perfil_curador (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null unique references perfil (id) on delete cascade,
  bio text,
  generos text[],
  classe classe_curador not null default 'bronze',
  situacao situacao_curador not null default 'rascunho',
  atuacao text[],
  tempo_atuacao text,
  especialidade text,
  formacao text,
  premios text,
  participacao_disco boolean,
  link_participacao_disco text,
  passo_cadastro smallint not null default 1,
  cadastro_concluido_em timestamptz,
  classificado_em timestamptz,
  chave_pix text,
  chave_pix_tipo text,
  chave_pix_situacao text,
  asaas_carteira_id text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint perfil_curador_passo_1_a_8 check (passo_cadastro between 1 and 8),
  constraint perfil_curador_tempo_conhecido
    check (tempo_atuacao is null or tempo_atuacao in ('<1', '1-3', '3-5', '5-10', '+10'))
);

comment on table perfil_curador is
  'Cadastro profissional do curador (modulo 12). A classe e o unico atributo de desempenho persistido aqui, porque define remuneracao ja na R2; ranking e calibracao vivem em metrica_curador (R3).';
comment on column perfil_curador.passo_cadastro is
  'Retomada do wizard de 8 passos (RF-068 do cadastro).';
comment on column perfil_curador.cadastro_concluido_em is
  'Guarda a rota (app)/curador: nulo significa wizard pendente. architecture 5.1.';
comment on column perfil_curador.asaas_carteira_id is
  'Subconta do curador no gateway. Fica nula enquanto open-questions #6 nao decidir o modelo de split.';

create index perfil_curador_classe_idx on perfil_curador (classe);
create index perfil_curador_situacao_idx on perfil_curador (situacao);

create trigger perfil_curador_atualizado_em
  before update on perfil_curador
  for each row execute function atualizar_atualizado_em();

-- --------------------------------------------------------- helpers de dono

-- Estes dois não estão no data-model, e existem para impedir um erro que já
-- apareceu uma vez no projeto: o rascunho de policy do bucket `faixas`, em
-- `0000_storage.sql`, compara `envio.curador_id = auth.uid()`. A coluna certa
-- é `envio.perfil_curador_id`, e ela referencia `perfil_curador(id)` — não
-- `auth.users(id)`. Comparar as duas coisas parece funcionar e nega tudo.
--
-- O mesmo par de chaves reaparece em `envio`, `avaliacao`, `ganho_curador`,
-- `faixa`, `pedido_clave` e `lancamento_clave`. Com estes helpers, cada policy
-- vira uma igualdade simples — que o planner casa com índice — e existe **um**
-- lugar onde o join pode estar errado, em vez de dez.
create or replace function meu_perfil_artista_id()
returns uuid
language sql
security definer
stable
set search_path = ''
as $funcao$
  select pa.id from public.perfil_artista pa where pa.perfil_id = auth.uid();
$funcao$;

create or replace function meu_perfil_curador_id()
returns uuid
language sql
security definer
stable
set search_path = ''
as $funcao$
  select pc.id from public.perfil_curador pc where pc.perfil_id = auth.uid();
$funcao$;

comment on function meu_perfil_artista_id() is
  'PK de perfil_artista da sessao. Use em policy: perfil_artista_id = meu_perfil_artista_id().';
comment on function meu_perfil_curador_id() is
  'PK de perfil_curador da sessao. Nunca compare perfil_curador_id com auth.uid().';

revoke execute on function meu_perfil_artista_id() from public, anon;
revoke execute on function meu_perfil_curador_id() from public, anon;
grant execute on function meu_perfil_artista_id() to authenticated;
grant execute on function meu_perfil_curador_id() to authenticated;

-- ------------------------------------------------------- credencial_curador

-- É a contagem destas linhas com `verificavel` que classifica Bronze x
-- candidato a Prata (12.4).
create table credencial_curador (
  id uuid primary key default gen_random_uuid(),
  perfil_curador_id uuid not null references perfil_curador (id) on delete cascade,
  tipo text not null,
  descricao text not null,
  url text,
  -- Coluna gerada, não coluna livre: o data-model define `verificavel` como
  -- "url is not null", e deixá-la editável convidaria a divergência entre o
  -- flag e o dado que ele descreve.
  verificavel boolean generated always as (url is not null) stored,
  criado_em timestamptz not null default now(),

  constraint credencial_curador_tipo_conhecido
    check (tipo in ('veiculo', 'formacao', 'premio', 'participacao_disco')),
  constraint credencial_curador_descricao_nao_vazia
    check (char_length(btrim(descricao)) > 0)
);

create index credencial_curador_dono_idx on credencial_curador (perfil_curador_id);

-- ------------------------------------------------------------- midia_curador

create table midia_curador (
  id uuid primary key default gen_random_uuid(),
  perfil_curador_id uuid not null references perfil_curador (id) on delete cascade,
  tipo tipo_midia not null,
  nome text not null,
  url text not null,
  salvamentos integer,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint midia_curador_salvamentos_nao_negativo
    check (salvamentos is null or salvamentos >= 0)
);

comment on table midia_curador is
  'Modalidades de compartilhamento (12.1). Alterar midia NAO altera a classe (regras 2).';
comment on column midia_curador.salvamentos is
  'So para playlist do Spotify, e depende da integracao (R3, open-questions #19). Nulo significa desconhecido, nao zero.';

create index midia_curador_ativas_idx on midia_curador (perfil_curador_id) where ativo;

create trigger midia_curador_atualizado_em
  before update on midia_curador
  for each row execute function atualizar_atualizado_em();

-- ----------------------------------------------------------- servico_curador

create table servico_curador (
  id uuid primary key default gen_random_uuid(),
  perfil_curador_id uuid not null references perfil_curador (id) on delete cascade,
  tipo tipo_servico not null,
  descricao text,
  preco_claves numeric(10, 2) not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint servico_curador_unico_por_tipo unique (perfil_curador_id, tipo),
  constraint servico_curador_preco_positivo check (preco_claves > 0)
);

comment on table servico_curador is
  'O que o curador vende (12.2). O servico feedback e obrigatorio e sempre existe.';

create index servico_curador_ativos_idx on servico_curador (perfil_curador_id) where ativo;

create trigger servico_curador_atualizado_em
  before update on servico_curador
  for each row execute function atualizar_atualizado_em();

-- O `feedback` é obrigatório e sempre existe (data-model §3). Um `delete`
-- livre o apagaria e deixaria o curador contratável sem o serviço que a
-- avaliação exige. Desativar também não vale: `confirmar_selecao_curadores`
-- exige um `servico_envio` de feedback.
create or replace function proibir_remover_servico_feedback()
returns trigger
language plpgsql
set search_path = ''
as $funcao$
begin
  if old.tipo = 'feedback' then
    raise exception 'o servico feedback e obrigatorio e nao pode ser removido'
      using errcode = 'DS012';
  end if;
  return old;
end;
$funcao$;

revoke execute on function proibir_remover_servico_feedback() from public, anon, authenticated;

create trigger servico_curador_feedback_indelevel
  before delete on servico_curador
  for each row execute function proibir_remover_servico_feedback();

-- --------------------------------------------------- contexto para a sessão

-- O `middleware.ts` roda em `gru1` e o banco está em `us-west-2`: cada ida
-- custa ~120 ms (architecture §9). Hoje o middleware faz `getUser()` e depois
-- `lerPapeis`, e a guarda de `(app)/curador` precisaria de uma terceira
-- consulta para saber se o cadastro do módulo 12 está concluído. Esta função
-- funde as duas últimas em uma.
create or replace function ler_contexto_sessao()
returns table (papeis papel[], cadastro_curador_concluido boolean)
language sql
security definer
stable
set search_path = ''
as $funcao$
  select
    coalesce(
      (select array_agg(pu.papel order by pu.papel)
         from public.papel_usuario pu
        where pu.perfil_id = auth.uid() and pu.ativo),
      '{}'::public.papel[]
    ),
    exists (
      select 1 from public.perfil_curador pc
       where pc.perfil_id = auth.uid()
         and pc.cadastro_concluido_em is not null
    );
$funcao$;

comment on function ler_contexto_sessao() is
  'Papeis ativos e conclusao do cadastro de curador, numa ida ao banco. Consumida pelo middleware.';

revoke execute on function ler_contexto_sessao() from public, anon;
grant execute on function ler_contexto_sessao() to authenticated;

-- ------------------------------------------------------------------------ RLS

alter table perfil_artista enable row level security;
alter table perfil_curador enable row level security;
alter table credencial_curador enable row level security;
alter table midia_curador enable row level security;
alter table servico_curador enable row level security;

-- perfil_artista -------------------------------------------------------------

create policy "perfil_artista: dono le a propria linha"
  on perfil_artista for select
  to authenticated
  using (perfil_id = auth.uid() or e_admin());

create policy "perfil_artista: dono cria a propria linha"
  on perfil_artista for insert
  to authenticated
  with check (perfil_id = auth.uid());

create policy "perfil_artista: dono atualiza a propria linha"
  on perfil_artista for update
  to authenticated
  using (perfil_id = auth.uid())
  with check (perfil_id = auth.uid());

-- perfil_curador -------------------------------------------------------------

-- O artista precisa ver o curador para escolhê-lo (módulo 4, R3), mas só o
-- curador aprovado — quem está em rascunho ou recusado não é contratável e não
-- deve aparecer em vitrine nenhuma.
create policy "perfil_curador: aprovados sao publicos para autenticados"
  on perfil_curador for select
  to authenticated
  using (
    situacao in ('bronze_aprovado', 'prata_aprovado')
    or perfil_id = auth.uid()
    or e_admin()
  );

create policy "perfil_curador: dono cria a propria linha"
  on perfil_curador for insert
  to authenticated
  with check (perfil_id = auth.uid());

-- `classe` e `situacao` NÃO são protegidas aqui por policy — RLS filtra linha,
-- não coluna. A trava está no trigger abaixo: sem ela, o curador se promoveria
-- a Ouro e alteraria a própria remuneração.
create policy "perfil_curador: dono atualiza a propria linha"
  on perfil_curador for update
  to authenticated
  using (perfil_id = auth.uid())
  with check (perfil_id = auth.uid());

create policy "perfil_curador: admin gerencia qualquer linha"
  on perfil_curador for update
  to authenticated
  using (e_admin())
  with check (e_admin());

-- A decisão de classe é do admin (20.3 e 20.4) e é sempre logada. Deixar o
-- dono escrever `classe` seria deixá-lo definir o próprio percentual de
-- repasse, que é exatamente o que `calcular_remuneracao` lê.
create or replace function proibir_autopromocao_de_classe()
returns trigger
language plpgsql
security definer
set search_path = ''
as $funcao$
begin
  if public.e_admin() then
    return new;
  end if;

  if new.classe is distinct from old.classe
     or new.situacao is distinct from old.situacao
     or new.classificado_em is distinct from old.classificado_em then
    raise exception 'classe e situacao do curador sao decisao do admin'
      using errcode = 'DS020';
  end if;

  return new;
end;
$funcao$;

revoke execute on function proibir_autopromocao_de_classe() from public, anon, authenticated;

create trigger perfil_curador_classe_so_pelo_admin
  before update on perfil_curador
  for each row execute function proibir_autopromocao_de_classe();

-- credencial_curador ---------------------------------------------------------

create policy "credencial_curador: dono gerencia as proprias"
  on credencial_curador for all
  to authenticated
  using (perfil_curador_id = meu_perfil_curador_id())
  with check (perfil_curador_id = meu_perfil_curador_id());

create policy "credencial_curador: admin le todas"
  on credencial_curador for select
  to authenticated
  using (e_admin());

-- midia_curador --------------------------------------------------------------

create policy "midia_curador: ativas sao visiveis para autenticados"
  on midia_curador for select
  to authenticated
  using (ativo or perfil_curador_id = meu_perfil_curador_id() or e_admin());

create policy "midia_curador: dono gerencia as proprias"
  on midia_curador for all
  to authenticated
  using (perfil_curador_id = meu_perfil_curador_id())
  with check (perfil_curador_id = meu_perfil_curador_id());

-- servico_curador ------------------------------------------------------------

create policy "servico_curador: ativos sao visiveis para autenticados"
  on servico_curador for select
  to authenticated
  using (ativo or perfil_curador_id = meu_perfil_curador_id() or e_admin());

create policy "servico_curador: dono gerencia os proprios"
  on servico_curador for all
  to authenticated
  using (perfil_curador_id = meu_perfil_curador_id())
  with check (perfil_curador_id = meu_perfil_curador_id());
