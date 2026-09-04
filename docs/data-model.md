# Modelo de dados — Dissona

Esquema físico do PostgreSQL (Supabase): enums, tabelas, chaves, RLS, funções e ordem das migrations.

← [PRD](PRD.md) · [Regras de negócio](prd/01-regras-de-negocio.md) · [Arquitetura](architecture.md) · [Backlog](BACKLOG.md)

---

## Convenções

- Nomes em **`snake_case` singular**, em português (`nota_criterio`, `pacote_clave`).
- **PK** `uuid` com `default gen_random_uuid()`, salvo quando indicado.
- **Dinheiro** em `bigint` de **centavos**. **Claves** em `numeric(10,2)`. Nunca `float`.
- Datas em `timestamptz` (UTC). `criado_em` e `atualizado_em` em toda tabela mutável.
- **Toda** tabela tem `enable row level security` e policies explícitas.
- Nenhum número de negócio no schema: pisos, tetos, prazos e thresholds vivem em [`configuracao`](#configuracao).
- Tabelas de R3+ estão listadas em [§13](#13-tabelas-de-r3-em-diante) para contexto, mas **não são criadas antes da sua release**.

---

## 1. Enums

| Enum | Valores |
|---|---|
| `papel` | `artista`, `curador`, `admin` |
| `situacao_conta` | `ativa`, `bloqueada`, `desativada`, `excluida` |
| `classe_curador` | `bronze`, `prata`, `ouro` |
| `situacao_curador` | `rascunho`, `bronze_aprovado`, `prata_em_analise`, `prata_aprovado`, `prata_recusado` |
| `tipo_midia` | `playlist`, `youtube`, `instagram`, `site`, `blog`, `radio`, `podcast`, `outro` |
| `tipo_servico` | `feedback`, `playlist`, `post`, `materia`, `outro` |
| `origem_faixa` | `link`, `arquivo` |
| `situacao_faixa` | `rascunho`, `aguardando_selecao`, `em_curadoria`, `concluida` |
| `situacao_envio` | `recebeu`, `ouviu`, `avaliando`, `pronto`, `devolvido`, `cancelado` |
| `tipo_lancamento_clave` | `compra`, `consumo`, `devolucao`, `estorno`, `ajuste` |
| `situacao_pedido` | `criado`, `processando`, `aprovado`, `recusado`, `expirado`, `estornado` |
| `meio_pagamento` | `pix`, `cartao` |
| `grupo_criterio` | `execucao_tecnica`, `composicao`, `identidade`, `impacto`, `producao` |
| `situacao_avaliacao` | `rascunho`, `concluida` |
| `modalidade_compartilhamento` | `playlist`, `post`, `materia`, `outros`, `nao_compartilhou` |
| `situacao_ganho` | `liberado`, `em_saque`, `pago`, `cancelado` |
| `papel_admin` | `administrador`, `moderador`, `financeiro`, `suporte` |
| `canal_notificacao` | `in_app`, `email` |

---

## 2. Identidade e papéis — migration `0001`

### `perfil`

Extensão de `auth.users`. Uma linha por conta; o e-mail e a senha vivem no Supabase Auth.

| Campo | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `id` | uuid | sim | PK, **FK → `auth.users(id)`** |
| `nome_completo` | text | sim | |
| `nome_exibicao` | text | não | Nome artístico ou público |
| `handle` | citext | não | Identificador público, único |
| `foto_caminho` | text | não | Caminho no bucket `avatares` |
| `cidade` | text | não | |
| `idioma` | text | sim | `pt-BR` (padrão), `es`, `en` |
| `situacao` | `situacao_conta` | sim | padrão `ativa` |
| `aceite_termos_em` | timestamptz | não | Aceite de Termos + LGPD |
| `desativada_em` | timestamptz | não | Início dos 30 dias de expurgo |
| `criado_em` / `atualizado_em` | timestamptz | sim | |

**UK:** `handle` · **Índice:** `situacao`, `desativada_em`

**RLS:** o dono lê e escreve a própria linha; admin lê todas; leitura pública apenas dos campos de vitrine (via view `perfil_publico`, R5).

### `papel_usuario`

| Campo | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `id` | uuid | sim | PK |
| `perfil_id` | uuid | sim | FK → `perfil(id)` |
| `papel` | `papel` | sim | |
| `ativo` | boolean | sim | padrão `true` |
| `ativado_em` | timestamptz | sim | |

**UK:** `(perfil_id, papel)` — papéis são acumuláveis e reversíveis, mas não duplicáveis.

**Helpers de RLS criados aqui:** `tem_papel(p papel) returns boolean` e `e_admin() returns boolean`, ambos `security definer` e `stable`.

---

## 3. Perfis de artista e curador — migration `0002`

### `perfil_artista`

| Campo | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `id` | uuid | sim | PK |
| `perfil_id` | uuid | sim | FK → `perfil(id)`, **UK** |
| `bio` | text | não | ≤280 caracteres (checado na aplicação e por `check`) |
| `generos` | text[] | não | **até 3** (`check array_length <= 3`) |
| `link_instagram` / `link_spotify` / `link_youtube` / `link_site` | text | não | Validados antes de salvar |
| `cobranca_nome` / `cobranca_documento` | text | não | Dados de cobrança (nota fiscal) |
| `criado_em` / `atualizado_em` | timestamptz | sim | |

> A **nota média do artista** não é coluna: é derivada da view `nota_artista` (média das NF das faixas concluídas).

### `perfil_curador`

| Campo | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `id` | uuid | sim | PK |
| `perfil_id` | uuid | sim | FK → `perfil(id)`, **UK** |
| `bio` | text | não | |
| `generos` | text[] | não | Gêneros que cura |
| `classe` | `classe_curador` | sim | padrão `bronze` |
| `situacao` | `situacao_curador` | sim | padrão `rascunho` |
| `atuacao` | text[] | não | jornalista, radialista, produtor, playlister, A&R, professor, músico |
| `tempo_atuacao` | text | não | `<1`, `1-3`, `3-5`, `5-10`, `+10` |
| `especialidade` | text | não | |
| `formacao` | text | não | |
| `premios` | text | não | |
| `participacao_disco` | boolean | não | |
| `link_participacao_disco` | text | não | |
| `passo_cadastro` | smallint | sim | 1–8, retomada do wizard |
| `cadastro_concluido_em` | timestamptz | não | Guarda a rota `(app)/curador` |
| `classificado_em` | timestamptz | não | |
| `chave_pix` / `chave_pix_tipo` / `chave_pix_situacao` | text | não | Dados de recebimento (17.2) |
| `asaas_carteira_id` | text | não | Subconta do curador no gateway |
| `criado_em` / `atualizado_em` | timestamptz | sim | |

**Índice:** `classe`, `situacao`

> Ranking, calibração, % no prazo e % de compartilhamento **não são colunas aqui** — vivem em `metrica_curador` (R3), recalculada por job. A classe é o único atributo persistido, porque define remuneração já na R2.

### `credencial_curador`

Cada credencial declarada em 12.3. É a contagem destas linhas que classifica Bronze × candidato a Prata.

| Campo | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `id` | uuid | sim | PK |
| `perfil_curador_id` | uuid | sim | FK |
| `tipo` | text | sim | `veiculo`, `formacao`, `premio`, `participacao_disco` |
| `descricao` | text | sim | |
| `url` | text | não | Link verificável — obrigatório para contar como credencial |
| `verificavel` | boolean | sim | `url is not null` |
| `criado_em` | timestamptz | sim | |

### `midia_curador`

Modalidades de compartilhamento (12.1 / 12.6).

| Campo | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `id` | uuid | sim | PK |
| `perfil_curador_id` | uuid | sim | FK |
| `tipo` | `tipo_midia` | sim | |
| `nome` | text | sim | |
| `url` | text | sim | Validado antes de salvar |
| `salvamentos` | integer | não | Só para playlist Spotify — depende da integração (R3) |
| `ativo` | boolean | sim | padrão `true` |
| `criado_em` / `atualizado_em` | timestamptz | sim | |

**Regra:** alterar mídia **não** altera a classe.

### `servico_curador`

| Campo | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `id` | uuid | sim | PK |
| `perfil_curador_id` | uuid | sim | FK |
| `tipo` | `tipo_servico` | sim | |
| `descricao` | text | não | |
| `preco_claves` | numeric(10,2) | sim | `check > 0` |
| `ativo` | boolean | sim | padrão `true` |
| `criado_em` / `atualizado_em` | timestamptz | sim | |

**UK:** `(perfil_curador_id, tipo)` · **Regra:** `feedback` é obrigatório e sempre existe.

---

## 4. Admin e auditoria — migration `0003`

### `membro_admin`

| Campo | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `id` | uuid | sim | PK |
| `perfil_id` | uuid | sim | FK → `perfil(id)`, **UK** |
| `cargo` | text | não | |
| `papel_admin` | `papel_admin` | sim | |
| `ativo` | boolean | sim | |
| `criado_em` / `atualizado_em` | timestamptz | sim | |

### `convite_admin`

| Campo | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `id` | uuid | sim | PK |
| `email` | citext | sim | |
| `papel_admin` | `papel_admin` | sim | |
| `token_hash` | text | sim | Hash do token do convite |
| `expira_em` | timestamptz | sim | |
| `aceito_em` | timestamptz | não | |
| `convidado_por` | uuid | sim | FK → `perfil(id)` |
| `criado_em` | timestamptz | sim | |

**UK parcial:** `email` onde `aceito_em is null`

### `permissao_admin`

| Campo | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `id` | uuid | sim | PK |
| `papel_admin` | `papel_admin` | sim | |
| `modulo` | text | sim | Chave do módulo (`gestao`, `financeiro`, `moderacao`, `pacotes`, `equipe`…) |
| `pode_ler` / `pode_escrever` | boolean | sim | |

**UK:** `(papel_admin, modulo)`

⚠️ O **conteúdo** desta tabela depende da matriz de permissões, ainda pendente. A estrutura existe desde a R1; o seed é provisório (Administrador = acesso total).

### `log_auditoria`

| Campo | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `id` | bigint | sim | PK, identity |
| `tabela` | text | sim | |
| `registro_id` | uuid | não | |
| `acao` | text | sim | `insert`, `update`, `delete` ou ação de negócio |
| `ator_id` | uuid | não | FK → `perfil(id)`; nulo quando é o sistema |
| `motivo` | text | não | Obrigatório em bloqueio, exclusão e decisão de classe |
| `antes` / `depois` | jsonb | não | |
| `criado_em` | timestamptz | sim | |

**Trigger genérico:** `registrar_auditoria()` aplicado a `perfil`, `papel_usuario`, `perfil_curador`, `membro_admin`, `permissao_admin`, `pacote_clave`, `lancamento_clave`, `ganho_curador`.

---

## 5. Configuração — migration `0004`

### `configuracao`

Chave-valor tipada. **Nenhum número de negócio vive no código.**

| Campo | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `chave` | text | sim | PK |
| `valor` | jsonb | sim | |
| `descricao` | text | sim | |
| `atualizado_em` | timestamptz | sim | |
| `atualizado_por` | uuid | não | FK → `perfil(id)` |

**Seed:**

| Chave | Valor | Origem |
|---|---|---|
| `clave_valor_centavos` | `1000` | 1 Clave = R$ 10 |
| `margem_plataforma_percentual` | `50` | retenção da plataforma |
| `prazo_avaliacao_horas` | `72` | repasse cheio |
| `prazo_devolucao_dias` | `7` | devolução automática |
| `escuta_minima_percentual` | ⚠️ **pendente** (60 ou 100) | bloqueio da R2 |
| `feedback_min_caracteres` | `150` | acréscimo |
| `justificativa_min_caracteres` | `250` | acréscimo de +3% |
| `acrescimo_justificativa_percentual` | `3` | |
| `criterios_obrigatorios` | ⚠️ **pendente** — 5 dos 11, quais? | |
| `remuneracao.bronze` | `{"atraso":30,"prazo":38,"teto":50}` | |
| `remuneracao.prata` | `{"atraso":40,"prazo":43,"teto":55}` | |
| `remuneracao.ouro` | `{"atraso":45,"prazo":50,"teto":62}` | |
| `teto_atraso_percentual` | `50` | acumulado máximo após 72h |
| `classe.prata_min_credenciais` | `2` | |
| `classe.ouro_min_curadorias` | `60` | |
| `classe.ouro_min_ciclos` | `2` | |
| `classe.ouro_min_score` | `0.85` | |
| `classe.rebaixamento_score` | `0.75` | |
| `ciclo_meses` | `3` | |
| `ranking.pesos` | `{"notas":0.25,"prazo":0.33,"calibracao":0.27,"compartilhamento":0.15}` | ⚠️ tabela × diagrama divergem |
| `upload.tamanho_max_mb` | `50` | |
| `upload.formatos` | `["wav","mp3"]` | |
| `lgpd.dias_expurgo` | `30` | |

**RLS:** leitura para qualquer sessão autenticada; escrita apenas para `papel_admin = administrador`.

---

## 6. Notificações — migration `0005`

> A tabela existe desde a R1 e as centrais de leitura chegam na R5. O seed de `evento_notificacao` **nasce completo**, com os eventos de todas as releases. Ver [matriz de notificações](prd/06-matriz-notificacoes.md).

### `evento_notificacao`

Catálogo estático dos eventos.

| Campo | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `chave` | text | sim | PK — ex.: `feedback_concluido`, `claves_devolvidas` |
| `titulo` | text | sim | |
| `destinatario` | `papel` | sim | |
| `canais_padrao` | `canal_notificacao[]` | sim | |
| `critico` | boolean | sim | Quando `true`, **não é desativável** |
| `rota_destino` | text | sim | Para onde a notificação leva |
| `modulo_origem` | text | sim | |

### `notificacao`

| Campo | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `id` | uuid | sim | PK |
| `perfil_id` | uuid | sim | FK → `perfil(id)` |
| `evento` | text | sim | FK → `evento_notificacao(chave)` |
| `titulo` / `corpo` | text | sim | |
| `contexto` | jsonb | não | Faixa, curador, valor — dados do detalhe (10.1 / 18.1) |
| `rota` | text | não | Sobrescreve `rota_destino` quando precisa de id |
| `lida_em` | timestamptz | não | |
| `enviada_email_em` | timestamptz | não | |
| `criado_em` | timestamptz | sim | |

**Índice:** `(perfil_id, criado_em desc)`, parcial em `lida_em is null`

### `preferencia_notificacao`

| Campo | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `id` | uuid | sim | PK |
| `perfil_id` | uuid | sim | FK |
| `evento` | text | sim | FK → `evento_notificacao(chave)` |
| `in_app` / `email` | boolean | sim | |

**UK:** `(perfil_id, evento)` · **Regra:** evento `critico` ignora a preferência.

### Função `registrar_notificacao`

```
registrar_notificacao(
  p_perfil_id uuid,
  p_evento text,
  p_contexto jsonb default '{}',
  p_rota text default null
) returns uuid
```

Resolve o catálogo, aplica as preferências (respeitando `critico`), grava em `notificacao` e enfileira o e-mail quando o canal está ativo. **Todo módulo que emite evento chama esta função** — nenhum `insert` direto.

---

## 7. Faixas e envios — migration `0006`

### `faixa`

| Campo | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `id` | uuid | sim | PK |
| `perfil_artista_id` | uuid | sim | FK |
| `titulo` | text | sim | |
| `capa_caminho` | text | não | Bucket `capas` |
| `estilo` | text | não | Estilo predominante |
| `genero` | text | não | Gênero declarado no passo 2 |
| `contexto_curador` | text | não | *"O que o curador precisa saber?"* — obrigatório no wizard |
| `lancada` | boolean | não | |
| `data_lancamento` | date | não | |
| `origem` | `origem_faixa` | sim | `link` ou `arquivo` |
| `url_spotify` / `url_youtube` | text | não | |
| `arquivo_caminho` | text | não | Bucket `faixas` |
| `duracao_segundos` | integer | não | |
| `metadados_detectados` | jsonb | não | Retorno bruto da autodetecção |
| `situacao` | `situacao_faixa` | sim | padrão `rascunho` |
| `criado_em` / `atualizado_em` | timestamptz | sim | |

**Check:** `origem = 'arquivo'` exige `arquivo_caminho`; `origem = 'link'` exige ao menos uma URL.
**Índice:** `(perfil_artista_id, criado_em desc)`, `situacao`

⚠️ **Pendência:** armazenar o arquivo sempre, ou só quando a faixa não está no streaming? Define se `arquivo_caminho` pode conviver com `url_spotify`.

### `envio`

Uma linha por **faixa × curador**. É o item da fila (13) e a unidade de prazo, avaliação e remuneração.

| Campo | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `id` | uuid | sim | PK |
| `faixa_id` | uuid | sim | FK → `faixa(id)` |
| `perfil_curador_id` | uuid | sim | FK |
| `situacao` | `situacao_envio` | sim | padrão `recebeu` |
| `total_claves` | numeric(10,2) | sim | Soma dos `servico_envio` |
| `prazo_em` | timestamptz | sim | `criado_em + prazo_avaliacao_horas` |
| `devolucao_em` | timestamptz | sim | `criado_em + prazo_devolucao_dias` |
| `ouviu_em` / `iniciou_em` / `concluido_em` / `devolvido_em` | timestamptz | não | Estados `Recebeu → Ouviu → Avaliando → Pronto` |
| `criado_em` / `atualizado_em` | timestamptz | sim | |

**UK:** `(faixa_id, perfil_curador_id)` — não permite o mesmo curador duas vezes para a mesma música.
**Índice:** `(perfil_curador_id, situacao, prazo_em)` — ordenação padrão da fila por urgência.

### `servico_envio`

| Campo | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `id` | uuid | sim | PK |
| `envio_id` | uuid | sim | FK |
| `servico_curador_id` | uuid | sim | FK |
| `tipo` | `tipo_servico` | sim | Congelado no momento da contratação |
| `preco_claves` | numeric(10,2) | sim | **Preço congelado** — mudança de preço não afeta contratação feita |

**Regra:** todo `envio` tem obrigatoriamente um `servico_envio` do tipo `feedback`.

---

## 8. Claves — migration `0007`

### `pacote_clave`

| Campo | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `id` | uuid | sim | PK |
| `nome` | text | sim | |
| `quantidade_claves` | numeric(10,2) | sim | `check > 0` |
| `valor_centavos` | bigint | sim | `check > 0` |
| `desconto_percentual` | numeric(5,2) | sim | `check between 0 and 100` |
| `ativo` | boolean | sim | Só pacote ativo aparece na Carteira |
| `criado_em` / `atualizado_em` | timestamptz | sim | |

**Derivado (não persistido):** preço por Clave = `valor_centavos / quantidade_claves`.
**Auditoria:** toda criação, alteração, ativação e exclusão grava em `log_auditoria`.

### `pedido_clave`

| Campo | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `id` | uuid | sim | PK |
| `perfil_artista_id` | uuid | sim | FK |
| `pacote_clave_id` | uuid | não | FK; nulo se o pacote foi excluído depois |
| `quantidade_claves` | numeric(10,2) | sim | Congelada |
| `valor_bruto_centavos` | bigint | sim | |
| `desconto_centavos` | bigint | sim | |
| `valor_total_centavos` | bigint | sim | |
| `meio` | `meio_pagamento` | sim | |
| `situacao` | `situacao_pedido` | sim | padrão `criado` |
| `provedor` | text | sim | `asaas` |
| `provedor_cobranca_id` | text | não | Id da cobrança no gateway |
| `pix_payload` / `pix_qr` | text | não | Copia e cola e QR |
| `pago_em` | timestamptz | não | |
| `criado_em` / `atualizado_em` | timestamptz | sim | |

**UK:** `provedor_cobranca_id` · **Índice:** `(perfil_artista_id, criado_em desc)`

### `evento_provedor`

Idempotência de webhook.

| Campo | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `id_evento_provedor` | text | sim | **PK** — id do evento no gateway |
| `provedor` | text | sim | |
| `tipo` | text | sim | |
| `carga` | jsonb | sim | |
| `processado_em` | timestamptz | não | |
| `recebido_em` | timestamptz | sim | |

**Regra:** o webhook faz `insert ... on conflict do nothing`; se não inseriu, o evento já foi processado e a requisição retorna 200 sem efeito.

### `lancamento_clave`

**Ledger append-only.** Nunca sofre `update` nem `delete`.

| Campo | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `id` | bigint | sim | PK, identity |
| `perfil_artista_id` | uuid | sim | FK |
| `tipo` | `tipo_lancamento_clave` | sim | |
| `quantidade` | numeric(10,2) | sim | **Com sinal**: positivo credita, negativo debita |
| `pedido_clave_id` | uuid | não | FK — quando `tipo = compra` |
| `envio_id` | uuid | não | FK — quando `consumo`, `devolucao` ou `estorno` |
| `descricao` | text | sim | Coluna "Origem" do extrato (5.3) |
| `criado_em` | timestamptz | sim | |

**Índice:** `(perfil_artista_id, criado_em desc)`, `(tipo)`

### View `saldo_carteira`

| Campo | Cálculo |
|---|---|
| `perfil_artista_id` | |
| `disponivel` | `sum(quantidade)` de todos os lançamentos |
| `comprometido` | soma de `envio.total_claves` com `situacao in ('recebeu','ouviu','avaliando')` |
| `devolvido` | `sum(quantidade)` onde `tipo = 'devolucao'` |

O consumo é debitado **na confirmação da seleção** — por isso `disponivel` já exclui o comprometido, e "Comprometidas em análise" é um recorte de exibição, não uma subtração adicional.

---

## 9. Avaliação — migration `0008`

### `criterio`

Catálogo estático dos itens de nota. Seed com os grupos do método.

| Campo | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `chave` | text | sim | PK — `afinacao`, `ritmo`, `melodia`… |
| `grupo` | `grupo_criterio` | sim | |
| `rotulo` | text | sim | |
| `obrigatorio` | boolean | sim | ⚠️ **quais 5 dos 11 são obrigatórios está pendente** |
| `ordem` | smallint | sim | |
| `ativo` | boolean | sim | |

**Seed:**

| Grupo | Itens |
|---|---|
| `execucao_tecnica` | afinação, ritmo |
| `composicao` | melodia, letra |
| `identidade` | personalidade, expressividade, originalidade |
| `impacto` | conexão, memorabilidade |
| `producao` | ⚠️ **item não nomeado no discovery** |

> São **10 itens nomeados** para um total declarado de **11**. O item faltante pertence ao grupo Produção e é bloqueio da R2.

### `avaliacao`

| Campo | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `id` | uuid | sim | PK |
| `envio_id` | uuid | sim | FK, **UK** — uma avaliação por envio |
| `perfil_curador_id` | uuid | sim | FK (denormalizado para RLS e métricas) |
| `nota_subjetiva` | numeric(2,1) | não | 0,0–5,0 |
| `feedback` | text | não | Obrigatório para concluir |
| `escuta_percentual` | numeric(5,2) | sim | Medido pelo player |
| `situacao` | `situacao_avaliacao` | sim | padrão `rascunho` — permite "Salvar e sair" |
| `passo_atual` | smallint | sim | 1–5, retomada do wizard |
| `no_prazo` | boolean | não | Congelado na conclusão |
| `classe_no_momento` | `classe_curador` | não | Congelada na conclusão |
| `concluida_em` | timestamptz | não | |
| `criado_em` / `atualizado_em` | timestamptz | sim | |

**Derivadas (view `nota_avaliacao`):** `NO` = média das `nota_criterio`; `NF = NO + NS`.

### `nota_criterio`

| Campo | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `id` | uuid | sim | PK |
| `avaliacao_id` | uuid | sim | FK |
| `criterio` | text | sim | FK → `criterio(chave)` |
| `nota` | numeric(2,1) | sim | `check between 0 and 5` — uma casa decimal |
| `justificativa` | text | não | ≥250 caracteres rende acréscimo |

**UK:** `(avaliacao_id, criterio)`

### `compartilhamento`

| Campo | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `id` | uuid | sim | PK |
| `avaliacao_id` | uuid | sim | FK |
| `modalidade` | `modalidade_compartilhamento` | sim | Inclui `nao_compartilhou` |
| `midia_curador_id` | uuid | não | FK — quando aponta para uma mídia cadastrada |
| `descricao` | text | não | Campo livre de "Outros" (rádio, podcast…) |
| `url` | text | não | |
| `verificado_em` | timestamptz | não | A equipe confere antes de liberar o acréscimo |
| `criado_em` | timestamptz | sim | |

> `nao_compartilhou` é registrado explicitamente: o crédito é liberado nos dois caminhos, e a diferença precisa ser auditável. ⚠️ Ver a divergência 3 em [pendências](prd/07-pendencias-e-divergencias.md).

---

## 10. Remuneração — migration `0009`

### `ganho_curador`

| Campo | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `id` | uuid | sim | PK |
| `avaliacao_id` | uuid | sim | FK, **UK** |
| `perfil_curador_id` | uuid | sim | FK |
| `base_claves` | numeric(10,2) | sim | Total contratado no envio |
| `classe` | `classe_curador` | sim | Congelada |
| `no_prazo` | boolean | sim | |
| `piso_percentual` | numeric(5,2) | sim | Por classe e prazo |
| `acrescimos` | jsonb | sim | `[{"chave":"onze_criterios","percentual":…}, …]` |
| `percentual_aplicado` | numeric(5,2) | sim | Piso + acréscimos, limitado ao teto |
| `teto_percentual` | numeric(5,2) | sim | |
| `penalidade_prazo` | boolean | sim | Quando `true`, o acumulado é limitado a 50% |
| `valor_centavos` | bigint | sim | Líquido do curador |
| `comissao_centavos` | bigint | sim | **Invariante:** `valor_centavos + comissao_centavos = base em centavos` |
| `situacao` | `situacao_ganho` | sim | padrão `liberado` |
| `criado_em` | timestamptz | sim | |

### Função `calcular_remuneracao`

```
calcular_remuneracao(
  p_classe classe_curador,
  p_no_prazo boolean,
  p_base_claves numeric,
  p_opcionais jsonb   -- {onze_criterios, justificativas_250, feedback_150, compartilhou}
) returns table (
  piso_percentual numeric,
  acrescimos jsonb,
  percentual_aplicado numeric,
  teto_percentual numeric,
  penalidade_prazo boolean,
  valor_centavos bigint,
  comissao_centavos bigint
)
```

Pura e determinística. Lê os percentuais de `configuracao`, aplica os acréscimos até o teto da classe e, quando fora do prazo, limita o acumulado ao `teto_atraso_percentual`. É a função com **cobertura de teste obrigatória**.

### RPC `enviar_avaliacao`

Atômica. Em uma transação:

1. Valida `escuta_percentual ≥ escuta_minima_percentual`.
2. Valida os critérios obrigatórios preenchidos e `feedback` não vazio.
3. Marca `avaliacao.situacao = 'concluida'`, congela `no_prazo` e `classe_no_momento`.
4. Grava o `compartilhamento` (inclusive `nao_compartilhou`).
5. Chama `calcular_remuneracao` e insere `ganho_curador`.
6. Fecha o `envio` (`situacao = 'pronto'`).
7. `registrar_notificacao` — feedback concluído (artista) e crédito liberado (curador).

### RPC `confirmar_selecao_curadores` — migration `0010`

Atômica. Valida saldo, insere `envio` e `servico_envio`, lança o `consumo` no ledger, calcula `prazo_em` e `devolucao_em`, notifica artista e cada curador. Na R2 é acionada por um **placeholder** de seleção; a tela real (módulo 4) chega na R3.

---

## 11. Ordem das migrations

| # | Release | Conteúdo |
|---|---|---|
| `0001` | R1 | Enums base, `perfil`, `papel_usuario`, helpers de RLS, trigger de `atualizado_em` |
| `0002` | R1 | `perfil_artista`, `perfil_curador`, `credencial_curador`, `midia_curador`, `servico_curador` |
| `0003` | R1 | `membro_admin`, `convite_admin`, `permissao_admin`, `log_auditoria`, trigger `registrar_auditoria` |
| `0004` | R1 | `configuracao` + seed dos thresholds |
| `0005` | R1 | `notificacao`, `evento_notificacao` (seed completo), `preferencia_notificacao`, função `registrar_notificacao` |
| `0006` | R2 | `faixa`, `envio`, `servico_envio` |
| `0007` | R2 | `pacote_clave`, `pedido_clave`, `evento_provedor`, `lancamento_clave`, view `saldo_carteira` |
| `0008` | R2 | `criterio` (seed), `avaliacao`, `nota_criterio`, `compartilhamento`, view `nota_avaliacao` |
| `0009` | R2 | `ganho_curador`, `calcular_remuneracao`, RPC `enviar_avaliacao` |
| `0010` | R2 | RPC `confirmar_selecao_curadores`, `devolver_claves_sem_resposta`, índices da fila |
| `0011+` | R3+ | Ver §13 |

---

## 12. Política de RLS por tabela

| Tabela | Artista | Curador | Admin |
|---|---|---|---|
| `perfil` | própria linha | própria linha | leitura total |
| `papel_usuario` | próprios papéis | próprios papéis | total |
| `perfil_artista` | própria linha | — | leitura |
| `perfil_curador` | leitura pública dos aprovados | própria linha | total |
| `credencial_curador` | — | própria | leitura |
| `midia_curador` / `servico_curador` | leitura dos ativos | próprias | leitura |
| `configuracao` | leitura | leitura | escrita (`administrador`) |
| `notificacao` | próprias | próprias | próprias |
| `faixa` | próprias | leitura via `envio` ativo | leitura |
| `envio` | via `faixa` própria | próprios | leitura |
| `servico_envio` | via `envio` | via `envio` | leitura |
| `pacote_clave` | leitura dos ativos | — | escrita |
| `pedido_clave` | próprios | — | leitura |
| `lancamento_clave` | próprios (**somente leitura**) | — | leitura |
| `avaliacao` | leitura das concluídas das próprias faixas | próprias | leitura |
| `nota_criterio` / `compartilhamento` | via `avaliacao` | via `avaliacao` | leitura |
| `ganho_curador` | — | próprios (**somente leitura**) | total |
| `log_auditoria` | — | — | leitura |

**Escritas em `lancamento_clave` e `ganho_curador` acontecem só por RPC `security definer`.** Nenhum papel tem `insert` direto.

---

## 13. Tabelas de R3 em diante

Listadas para dar contexto às decisões de R1 e R2. **Não são criadas antes da sua release.**

| Release | Tabelas |
|---|---|
| **R3** | `metrica_curador`, `ciclo_curador`, `dossie_ouro`, `decisao_classe`, `denuncia`, `penalidade`, `bloqueio` |
| **R4** | `relatorio_ia`, `avaliacao_curador` (a nota sigilosa que o artista dá), `material_materia`, `saque` |
| **R5** | `estorno`, `fechamento_caixa`, `destaque_home`, `banner_midia` |

Duas dessas dependências já moldam o modelo da R2:

- `lancamento_clave` precisa acomodar `estorno` (R5) — por isso o tipo já existe no enum.
- `compartilhamento` alimenta a Homepage (R5) — por isso guarda `url` e `verificado_em` desde já.
