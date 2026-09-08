-- ============================================================================
-- 0006 · Faixas e envios  (R2)
--
-- `faixa`, `envio`, `servico_envio`. Ver data-model §7.
--
-- `envio` é uma linha por **faixa × curador**: é o item da fila (13) e a
-- unidade de prazo, avaliação e remuneração. O modelo precisa aguentar a
-- Seleção de curadores da R3 sem ser refeito (implementation-plan §dependências
-- cruzadas), e é por isso que ele não é um campo da faixa.
--
-- Fecha também a policy do bucket `faixas` que a R0 deixou como comentário.
-- ============================================================================

-- ---------------------------------------------------------------------- faixa

create table faixa (
  id uuid primary key default gen_random_uuid(),
  perfil_artista_id uuid not null references perfil_artista (id) on delete cascade,
  titulo text not null,
  capa_caminho text,
  estilo text,
  genero text,
  contexto_curador text,
  lancada boolean,
  data_lancamento date,
  origem origem_faixa not null,
  url_spotify text,
  url_youtube text,
  arquivo_caminho text,
  duracao_segundos integer,
  metadados_detectados jsonb,
  situacao situacao_faixa not null default 'rascunho',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint faixa_titulo_nao_vazio check (char_length(btrim(titulo)) > 0),

  -- Sem exclusão mútua entre arquivo e link, de propósito: com
  -- `configuracao.upload.armazenar_sempre = true` a faixa por link **também**
  -- guarda o áudio, porque a escuta é medida por um `<audio>` nosso e um
  -- iframe de streaming não expõe posição de reprodução. O check continua
  -- válido se a pendência #7 for decidida ao contrário — `arquivo_caminho`
  -- simplesmente fica nulo.
  constraint faixa_arquivo_exige_caminho
    check (origem <> 'arquivo' or arquivo_caminho is not null),
  constraint faixa_link_exige_url
    check (origem <> 'link' or url_spotify is not null or url_youtube is not null),

  -- Duração implausível é erro de detecção, não faixa exótica. O `MedidorDeEscuta`
  -- exige duração finita e positiva para calcular percentual.
  constraint faixa_duracao_plausivel
    check (duracao_segundos is null or (duracao_segundos > 0 and duracao_segundos < 3600))
);

comment on table faixa is
  'Uma faixa por envio (regras 7). A nota media do artista nao e coluna: vem da view nota_artista (0008).';
comment on column faixa.contexto_curador is
  'O que o curador precisa saber. Obrigatorio no wizard (passo 2), nao no schema: a faixa nasce em rascunho.';
comment on column faixa.arquivo_caminho is
  'Caminho completo no bucket faixas, com o prefixo <uid>/. A policy do bucket compara por igualdade exata com storage.objects.name.';
comment on column faixa.metadados_detectados is
  'Retorno bruto da autodeteccao (Spotify/YouTube), para diagnostico.';

create index faixa_do_artista_idx on faixa (perfil_artista_id, criado_em desc);
create index faixa_situacao_idx on faixa (situacao);

create trigger faixa_atualizado_em
  before update on faixa
  for each row execute function atualizar_atualizado_em();

-- ---------------------------------------------------------------------- envio

create table envio (
  id uuid primary key default gen_random_uuid(),
  faixa_id uuid not null references faixa (id) on delete cascade,
  perfil_curador_id uuid not null references perfil_curador (id) on delete restrict,
  situacao situacao_envio not null default 'recebeu',
  total_claves numeric(10, 2) not null,
  prazo_em timestamptz not null,
  devolucao_em timestamptz not null,
  ouviu_em timestamptz,
  iniciou_em timestamptz,
  concluido_em timestamptz,
  devolvido_em timestamptz,
  -- Não está no data-model. Sem ela, o job horário `avisar_prazo_72h`
  -- notificaria o mesmo curador a cada hora durante as 72 horas.
  avisado_prazo_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  -- "Não permitir selecionar o mesmo curador duas vezes para a mesma música"
  -- (regras 7) é este índice, não uma checagem na aplicação.
  constraint envio_curador_unico_por_faixa unique (faixa_id, perfil_curador_id),
  constraint envio_total_positivo check (total_claves > 0),
  constraint envio_devolucao_depois_do_prazo check (devolucao_em > prazo_em)
);

