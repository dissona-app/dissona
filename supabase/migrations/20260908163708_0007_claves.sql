-- ============================================================================
-- 0007 · Claves  (R2)
--
-- `pacote_clave`, `pedido_clave`, `evento_provedor`, `lancamento_clave` e a
-- view `saldo_carteira`. Ver data-model §8.
--
-- O ledger é **append-only** e o saldo é **derivado** dele (RNF-008): estorno,
-- devolução por SLA e conciliação exigem histórico, e saldo denormalizado
-- diverge. Escritas no ledger só por RPC `security definer` (RNF-003).
-- ============================================================================

-- --------------------------------------------------------------- pacote_clave

create table pacote_clave (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  quantidade_claves numeric(10, 2) not null,
  valor_centavos bigint not null,
  desconto_percentual numeric(5, 2) not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint pacote_clave_nome_nao_vazio check (char_length(btrim(nome)) > 0),
  constraint pacote_clave_quantidade_positiva check (quantidade_claves > 0),
  constraint pacote_clave_valor_positivo check (valor_centavos > 0),
  constraint pacote_clave_desconto_valido check (desconto_percentual between 0 and 100)
);

comment on table pacote_clave is
  'Pacotes que o artista compra (21). Preco por Clave e DERIVADO: valor_centavos / quantidade_claves, nunca coluna.';
comment on column pacote_clave.ativo is
  'Só pacote ativo aparece na Carteira (regras 1). "Excluir" na tela A3 e desativar: pedido_clave referencia o pacote.';

create index pacote_clave_ativos_idx on pacote_clave (ativo) where ativo;

create trigger pacote_clave_atualizado_em
  before update on pacote_clave
  for each row execute function atualizar_atualizado_em();

-- Trigger de auditoria que a `0003` não pôde criar, porque a tabela nasce aqui.
-- Toda criação, alteração, ativação e exclusão de pacote fica registrada
-- (data-model §8), e é o que a nota da tela 21 promete.
create trigger pacote_clave_auditoria
  after insert or update or delete on pacote_clave
  for each row execute function registrar_auditoria();

-- --------------------------------------------------------------- pedido_clave

create table pedido_clave (
  id uuid primary key default gen_random_uuid(),
  perfil_artista_id uuid not null references perfil_artista (id) on delete restrict,
  -- Nulável de propósito: o pacote pode ser desativado ou excluído depois, e a
  -- compra já feita continua válida (regras 1).
  pacote_clave_id uuid references pacote_clave (id) on delete set null,
  quantidade_claves numeric(10, 2) not null,
  valor_bruto_centavos bigint not null,
  desconto_centavos bigint not null default 0,
  valor_total_centavos bigint not null,
  meio meio_pagamento not null,
  situacao situacao_pedido not null default 'criado',
  provedor text not null default 'asaas',
  provedor_cobranca_id text,
  pix_payload text,
  pix_qr text,
  pago_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint pedido_clave_cobranca_unica unique (provedor_cobranca_id),
  constraint pedido_clave_quantidade_positiva check (quantidade_claves > 0),
  constraint pedido_clave_valores_nao_negativos
    check (valor_bruto_centavos > 0 and desconto_centavos >= 0 and valor_total_centavos > 0),
  -- A aritmética do desconto fecha no banco, e não só na tela do checkout.
  constraint pedido_clave_desconto_fecha
    check (valor_bruto_centavos - desconto_centavos = valor_total_centavos),
  constraint pedido_clave_pago_exige_aprovado
    check (pago_em is null or situacao in ('aprovado', 'estornado'))
);

comment on table pedido_clave is
  'Pedido de compra de Claves (5.2). Valores CONGELADOS na criacao: mudanca de pacote nao altera pedido feito.';
comment on column pedido_clave.provedor_cobranca_id is
  'Id da cobranca no gateway. Unico, e e por ele que o webhook encontra o pedido.';

create index pedido_clave_do_artista_idx on pedido_clave (perfil_artista_id, criado_em desc);
create index pedido_clave_pendentes_idx on pedido_clave (situacao)
  where situacao in ('criado', 'processando');

create trigger pedido_clave_atualizado_em
  before update on pedido_clave
  for each row execute function atualizar_atualizado_em();

-- ------------------------------------------------------------- evento_provedor

create table evento_provedor (
  id_evento_provedor text primary key,
  provedor text not null,
  tipo text not null,
  carga jsonb not null,
  processado_em timestamptz,
  recebido_em timestamptz not null default now()
);

