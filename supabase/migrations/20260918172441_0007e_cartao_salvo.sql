-- ============================================================================
-- 0007e · `cartao_salvo` — o token que o Asaas devolve depois da cobrança
--
-- ## Por que uma tabela, e não colunas em `perfil_artista`
--
-- `cobranca_nome` e `cobranca_documento` moram lá porque são **dados do
-- titular**, que mudam junto com a pessoa. Um cartão não: ele nasce numa
-- cobrança aprovada, vence, é trocado, e precisa poder ser removido sem tocar
-- no perfil. Três colunas nuláveis dariam um cartão por conta e fariam a
-- remoção ser `update ... = null` em três lugares — o tipo de escrita que se
-- esquece pela metade. Aqui remover é `delete`, e o expurgo da LGPD também.
--
-- ## O que **não** está aqui, e não pode estar
--
-- Número, CVV e validade. O que se guarda é o `creditCardToken` do Asaas, que
-- é uma referência opaca à cobrança original — inútil fora da conta deles —,
-- mais os quatro últimos dígitos e a bandeira, que existem só para a tela
-- dizer "Mastercard ···· 4242". Nada disso é dado de cartão no sentido do
-- PCI-DSS.
--
-- ⚠️ **A tokenização do Asaas é posterior à primeira cobrança.** Não existe
-- caminho em que o cartão não passe por nós na primeira vez; o que esta tabela
-- compra é que ele não passe **de novo** — ver open-questions #28.
--
-- ## Escrita pelo dono, e o que isso permite
--
-- O insert roda na sessão da pessoa, dentro da Server Action, logo depois de a
-- cobrança ser aprovada. Um artista mal-intencionado poderia, em tese, inserir
-- um token arbitrário para si — e não ganharia nada: token de outra conta do
-- Asaas é recusado na cobrança, e token inventado também. O que ele **não**
-- consegue é ler o de outra pessoa, que é o que importa.
-- ============================================================================

create table cartao_salvo (
  id uuid primary key default gen_random_uuid(),
  perfil_artista_id uuid not null references perfil_artista (id) on delete cascade,

  -- A referência opaca do Asaas. `unique` por artista: a mesma cobrança
  -- reaproveitada não vira duas linhas.
  token text not null,

  -- Só para a tela. Quatro dígitos e a bandeira não identificam um cartão.
  ultimos_digitos text not null,
  bandeira text,

  criado_em timestamptz not null default now(),

  constraint cartao_salvo_token_por_artista unique (perfil_artista_id, token),
  constraint cartao_salvo_ultimos_digitos_com_quatro
    check (ultimos_digitos ~ '^[0-9]{4}$')
);

comment on table cartao_salvo is
  'creditCardToken do Asaas, devolvido DEPOIS da primeira cobranca aprovada. Nao guarda numero, CVV nem validade — ver o cabecalho da 0007e e open-questions 28.';
comment on column cartao_salvo.token is
  'Referencia opaca do Asaas. Inutil fora da conta deles; nao e dado de cartao no sentido do PCI-DSS.';

-- O mais recente primeiro: a tela usa um só, e é o último que a pessoa usou.
create index cartao_salvo_do_artista_idx
  on cartao_salvo (perfil_artista_id, criado_em desc);

alter table cartao_salvo enable row level security;

create policy "cartao_salvo: dono le"
  on cartao_salvo for select
  to authenticated
  using (perfil_artista_id = meu_perfil_artista_id());

create policy "cartao_salvo: dono guarda o proprio"
  on cartao_salvo for insert
  to authenticated
  with check (perfil_artista_id = meu_perfil_artista_id());

-- Remover é direito de quem salvou, e a tela 7.2 o oferece. Sem `update`: um
-- cartão não se edita — troca-se por outro.
create policy "cartao_salvo: dono remove"
  on cartao_salvo for delete
  to authenticated
  using (perfil_artista_id = meu_perfil_artista_id());