comment on table envio is
  'Uma linha por faixa x curador. Item da fila (13) e unidade de prazo, avaliacao e remuneracao.';
comment on column envio.perfil_curador_id is
  'FK para perfil_curador(id) — NAO para auth.users. Em policy, use meu_perfil_curador_id().';
comment on column envio.total_claves is
  'Soma dos servico_envio. E a base_claves da remuneracao (data-model 10).';
comment on column envio.avisado_prazo_em is
  'Marca que o aviso de prazo ja saiu, para o job horario nao repetir.';

-- Ordenação padrão da fila, por urgência (13).
create index envio_fila_idx on envio (perfil_curador_id, situacao, prazo_em);

-- Os dois recortes que os jobs varrem. Parciais e estreitos: a varredura
-- horária lê só o que está pendente, e o índice não cresce com o histórico.
create index envio_devolucao_pendente_idx on envio (devolucao_em)
  where situacao in ('recebeu', 'ouviu', 'avaliando');
create index envio_prazo_pendente_idx on envio (prazo_em)
  where situacao in ('recebeu', 'ouviu', 'avaliando') and avisado_prazo_em is null;

create trigger envio_atualizado_em
  before update on envio
  for each row execute function atualizar_atualizado_em();

-- ------------------------------------------------------------- servico_envio

create table servico_envio (
  id uuid primary key default gen_random_uuid(),
  envio_id uuid not null references envio (id) on delete cascade,
  servico_curador_id uuid not null references servico_curador (id) on delete restrict,
  tipo tipo_servico not null,
  preco_claves numeric(10, 2) not null,

  constraint servico_envio_unico_por_tipo unique (envio_id, tipo),
  constraint servico_envio_preco_positivo check (preco_claves > 0)
);

comment on table servico_envio is
  'Servicos contratados no envio. Preco CONGELADO: mudanca de preco nao afeta contratacao feita.';
comment on column servico_envio.preco_claves is
  'Copia do servico_curador.preco_claves no momento da confirmacao, e nao uma FK de leitura.';

create index servico_envio_do_envio_idx on servico_envio (envio_id);

-- ------------------------------------------- transições de estado do envio

-- `Recebeu → Ouviu → Avaliando` são cliques na fila e valem uma policy de
-- update. `Pronto` e `Devolvido` são estados terminais que fecham dinheiro:
-- `pronto` sai de `enviar_avaliacao` e `devolvido` de
-- `devolver_claves_sem_resposta`. Deixá-los na policy permitiria ao curador
-- marcar o envio como concluído sem avaliação — e sem gerar o ganho.
create or replace function proibir_estado_terminal_de_envio()
returns trigger
language plpgsql
set search_path = ''
as $funcao$
begin
  -- Como o trigger distingue a RPC do cliente, sem GUC nenhuma: dentro de uma
  -- função `security definer` o `current_user` passa a ser o **dono** da
  -- função (`postgres`), enquanto uma escrita vinda do PostgREST chega como
  -- `authenticated`. Isso não é falsificável pelo cliente — ele não tem como
  -- executar `set role`, e um sinal por `current_setting` seria, em princípio,
  -- plantável por qualquer função exposta que o escrevesse.
  if current_user <> 'authenticated' then
    return new;
  end if;

  if new.situacao in ('pronto', 'devolvido', 'cancelado')
     and new.situacao is distinct from old.situacao then
    raise exception 'estado terminal de envio so por RPC'
      using errcode = 'DS004';
  end if;

  return new;
end;
$funcao$;

revoke execute on function proibir_estado_terminal_de_envio() from public, anon, authenticated;

create trigger envio_estado_terminal_so_por_rpc
  before update on envio
  for each row execute function proibir_estado_terminal_de_envio();

-- ------------------------------------------------------------------------ RLS

alter table faixa enable row level security;
alter table envio enable row level security;
alter table servico_envio enable row level security;

-- faixa ----------------------------------------------------------------------

-- O curador lê a faixa que está avaliando — e só enquanto o envio está ativo.
-- Depois de `pronto` ou `devolvido` a faixa sai do alcance dele.
create policy "faixa: dono le, e o curador com envio ativo tambem"
  on faixa for select
  to authenticated
  using (
    perfil_artista_id = meu_perfil_artista_id()
    or e_admin()
    or exists (
      select 1 from envio e
       where e.faixa_id = faixa.id
         and e.perfil_curador_id = meu_perfil_curador_id()
         and e.situacao in ('recebeu', 'ouviu', 'avaliando')
    )
  );