comment on table evento_provedor is
  'Idempotencia do webhook (RNF-009). RLS habilitada com ZERO policies: nega a todo papel, e so a RPC security definer escreve.';

create index evento_provedor_nao_processados_idx on evento_provedor (recebido_em)
  where processado_em is null;

-- ----------------------------------------------------------- lancamento_clave

create table lancamento_clave (
  id bigint primary key generated always as identity,
  perfil_artista_id uuid not null references perfil_artista (id) on delete restrict,
  tipo tipo_lancamento_clave not null,
  -- **Com sinal**: positivo credita, negativo debita. O saldo é a soma.
  quantidade numeric(10, 2) not null,
  pedido_clave_id uuid references pedido_clave (id) on delete set null,
  envio_id uuid references envio (id) on delete set null,
  descricao text not null,
  criado_em timestamptz not null default now(),

  constraint lancamento_clave_quantidade_nao_zero check (quantidade <> 0),
  constraint lancamento_clave_descricao_nao_vazia check (char_length(btrim(descricao)) > 0),
  -- Crédito e débito têm sinal previsível: sem isso, um `consumo` positivo
  -- passaria e creditaria o artista em vez de debitar.
  constraint lancamento_clave_sinal_coerente check (
    (tipo in ('compra', 'devolucao') and quantidade > 0)
    or (tipo = 'consumo' and quantidade < 0)
    or tipo in ('estorno', 'ajuste')
  )
);

comment on table lancamento_clave is
  'Ledger append-only de Claves. Nunca sofre update nem delete. Saldo e derivado daqui (RNF-008).';
comment on column lancamento_clave.descricao is
  'Coluna "Origem" do extrato (5.3).';
comment on column lancamento_clave.quantidade is
  'Com sinal. Positivo credita, negativo debita; o check garante o sinal por tipo.';

create index lancamento_clave_extrato_idx on lancamento_clave (perfil_artista_id, criado_em desc);
create index lancamento_clave_tipo_idx on lancamento_clave (tipo);

-- **A espinha dorsal da idempotência financeira.** Com estes dois índices, um
-- duplo débito ou uma segunda devolução do mesmo envio são fisicamente
-- impossíveis — não dependem de a RPC estar correta.
create unique index lancamento_clave_um_consumo_por_envio
  on lancamento_clave (envio_id) where tipo = 'consumo';
create unique index lancamento_clave_uma_devolucao_por_envio
  on lancamento_clave (envio_id) where tipo = 'devolucao';

-- E uma compra credita uma vez só, por pedido. É o que o gate da R2 exige:
-- "compra de Claves credita uma única vez sob webhook duplicado".
create unique index lancamento_clave_uma_compra_por_pedido
  on lancamento_clave (pedido_clave_id) where tipo = 'compra';

-- Append-only vale também para as RPCs `security definer`, que a RLS não
-- alcança. É trigger, não policy.
create or replace function proibir_alteracao_de_lancamento()
returns trigger
language plpgsql
set search_path = ''
as $funcao$
begin
  raise exception 'lancamento_clave e append-only: % nao e permitido', lower(tg_op)
    using errcode = 'DS023';
end;
$funcao$;

revoke execute on function proibir_alteracao_de_lancamento() from public, anon, authenticated;

create trigger lancamento_clave_append_only
  before update or delete on lancamento_clave
  for each row execute function proibir_alteracao_de_lancamento();

create trigger lancamento_clave_auditoria
  after insert on lancamento_clave
  for each row execute function registrar_auditoria();

-- --------------------------------------------------------- view saldo_carteira

-- `security_invoker = true` é obrigatório. Sem ele a view roda como o dono e
-- **ignora a RLS das tabelas base** — um artista consultando `saldo_carteira`
-- veria o saldo de todos os outros, sem erro nenhum no log. É a falha mais
-- silenciosa possível num dado financeiro.
create view saldo_carteira with (security_invoker = true) as
select
  pa.id as perfil_artista_id,
  coalesce(l.total, 0)::numeric(12, 2) as disponivel,
  coalesce(c.comprometido, 0)::numeric(12, 2) as comprometido,
  coalesce(d.devolvido, 0)::numeric(12, 2) as devolvido
