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
| `onboarding_visto_em` | timestamptz | não | RF-007 — migration `0001c` |
| `ultimo_ambiente` | `papel` | não | RF-008 — migration `0001c` |
| `senha_alterada_em` | timestamptz | não | Exibida em 27.1 e 7.4 — migration `0001c` |
| `criado_em` / `atualizado_em` | timestamptz | sim | |

**UK:** `handle` · **Índice:** `situacao`, `desativada_em`

**RLS:** o dono lê e escreve a própria linha; admin lê todas; leitura pública apenas dos campos de vitrine (via view `perfil_publico`, R5).

> ### ⚠️ `situacao` é do admin, e a policy não bastava
>
> A policy de update libera a **linha** do dono, e RLS não filtra coluna — então
> até a `0001c` uma conta `bloqueada` se reativava sozinha, e o bloqueio de
> 20.2/23.2 valia nada. O trigger `proibir_autoalteracao_de_situacao` (`0001c`)
> restringe o dono ao par `ativa ↔ desativada` (RF-024) e normaliza
> `desativada_em`, que é o que o índice parcial do job de expurgo consulta.
>
> Contexto sem sessão (`auth.uid() is null`) passa: é como o `pg_cron` roda
> `expurgar_contas_excluidas`, que leva `desativada` a `excluida`. Barrá-lo
> faria a guarda derrubar o cumprimento da LGPD em silêncio.
>
> As três colunas novas de `0001c` existem porque três requisitos da R1 não
> tinham onde guardar estado: o onboarding reabriria a cada login (RF-007), o
> roteamento pós-login decidia por prioridade fixa em vez do último ambiente
> (RF-008), e a tela 27.1 exibe a data da última troca de senha, que o Supabase
> Auth não expõe.

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
| `tipo` | text | sim | `anos`, `playlist`, `canal`, `imprensa`, `disco`, `formacao` — migration `0002c` |
| `descricao` | text | sim | |
| `url` | text | não | Link verificável |
| `anexo_caminho` | text | não | Caminho no bucket `materiais` — migration `0002c` |
| `verificavel` | boolean | sim | Gerada: `url is not null or anexo_caminho is not null` |
| `criado_em` | timestamptz | sim | |