create policy "faixa: dono cria a propria"
  on faixa for insert
  to authenticated
  with check (perfil_artista_id = meu_perfil_artista_id());

create policy "faixa: dono edita a propria"
  on faixa for update
  to authenticated
  using (perfil_artista_id = meu_perfil_artista_id())
  with check (perfil_artista_id = meu_perfil_artista_id());

create policy "faixa: dono descarta rascunho"
  on faixa for delete
  to authenticated
  using (perfil_artista_id = meu_perfil_artista_id() and situacao = 'rascunho');

-- Faixa em curadoria é contrato em andamento: o artista não reescreve o que o
-- curador está avaliando. RLS filtra linha, não coluna — daí o trigger.
create or replace function proibir_editar_faixa_em_curadoria()
returns trigger
language plpgsql
security definer
set search_path = ''
as $funcao$
begin
  -- Mesmo critério do trigger de estado terminal: `current_user` deixa de ser
  -- `authenticated` dentro das RPCs `security definer`.
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

create trigger faixa_conteudo_congelado_em_curadoria
  before update on faixa
  for each row execute function proibir_editar_faixa_em_curadoria();

-- envio ----------------------------------------------------------------------

create policy "envio: curador dono, artista dono da faixa e admin leem"
  on envio for select
  to authenticated
  using (
    perfil_curador_id = meu_perfil_curador_id()
    or e_admin()
    or exists (
      select 1 from faixa f
       where f.id = envio.faixa_id
         and f.perfil_artista_id = meu_perfil_artista_id()
    )
  );

-- O curador avança o estado na fila. `pronto`/`devolvido` ficam de fora pelo
-- trigger acima.
create policy "envio: curador dono avanca o estado"
  on envio for update
  to authenticated
  using (perfil_curador_id = meu_perfil_curador_id())
  with check (perfil_curador_id = meu_perfil_curador_id());

-- Sem insert e sem delete: envio nasce em `confirmar_selecao_curadores`, que
-- é a única operação que pode debitar Claves no mesmo ato.

-- servico_envio --------------------------------------------------------------

create policy "servico_envio: quem le o envio le os servicos"
  on servico_envio for select
  to authenticated
  using (
    exists (
      select 1 from envio e
       where e.id = servico_envio.envio_id
         and (
           e.perfil_curador_id = meu_perfil_curador_id()
           or e_admin()
           or exists (
             select 1 from faixa f
              where f.id = e.faixa_id
                and f.perfil_artista_id = meu_perfil_artista_id()
           )
         )
    )
  );

-- Nenhuma escrita: preço congelado é escrito uma vez, pela RPC.

-- ------------------------------------------- policy pendente do bucket faixas

-- Fecha o que `20260904171821_0000_storage.sql` deixou como comentário "PENDENTE
-- R2". Três correções sobre aquele rascunho, e vale registrar porque o erro é
-- do tipo que nega tudo em silêncio:
--
--  1. o rascunho compara `e.curador_id = auth.uid()`. A coluna é
--     `envio.perfil_curador_id`, e ela referencia `perfil_curador(id)` — não
--     `auth.users(id)`. É preciso o join até `perfil_curador.perfil_id`.
--  2. a policy vive no schema `storage`, então as tabelas do produto precisam
--     de `public.`.
--  3. `storage.objects.name` precisa ser qualificado, senão colide com
--     `faixa.arquivo_caminho` na resolução do predicado.
--
-- A comparação é por **igualdade exata** com `arquivo_caminho`, prefixo
-- `<uid>/` incluído. Um mismatch aqui nega o player do curador sem erro
-- nenhum, e trava o fluxo de avaliação inteiro com cara de bug de front.
create policy "faixas: curador com envio ativo le"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'faixas'
    and exists (
      select 1
        from public.envio e
        join public.faixa f on f.id = e.faixa_id
        join public.perfil_curador pc on pc.id = e.perfil_curador_id
       where f.arquivo_caminho = storage.objects.name
         and pc.perfil_id = auth.uid()
         and e.situacao in ('recebeu', 'ouviu', 'avaliando')
    )
  );