from perfil_artista pa
left join (
  select perfil_artista_id, sum(quantidade) as total
    from lancamento_clave group by perfil_artista_id
) l on l.perfil_artista_id = pa.id
left join (
  select f.perfil_artista_id, sum(e.total_claves) as comprometido
    from envio e
    join faixa f on f.id = e.faixa_id
   where e.situacao in ('recebeu', 'ouviu', 'avaliando')
   group by f.perfil_artista_id
) c on c.perfil_artista_id = pa.id
left join (
  select perfil_artista_id, sum(quantidade) as devolvido
    from lancamento_clave where tipo = 'devolucao' group by perfil_artista_id
) d on d.perfil_artista_id = pa.id;

comment on view saldo_carteira is
  'Saldo derivado do ledger. ATENCAO: `disponivel` e a soma COMPLETA do ledger e JA EXCLUI o comprometido, porque o consumo e debitado na confirmacao da selecao. `comprometido` e recorte de exibicao (5) — nunca subtraia um do outro na View.';

-- `left join` a partir de `perfil_artista` para o artista sem movimento
-- aparecer com zero, em vez de desaparecer da consulta.

-- ------------------------------------------------------------------- RPCs

-- Criação do pedido. Os valores são congelados aqui, a partir do pacote: se o
-- admin mudar o preço no meio do checkout, o pedido já criado não muda
-- (regras 1, "alteração vale para novas compras").
create or replace function criar_pedido_clave(
  p_pacote_clave_id uuid,
  p_meio meio_pagamento
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $funcao$
declare
  v_pacote public.pacote_clave;
  v_artista uuid := public.meu_perfil_artista_id();
  v_clave_centavos bigint;
  v_bruto bigint;
  v_pedido_id uuid;
begin
  if v_artista is null then
    raise exception 'apenas artista compra Claves' using errcode = 'DS020';
  end if;

  select * into v_pacote from public.pacote_clave p where p.id = p_pacote_clave_id and p.ativo;
  if not found then
    raise exception 'pacote inexistente ou inativo' using errcode = 'DS024';
  end if;

  select (c.valor::text)::bigint into v_clave_centavos
    from public.configuracao c where c.chave = 'clave_valor_centavos';
  if v_clave_centavos is null then
    raise exception 'configuracao clave_valor_centavos ausente' using errcode = 'DS030';
  end if;

  -- Bruto é a quantidade ao valor cheio da Clave. O `greatest` cobre um pacote
  -- cadastrado com valor acima do cheio (desconto negativo, que a tela 21.1
  -- não deveria permitir): o pedido fica sem desconto, em vez de gravar um
  -- desconto negativo que o check recusaria.
  v_bruto := greatest(round(v_pacote.quantidade_claves * v_clave_centavos),
                      v_pacote.valor_centavos);

  -- O desconto é a **diferença**, nunca um segundo arredondamento sobre o
  -- percentual: é o que faz `bruto - desconto = total` fechar sempre, sem
  -- centavo perdido.
  insert into public.pedido_clave (
    perfil_artista_id, pacote_clave_id, quantidade_claves,
    valor_bruto_centavos, desconto_centavos, valor_total_centavos, meio
  )
  values (
    v_artista, v_pacote.id, v_pacote.quantidade_claves,
    v_bruto, v_bruto - v_pacote.valor_centavos, v_pacote.valor_centavos, p_meio
  )
  returning id into v_pedido_id;

  return v_pedido_id;
end;
$funcao$;

comment on function criar_pedido_clave(uuid, meio_pagamento) is
  'Cria o pedido com valores congelados do pacote. Nao credita nada: o credito e do webhook.';

revoke execute on function criar_pedido_clave(uuid, meio_pagamento) from public, anon;
grant execute on function criar_pedido_clave(uuid, meio_pagamento) to authenticated;

-- Idempotência do webhook. `evento_provedor` não tem policy nenhuma, e o
-- projeto decidiu não carregar a service role key (`.env.local`) — então o
-- route handler passa por aqui.
--
-- Devolve `true` quando o evento é novo. `false` significa entrega repetida, e
-- o handler responde 200 sem efeito.
create or replace function registrar_evento_provedor(
  p_id_evento text,
  p_provedor text,
  p_tipo text,
  p_carga jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $funcao$
declare
  v_inseriu boolean;
begin
  insert into public.evento_provedor (id_evento_provedor, provedor, tipo, carga)
  values (p_id_evento, p_provedor, p_tipo, p_carga)
  on conflict (id_evento_provedor) do nothing;

  v_inseriu := found;
  return v_inseriu;
end;
$funcao$;

comment on function registrar_evento_provedor(text, text, text, jsonb) is
  'Idempotencia do webhook (RNF-009). true = evento novo; false = entrega repetida, responder 200 sem efeito.';

revoke execute on function registrar_evento_provedor(text, text, text, jsonb)
  from public, anon, authenticated;

-- Confirmação do pagamento. Atômica: aprova o pedido, credita o ledger e
-- notifica. O `where situacao <> 'aprovado'` é a segunda defesa contra entrega
-- concorrente — a primeira é o índice único de uma compra por pedido.
create or replace function confirmar_pedido_clave(p_pedido_id uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $funcao$
declare
  v_pedido public.pedido_clave;
  v_perfil uuid;
  v_lancamento_id bigint;
begin
  select * into v_pedido from public.pedido_clave p where p.id = p_pedido_id for update;
  if not found then
    raise exception 'pedido inexistente' using errcode = 'DS024';
  end if;

  if v_pedido.situacao = 'aprovado' then
    return null;                 -- já creditado; entrega repetida
  end if;

  update public.pedido_clave
     set situacao = 'aprovado', pago_em = now()
   where id = p_pedido_id and situacao <> 'aprovado';

  insert into public.lancamento_clave
    (perfil_artista_id, tipo, quantidade, pedido_clave_id, descricao)
  values
    (v_pedido.perfil_artista_id, 'compra', v_pedido.quantidade_claves, v_pedido.id,
     'Compra de Claves')
  returning id into v_lancamento_id;

  select pa.perfil_id into v_perfil
    from public.perfil_artista pa where pa.id = v_pedido.perfil_artista_id;

  perform public.registrar_notificacao(
    v_perfil, 'compra_claves_confirmada',
    jsonb_build_object('claves', v_pedido.quantidade_claves,
                       'total_centavos', v_pedido.valor_total_centavos));

  -- Conciliação para o admin (matriz: "Nova compra de Claves").
  perform public.registrar_notificacao(
    ma.perfil_id, 'nova_compra_claves',
    jsonb_build_object('pedido_id', v_pedido.id,
                       'total_centavos', v_pedido.valor_total_centavos))
  from public.membro_admin ma where ma.ativo;

  return v_lancamento_id;
end;
$funcao$;

comment on function confirmar_pedido_clave(uuid) is
  'Aprova o pedido, credita o ledger e notifica, numa transacao. Idempotente: devolve null se ja estava aprovado.';

revoke execute on function confirmar_pedido_clave(uuid) from public, anon, authenticated;

-- ------------------------------------------------------------------------ RLS

alter table pacote_clave enable row level security;
alter table pedido_clave enable row level security;
alter table evento_provedor enable row level security;
alter table lancamento_clave enable row level security;

-- pacote_clave: "só os pacotes ativos aparecem na Carteira do artista" vira
-- RLS, e não filtro de query que alguém pode esquecer.
create policy "pacote_clave: ativos sao visiveis, e a equipe ve todos"
  on pacote_clave for select
  to authenticated
  using (ativo or tem_permissao('pacotes'));

create policy "pacote_clave: quem gere pacotes cria"
  on pacote_clave for insert
  to authenticated
  with check (tem_permissao('pacotes', true));

create policy "pacote_clave: quem gere pacotes edita"
  on pacote_clave for update
  to authenticated
  using (tem_permissao('pacotes', true))
  with check (tem_permissao('pacotes', true));

-- Sem delete: "excluir pacote" na tela A3 é `ativo = false`, e é por isso que
-- `pedido_clave.pacote_clave_id` pode ser nulo em vez de bloquear a operação.

-- pedido_clave: leitura do dono e do financeiro; **nenhuma escrita**. Valores e
-- situação vêm do gateway, e deixar o artista inserir permitiria cunhar um
-- pedido já aprovado.
create policy "pedido_clave: dono e financeiro leem"
  on pedido_clave for select
  to authenticated
  using (perfil_artista_id = meu_perfil_artista_id() or tem_permissao('financeiro'));

-- evento_provedor: RLS habilitada, zero policies. Nega a todo papel; só a RPC
-- `security definer` escreve. É a expressão mais limpa da intenção.

-- lancamento_clave: leitura do dono e do financeiro, **somente leitura**
-- (data-model §12).
create policy "lancamento_clave: dono e financeiro leem"
  on lancamento_clave for select
  to authenticated
  using (perfil_artista_id = meu_perfil_artista_id() or tem_permissao('financeiro'));