> **Os tipos são os seis do protótipo, e não os quatro da primeira versão.**
> Portar o passo 6 do wizard mostrou que a `0002` aceitava
> `veiculo | formacao | premio | participacao_disco`, e que três das seis
> caixas da tela não tinham para onde ir. `veiculo` virou `imprensa` e
> `participacao_disco` virou `disco` — o mesmo item com o nome que a tela usa.
> `premio` **saiu**: o protótipo não tem essa caixa, e "Prêmios" já é
> `perfil_curador.premios`, texto livre. Ele nunca foi uma credencial contável.
>
> `anexo_caminho` existe porque `formacao` se comprova por upload ("Anexar
> comprovação"), não por link. Com `verificavel` derivada só de `url`, uma
> formação anexada contava como não comprovada e o curador ficava Bronze com a
> comprovação na mão.
>
> A leitura do anexo pelo admin (amostragem antifraude de 20.3) sai por URL
> assinada gerada pela service role: a policy de `materiais` é do dono.

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

### RPC `ler_contexto_sessao` — migrations `0002`, `0002b` e `0002d`

`returns table (papeis papel[], cadastro_curador_concluido boolean, situacao situacao_conta, situacao_curador situacao_curador, onboarding_visto boolean, ultimo_ambiente papel, aceite_termos boolean)`

Consumida pelo `middleware.ts` **a cada navegação**. Seis informações numa
consulta porque o middleware roda em `gru1` e o banco em `us-west-2`: cada ida
custa ~120 ms ([architecture §9](architecture.md)), e seis consultas seriam
~720 ms por página.

Devolve **exatamente uma linha** mesmo sem `perfil` — o `left join` sobre
`(values (auth.uid()))` existe para isso, e não é detalhe: o chamador usa
`.single()`, e zero linhas ali é um 500 em toda navegação.

`aceite_termos` (`0002d`) fecha um caso que só o **login social** cria: com
provider nativo a conta nasce no callback do OAuth e ninguém aceitou nada. Sem o
campo aqui, quem fechasse a aba na tela de confirmação voltaria a entrar com
sessão válida e nunca mais a veria — conta ativa sem o aceite que a LGPD exige
(RF-010). Com ele, a guarda de rota trata o aceite como trata o papel: enquanto
falta, todo caminho leva de volta à tela que o coleta.

### RPC `concluir_cadastro_curador` — migration `0002c`

`returns table (classe classe_curador, situacao situacao_curador, credenciais_verificaveis integer, minimo_para_prata integer)`

Fim do wizard do módulo 12 (telas 12.4 e 12.5), numa transação: conta as
credenciais `verificavel`, compara com `configuracao.classe.prata_min_credenciais`,
grava `classe`/`situacao`/`classificado_em`/`cadastro_concluido_em` e chama
`registrar_notificacao`. Exige o serviço `feedback` ativo (`DS012`) e recusa a
segunda chamada (`DS015`).

**É o único caminho.** `proibir_autopromocao_de_classe` recusa qualquer escrita
do próprio curador em `classe`, `situacao` ou `classificado_em`, e
`security definer` não contorna — ele troca o dono da execução, não a sessão,
então `auth.uid()` continua sendo o curador e `e_admin()` continua falso. A RPC
se identifica por `current_setting('dissona.classificacao')`, no mesmo padrão de
`dissona.motivo`, e o trigger só cede para a transição exata da 12.4:
`rascunho` → `bronze_aprovado` ou `prata_em_analise`, com `classe = 'bronze'`.

**Candidato a Prata é Bronze na coluna `classe`.** A promoção é o ato do admin
em 20.3, e `classe` é o que `calcular_remuneracao` lê. O que muda no candidato é
`situacao`, e `prata_em_analise` o mantém fora da vitrine — a policy "aprovados
são públicos" só reconhece `bronze_aprovado` e `prata_aprovado`.

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
| `criado_em` / `atualizado_em` | timestamptz | sim | Faltavam nesta tabela, contra a convenção do §Convenções — ela é mutável pela tela 27.4 e é alvo do trigger de auditoria |

**UK:** `(papel_admin, modulo)` · **Check:** escrever exige poder ler

O **conteúdo** vem do protótipo do Admin da R2, que define `perms` para Moderador, Financeiro e Suporte, mais a regra de tela "só o Administrador gere equipe e papéis". O protótipo tem **um** booleano por módulo; a tradução para `pode_ler`/`pode_escrever` foi por menor privilégio, e os módulos `pacotes` e `configuracao` foram derivados. Ver o bloco de seed da `0003`.

### `log_auditoria`

| Campo | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `id` | bigint | sim | PK, identity |
| `tabela` | text | sim | |
| `registro_id` | **text** | não | `text`, e não `uuid`: `lancamento_clave.id` é `bigint` e precisa caber aqui, senão o único ledger financeiro fica sem chave no rastro |
| `acao` | text | sim | `insert`, `update`, `delete` ou ação de negócio |
| `ator_id` | uuid | não | FK → `perfil(id)`; nulo quando é o sistema |
| `motivo` | text | não | Obrigatório em bloqueio, exclusão e decisão de classe |
| `antes` / `depois` | jsonb | não | |
| `criado_em` | timestamptz | sim | |

**Trigger genérico:** `registrar_auditoria()` aplicado a `perfil`, `papel_usuario`, `perfil_curador`, `membro_admin`, `permissao_admin`, `configuracao`, `pacote_clave`, `lancamento_clave`, `ganho_curador`.

A **função** nasce na `0003`, mas os `create trigger` se dividem: cinco na `0003`, `configuracao` na `0004`, `pacote_clave` e `lancamento_clave` na `0007`, e `ganho_curador` na `0009` — cada um na migration que cria a tabela.

`configuracao` é a nona, e não estava nesta lista: mudar um piso de remuneração é a alteração mais sensível do sistema, e ficaria fora do rastro.

`motivo` não pode ser um `check`, porque a mesma tabela recebe escritas que o exigem e escritas que não. O trigger o lê de `current_setting('dissona.motivo')`.

**Corrigido na `0003d`:** o contrato original dizia que a Server Action faria `set local dissona.motivo = '...'` antes da escrita, e isso **não é possível pelo cliente**. `set local` vale dentro de uma transação, e pelo PostgREST cada `update` é a sua própria — não há onde marcá-la. Então a regra passa a ser: **toda escrita que precisa de motivo é uma função**, que é uma transação, com o `set_config(..., is_local => true)` dentro. As três mutações da equipe (27.2 e 27.4) são as primeiras a segui-la; `concluir_cadastro_curador` (`0002c`) já seguia, com a mesma mecânica aplicada a `dissona.classificacao`.

### RPCs do convite — migrations `0003`, `0003b` e `0003c`

`criar_convite_admin(p_email text, p_papel_admin papel_admin, p_validade_horas integer default 168) returns table (convite_id uuid, token text, expira_em timestamptz)`

`aceitar_convite_admin(p_token text) returns uuid`

As duas metades de 27.3. A emissão gera 32 bytes aleatórios em hex, guarda só o
`sha256` e devolve o token em claro **uma única vez** — a Server Action o põe no
e-mail e não persiste. Reenviar (27.2) apaga o pendente e rotaciona o token, o
que é o comportamento certo: o link antigo pode ter ido para a caixa errada.

A emissão saiu do TypeScript para o hash viver num só lugar. Com o cálculo do
lado do código e a conferência do lado do banco, uma divergência entre os dois
não falha em teste — falha em produção, como "convite inválido" para todo mundo.

Validade de 7 dias como constante da função, e não em `configuracao`: é a mesma
categoria dos outros dois prazos de credencial do produto (token de senha de 60
minutos, link de verificação de 24 horas), que vivem na configuração do Auth e
não na tabela de thresholds de negócio.

`aceitar_convite_admin` é o **único caminho** para o papel `admin` — a policy de
`papel_usuario` recusa `papel = 'admin'` por escalonamento de privilégio.

> ### ⚠️ `citext` dentro de função com `search_path` vazio
>
> As duas funções comparam e-mail com `operator(extensions.=)`, e não com `=`.
> Com `set search_path = ''` o operador de `citext` fica invisível e o Postgres
> **não falha**: promove os dois lados a `text` e compara com sensibilidade à
> caixa. O índice único não disfarça, porque ele guarda a classe de operadores
> de `citext` desde a criação — e o par "consulta case-sensitive contra índice
> case-insensitive" produz um `delete` que não acha a linha seguido de um
> `insert` que colide com ela.
>
> Corrigido na `0003c`, em `criar_convite_admin` e em `aceitar_convite_admin`,
> onde era um bug latente desde a `0003`. **Vale para toda função nova.**

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
| `escuta_minima_percentual` | `60` | protótipo do curador: "a avaliação só é aceita a partir de 60%" |
| `escuta_exigida_quando_link` | `true` | ⚠️ default provisional — [#7](open-questions.md) |
| `feedback_min_caracteres` | `150` | acréscimo |
| `justificativa_min_caracteres` | `250` | acréscimo |
| `criterios_obrigatorios` | `["afinacao","ritmo","melodia","personalidade","conexao"]` | flags do protótipo. **Não** é um por grupo |
| `remuneracao.base` | `"bruto"` | protótipo: `pct` incide sobre o valor pago pelo artista |
| `remuneracao.bronze` | `{"piso":30,"teto_base":38,"teto_max":50}` | **outra semântica** — ver o aviso abaixo |
| `remuneracao.prata` | `{"piso":40,"teto_base":43,"teto_max":55}` | |
| `remuneracao.ouro` | `{"piso":45,"teto_base":50,"teto_max":62}` | |
| `penalidade_atraso_pontos` | `8` | o atraso derruba o **piso**, não capa o acumulado |
| `piso_minimo_atraso_percentual` | `15` | piso absoluto depois da penalidade |
| `acrescimo_onze_criterios_percentual` | `3` | |
| `acrescimo_justificativa_percentual` | `3` | |
| `acrescimo_justificativa_min_itens` | `1` | booleano, não 3% por item |
| `acrescimo_feedback_150_percentual` | `3` | |
| `acrescimo_compartilhamento_percentual` | `8` | o único que passa de `teto_base` |
| `compartilhamento.acrescimo_retido` | `false` | ⚠️ default provisional — [#8](open-questions.md) |
| `classe.prata_min_credenciais` | `2` | |
| `classe.ouro_min_curadorias` | `60` | |
| `classe.ouro_min_ciclos` | `2` | |
| `classe.ouro_min_score` | `0.85` | |
| `classe.rebaixamento_score` | `0.75` | |
| `ciclo_meses` | `3` | |
| `ranking.pesos` | `{"notas":0.25,"prazo":0.33,"calibracao":0.27,"compartilhamento":0.15}` | ⚠️ tabela × diagrama divergem |
| `upload.tamanho_max_mb` | `50` | |
| `upload.formatos` | `["wav","mp3"]` | |
| `upload.armazenar_sempre` | `true` | ⚠️ default provisional — [#7](open-questions.md) |
| `lgpd.dias_expurgo` | `30` | |

> ### ⚠️ `remuneracao.*` mudou de forma, e de significado
>
> A tabela de [regras §3](prd/01-regras-de-negocio.md) lê os três números por
> classe como *(piso em atraso, piso no prazo, teto)*. O **protótipo da R2** —
> que o [AGENTS.md](../AGENTS.md) põe acima do board — os lê como *(piso dentro
> das 72h, teto na avaliação, teto com compartilhamento)*, e as legendas da
> própria tela não deixam margem: *"Piso da classe dentro das 72h"* exibe **30%**
> para Bronze, e *"Teto da classe Bronze: 38% na avaliação e 50% com
> compartilhamento"*.
>
> Consequências, todas já refletidas no banco e cobertas por teste:
>
> - **Um Bronze que entrega no prazo sem nenhum opcional recebe 30%**, não 38%.
>   `RF-066` de [requirements.md](requirements.md) está incorreto.
> - `teto_atraso_percentual` **saiu**. O atraso derruba o piso em 8 pontos, com
>   mínimo de 15; não existe teto de 50% sobre o acumulado.
> - Com os acréscimos deste seed, `teto_max` **nunca é alcançado**: o máximo real
>   é 46 / 51 / 58 contra tetos de 50 / 55 / 62. Sobram exatamente 4 pontos nas
>   três classes — ou falta um acréscimo, ou os tetos são aspiracionais.
>   **Pergunta aberta para o cliente.**
>
> `remuneracao.base` existe para a decisão ser reversível: com `"cota_curador"`
> os percentuais passam a incidir sobre a margem, e `calcular_remuneracao` já
> ramifica nos dois modos.

O total é de **32 chaves**, e o registro Zod em
`src/lib/configuracao/chaves.ts` tem de cobrir exatamente as mesmas — há teste
de deriva que lê este `.sql` e compara.

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
| `destinatario` | `papel[]` | sim | **Array**, e não escalar: cinco eventos da matriz são idênticos para artista e curador (senha, verificação, alteração de credencial, bloqueio). Com escalar, ou se duplicam chaves — e a chave é PK referenciada por duas tabelas — ou a tela de preferências de um dos papéis perde o evento |
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
| `titulo` | text | sim | Vem do catálogo, não do chamador |
| `corpo` | text | **não** | Nulável: o texto do detalhe é composto pela View a partir de `contexto`, que é para isso que `contexto` existe |
| `contexto` | jsonb | sim | Faixa, curador, valor — dados do detalhe (10.1 / 18.1) |
| `rota` | text | não | Sobrescreve `rota_destino` quando precisa de id |
| `canais` | `canal_notificacao[]` | sim | Os canais **efetivos**, já resolvidos contra a preferência. Não está na especificação original — sem ela, um evento só de e-mail com in-app desligado ou não geraria linha (e ninguém enviaria o e-mail) ou apareceria na caixa de entrada contra a vontade do usuário |
| `lida_em` | timestamptz | não | |
| `enviada_email_em` | timestamptz | não | Nulo com `email` em `canais` = fila de envio |
| `criado_em` | timestamptz | sim | |

**Índice:** `(perfil_id, criado_em desc)`, parcial em `lida_em is null`, e parcial em `enviada_email_em is null` para a fila de e-mail

**Trigger:** em `notificacao` só `lida_em` muda. RLS filtra linha, não coluna, e sem o trigger o dono reescreveria o título da própria notificação.

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
| `excluido_em` | timestamptz | não | Exclusão lógica (`0007b`). `check (excluido_em is null or not ativo)` |
| `criado_em` / `atualizado_em` | timestamptz | sim | |

**Derivado (não persistido):** preço por Clave = `valor_centavos / quantidade_claves`.
**Auditoria:** toda criação, alteração, ativação e exclusão grava em `log_auditoria`.

**Desativar ≠ excluir.** A tela 21 tem as duas ações, com consequências
diferentes, e a `0007` as havia colapsado numa só (`ativo = false`, sem policy
de `delete`). O protótipo mostra que não fecha: o modal de exclusão diz *"Se a
ideia for só tirar de circulação, desative"*, frase que não faz sentido se as
duas ações forem a mesma. Daí `excluido_em`, na `0007b`:

| Ação | Efeito | Onde o pacote aparece depois |
|---|---|---|
| **Desativar** | `ativo = false` | Lista do admin, com status *Inativo*. Fora da Carteira. |
| **Excluir** | `ativo = false` **e** `excluido_em = now()` | Em lugar nenhum. A linha permanece, para o log de auditoria e para a FK de `pedido_clave`. |

Duas garantias no schema, em vez de confiança na Server Action:

- O `check` faz excluir implicar inativo, então a policy de leitura
  (`ativo or tem_permissao('pacotes')`) já esconde o excluído do artista sem
  emenda nenhuma.
- O trigger `pacote_clave_exclusao_irreversivel` recusa zerar `excluido_em`
  (`DS014`). Excluir é irreversível pela tela; um `update` que ressuscitasse o
  pacote traria de volta um preço que já saiu de circulação.

Continua **sem policy de `delete`**: `pedido_clave.pacote_clave_id` referencia
esta linha, e apagá-la destruiria a conciliação de uma compra já feita — que é
exatamente o que o modal promete preservar.

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
| `base_centavos` | bigint | sim | **Não estava na especificação.** É o que torna a invariante verificável pelo banco: sem congelar a base em centavos, o `check` do rateio precisaria do valor da Clave, que vive em `configuracao` — e um `check` não pode ler tabela |
| `classe` | `classe_curador` | sim | Congelada |
| `no_prazo` | boolean | sim | |
| `piso_percentual` | numeric(5,2) | sim | Por classe e prazo |
| `acrescimos` | jsonb | sim | `[{"chave":"onze_criterios","percentual":…}, …]` |
| `percentual_aplicado` | numeric(5,2) | sim | Piso + acréscimos, limitado ao teto |
| `teto_percentual` | numeric(5,2) | sim | |
| `penalidade_prazo` | boolean | sim | Entrega fora das 72h. **A descrição mudou:** sob o algoritmo do protótipo isso derruba o piso em 8 pontos (mínimo 15), e não limita o acumulado a 50% |
| `valor_centavos` | bigint | sim | Líquido do curador |
| `comissao_centavos` | bigint | sim | Obtido por **subtração** de `base_centavos`, nunca por um segundo arredondamento |
| `situacao` | `situacao_ganho` | sim | padrão `liberado` |
| `criado_em` | timestamptz | sim | |

**Checks:** `valor_centavos + comissao_centavos = base_centavos` · `percentual_aplicado <= teto_percentual` · `piso_percentual <= percentual_aplicado` · valores não negativos

A invariante do rateio (RNF-010) é **garantida pelo banco**, e não pela função: se `calcular_remuneracao` errar, a gravação é recusada.

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
  base_centavos bigint,
  valor_centavos bigint,
  comissao_centavos bigint
)
```

Pura e determinística: nenhum `now()`, nenhum `auth.uid()` — o prazo e a classe entram **congelados** como parâmetro. `stable`, porque lê `configuracao`, numa única consulta que **falha** quando falta chave em vez de cair num default silencioso.

O algoritmo é o do protótipo da R2:

```
piso     = no_prazo ? faixa.piso : max(piso_minimo_atraso, faixa.piso - penalidade_pontos)
pct_base = min(piso + 3·onze + 3·just250 + 3·fb150, faixa.teto_base)
pct      = min(pct_base + 8·compartilhou, faixa.teto_max)
valor    = round(base_calculo * pct / 100)
comissao = base_centavos - valor
```

Três coisas que valem registro:

1. Os **três acréscimos de conteúdo** são capados em `teto_base`, e saturam-no em todas as classes (30+9 ≥ 38, 40+9 ≥ 43, 45+9 ≥ 50). Só o compartilhamento passa disso, e é por isso que vale 8 pontos, não 3.
2. Os acréscimos entram em **ordem fixa declarada** no `jsonb` — a ordem não muda o total, mas torna o resultado byte a byte comparável em teste.
3. A comissão sai por **subtração**, nunca por um segundo arredondamento: é o que faz o rateio fechar sem centavo perdido nem sobrando.

`security invoker` e `grant` para `authenticated`: a etapa 5 da avaliação **prevê** o valor com esta mesma função. Uma para prever e outra para gravar é a origem clássica de "o valor mostrado não é o valor pago".

É a função com **cobertura de teste obrigatória** — 31 asserções em `supabase/testes/0009_remuneracao.testes.sql`.

### RPC `enviar_avaliacao`

Atômica. Em uma transação:

1. Valida `escuta_percentual ≥ escuta_minima_percentual` (DS001).
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
| `0000b` | infra | Extensões `citext`, `pg_cron` e `pg_net`. Fora da faixa por release, como os buckets: `citext` é pré-requisito de `perfil.handle` |
| `0001` | R1 | Enums base, `perfil`, `papel_usuario`, helpers de RLS, trigger de `atualizado_em`, trigger de criação de perfil em `auth.users` |
| `0001b` | R1 | Revogação de `execute` por papel — `revoke from public` não basta no Supabase |
| `0001c` | R1 | `perfil.onboarding_visto_em`, `ultimo_ambiente` e `senha_alterada_em`; trigger `proibir_autoalteracao_de_situacao` |
| `0001d` | R1 | **`ler_sessoes_da_conta`** e **`encerrar_sessao_da_conta`** — `auth.sessions` está fora do alcance do PostgREST, e o painel de 7.4/17.4 não tem outro caminho |
| `0002` | R1 | `perfil_artista`, `perfil_curador`, `credencial_curador`, `midia_curador`, `servico_curador`, helpers `meu_perfil_artista_id`/`meu_perfil_curador_id`, RPC `ler_contexto_sessao` |
| `0002b` | R1 | `ler_contexto_sessao` passa a devolver `situacao`, `situacao_curador`, `onboarding_visto` e `ultimo_ambiente` |
| `0002c` | R1 | Os seis tipos de credencial do protótipo, `credencial_curador.anexo_caminho`, e a RPC **`concluir_cadastro_curador`** (12.4) |
| `0002d` | R1 | `ler_contexto_sessao` passa a devolver `aceite_termos` — a conta criada por login social nasce sem aceite, e sem isto ela navegaria sem ele |
| `0002e` | R1 | O trigger de criação de perfil sobrevive a conta **sem e-mail** — o `coalesce` ganha `full_name`, `name` e `preferred_username` antes do endereço, e um literal no fim; sem isto o login por SoundCloud derruba o cadastro dentro do trigger |
| `0003` | R1 | `membro_admin`, `convite_admin`, `permissao_admin`, `log_auditoria`, trigger `registrar_auditoria`, **`tem_permissao`** e **`aceitar_convite_admin`** |
| `0003b` | R1 | RPC **`criar_convite_admin`** — a emissão que faltava ao lado do aceite |
| `0003c` | R1 | `citext` comparado com `operator(extensions.=)` em `criar_convite_admin` e `aceitar_convite_admin` |
| `0003d` | R1 | `situacao_membro_admin`, **`ler_equipe_admin`** (une `membro_admin` e convite pendente, com o e-mail de `auth.users`), as três mutações da equipe como funções — é o único jeito de o `motivo` da auditoria existir — e **`atualizar_meu_cargo`** |
| `0003e` | R1 | `NULLIF` sem schema em `atualizar_meu_cargo`: `pg_catalog.nullif` não existe, e a função falhava com `42883` para todo chamador |
| `0004` | R1 | `configuracao` + seed de 32 chaves |
| `0005` | R1 | `evento_notificacao` (seed completo), `notificacao`, `preferencia_notificacao`, função `registrar_notificacao` |
| `0006` | R2 | `faixa`, `envio`, `servico_envio`, índices da fila, policy do bucket `faixas` |
| `0006b` | R2 | Quebra a recursão mútua entre as policies de `faixa` e `envio` (`42P17`) |
| `0006c` | R2 | `proibir_editar_faixa_em_curadoria` passa a `security invoker` |
| `0007` | R2 | `pacote_clave`, `pedido_clave`, `evento_provedor`, `lancamento_clave`, view `saldo_carteira`, RPCs `criar_pedido_clave`, `registrar_evento_provedor` e `confirmar_pedido_clave` |
| `0007b` | R2 | `pacote_clave.excluido_em` — exclusão lógica, distinta de desativar |
| `0007c` | R2 | Troca o `SQLSTATE` da guarda de exclusão: `DS030` já era "configuração ausente" |
| `0008` | R2 | `criterio` (seed), `avaliacao`, `nota_criterio`, `compartilhamento`, views `nota_avaliacao` e **`nota_artista`** |
| `0009` | R2 | `ganho_curador`, `calcular_remuneracao`, RPC `enviar_avaliacao` |
| `0010` | R2 | RPCs `confirmar_selecao_curadores`, `devolver_claves_sem_resposta` e **`avisar_prazo_72h`** |
| `0010b` | R2 | `confirmar_selecao_curadores` apura o subtotal antes de inserir o envio |
| `0011` | R1+R2 | `expurgar_contas_excluidas` e os três `cron.schedule` |
| `0012+` | R3+ | Ver §13 |

> **A faixa mudou.** O documento reservava `0011+` para a R3; os jobs de R1 e R2
> precisavam de um número depois de `0010` (o expurgo depende do grafo de FK
> inteiro), então `0011` são os jobs e a R3 começa em `0012`.
>
> Os sufixos `b` a `e` são migrations corretivas ou de acréscimo, aplicadas depois de a
> original já estar no banco compartilhado — não dava para reescrevê-las. Cada
> uma explica no cabeçalho o que corrigiu.

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
