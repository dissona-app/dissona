# Perguntas em aberto — Dissona

Tudo o que ainda **não foi decidido** e trava ou condiciona a implementação. Cada item traz o que está aberto, o impacto, a pergunta objetiva e de quem é a decisão.

← [PRD](PRD.md) · [Pendências e divergências do discovery](prd/07-pendencias-e-divergencias.md) · [Backlog](BACKLOG.md)

**Nada aqui foi resolvido por suposição.** Onde o protótipo da R2 decidiu, o item aparece em [§4 Resolvidas](#4-resolvidas).

---

## Sumário

| # | Pergunta | Trava | Decisão de |
|---|---|---|---|
| ~~1~~ | ~~Escuta mínima: 60% ou 100%?~~ | — | **resolvida pelo protótipo** → §4 |
| ~~2~~ | ~~Qual é o 11º critério de avaliação?~~ | — | **resolvida pelo protótipo** → §4 |
| ~~3~~ | ~~Quais 5 dos 11 critérios são obrigatórios?~~ | — | **resolvida pelo protótipo** → §4 |
| ~~4~~ | ~~Tabela de pacotes de Claves~~ | — | **resolvida pelo protótipo** → §4 |
| ~~[5](#5-base-de-cálculo-da-remuneração-por-classe)~~ | ~~Base de cálculo e leitura da tabela~~ | — | **resolvida pelo cliente** (2026-09-16): tabela do board |
| ~~[5b](#5b-teto_max-é-inalcançável)~~ | ~~`teto_max` é inalcançável~~ | — | **deixou de existir** com a #5 |
| [6](#6-modelo-de-split-no-asaas) | Modelo de split no Asaas | **R2** | cliente + contador |
| [7](#7-armazenamento-do-arquivo-de-áudio) | Armazenar o mp3 sempre? | **R2** | cliente + dev |
| [8](#8-liberação-do-crédito-versus-compartilhamento) | Crédito retido até verificar o compartilhamento? | **R2** | cliente |
| [9](#9-soundcloud-assinar-o-artist-pro-e-viver-sem-o-e-mail) | SoundCloud: assinar o Artist Pro e viver sem o e-mail? | **R1** | cliente + dev |
| [10](#10-provedor-de-e-mail-transacional) | Provedor de e-mail e domínio de envio | **R1** | cliente + dev |
| ~~11~~ | ~~Matriz de permissões do admin~~ | — | **resolvida pelo protótipo** → §4 |
| [12](#12-ativação-do-2º-papel-exige-aprovação) | Ativar papel de curador exige aprovação? | **R1** | cliente |
| [13](#13-horas-da-release-1) | R1 é 16,75h ou 14,75h? | **R1** | cliente |
| [14](#14-pesos-do-ranking) | Pesos do ranking: tabela ou diagrama? | R3 | cliente |
| [15](#15-critérios-definitivos-de-classe) | Critérios definitivos de classe | R3 | cliente |
| [16](#16-definição-de-ciclo-e-fórmula-do-score) | Definição de "ciclo" e fórmula do score | R3 | cliente |
| [17](#17-penalidades-tipos-e-gravidade) | Penalidades: tipos e gravidade | R3 | cliente |
| [18](#18-bronzeprata-só-por-credenciais) | Bronze→Prata só por credenciais? | R3 | cliente |
| [19](#19-salvamentos-da-playlist-do-curador) | Salvamentos da playlist | R3 | dev + Spotify |
| [20](#20-modelo-de-ia-e-dados-suficientes) | Modelo de IA e "dados suficientes" | R4 | cliente + dev |
| [21](#21-critérios-e-prazos-de-estorno) | Critérios e prazos de estorno | R5 | cliente + jurídico |
| [22](#22-gestão-da-homepage--mídia-não-tem-módulo) | Gestão da Homepage & Mídia não tem módulo | R5 | cliente |
| [23](#23-critérios-de-aceite-da-homepage) | Critérios de aceite da homepage | R5 | cliente |
| [24](#24-breakpoints-e-layout-mobile) | Breakpoints e layout mobile | — | cliente + design |
| [27](#27-lgpd-versus-retenção-fiscal-no-expurgo) | LGPD × retenção fiscal no expurgo | antes do beta | **jurídico** |

---

## 1. Bloqueiam a Release 2

### 5. Base de cálculo da remuneração por classe

> ✅ **Resolvida pelo cliente em 2026-09-16: "38% (a tabela do board)".**
> Os percentuais incidem sobre o **bruto** e os três números por classe são
> *(piso em atraso, piso no prazo, teto)*. Bronze no prazo sem opcionais recebe
> **38%**; fora das 72h, piso 30 e total capado em 50. Aplicada pela migration
> `0009b_remuneracao_da_tabela`, coberta por `0009_remuneracao.testes.sql` e
> pelo cenário C6. O texto abaixo fica como registro da discussão.

**Respondida pelo protótipo — mas a resposta traz uma mudança de semântica que
precisava de confirmação.**

O protótipo do curador calcula:

```js
valorArtista = soma(servicos.preco_claves) * 10   // Claves × R$ 10 = BRUTO
valor        = valorArtista * pct / 100
```

e a legenda da tela diz *"{pct}% de {valor} **pagos pelo artista**"*. Logo: os
percentuais incidem sobre o **bruto**, e os 50% de margem passam a ser
referência, não retenção fixa. Isso responde a pergunta original.

**O que muda, e é maior que a pergunta.** Os mesmos nove números têm outra
leitura. A tabela de [regras §3](prd/01-regras-de-negocio.md) os lê como
*(piso em atraso, piso no prazo, teto)*; o protótipo os lê como *(piso dentro
das 72h, teto na avaliação, teto com compartilhamento)*, com legendas que não
deixam margem:

> *"Piso da classe dentro das 72h"* — exibindo **30%** para Bronze
> *"A faixa passou das 72h, então o piso da classe cai 8 pontos"*
> *"Teto da classe Bronze: 38% na avaliação e 50% com compartilhamento"*

| | Leitura do board | Leitura do protótipo |
|---|---|---|
| Bronze, no prazo, sem opcionais | 38% | **30%** |
| Bronze, atrasado, sem opcionais | 30% | **22%** = max(15, 30−8) |
| Penalidade de atraso | acumulado capado em 50% | **−8 pontos no piso**, mínimo 15 |

**Pergunta objetiva ao cliente:** confirma que um curador Bronze que entrega
dentro das 72h, sem responder os onze critérios nem compartilhar, recebe **30%**
do valor pago pelo artista — e não 38%?

**Estado da implementação.** O banco já segue o protótipo, com o algoritmo
coberto por 31 asserções. `RF-066` foi corrigido, e `teto_atraso_percentual`
saiu de `configuracao`. Se a resposta for "vale a leitura do board", o custo é
um `update` em `configuracao` mais um ajuste em `calcular_remuneracao` — a
chave `remuneracao.base` existe exatamente para isso. **Não bloqueia** as
fatias de aplicação: quem depende disso é a tela 14.4 e o cenário C6.

---

### 5b. `teto_max` é inalcançável

> ✅ **Deixou de existir com a resposta da #5.** Com um teto único, os quatro
> acréscimos (17 pontos) alcançam 50 / 55 / 62 nas três classes.

**Era aberto, e só aparecia fazendo a aritmética.** Com o conjunto de acréscimos do
protótipo — três de 3 pontos capados em `teto_base`, mais 8 pontos de
compartilhamento — o máximo que um curador alcança é:

| Classe | Máximo real | `teto_max` declarado | Folga |
|---|---|---|---|
| Bronze | 46% | 50% | **4** |
| Prata | 51% | 55% | **4** |
| Ouro | 58% | 62% | **4** |

Sobram exatamente **4 pontos nas três classes**, o que é regular demais para ser
acidente.

**Pergunta:** falta um acréscimo de 4 pontos no catálogo (qual?), ou `teto_max`
é um teto aspiracional que o conjunto atual de opcionais não atinge?

**Impacto:** a tela 14.4 exibe o teto da classe. Se o teto nunca é atingível, o
curador vê uma meta que não existe. A suíte de testes fixa a folga em 4 para
que ela não mude sem alguém notar.

### 6. Modelo de split no Asaas

**Aberto.** A Dissona é marketplace e tributa só a comissão, o que exige separar repasse × comissão **na origem**. Não está definido **como**: split nativo na cobrança, subcontas por curador, ou transferência diferida.

**Impacto:** integração de pagamento inteira (R2), payouts (R5), obrigações fiscais.

**Perguntas:** o contador do cliente confirma qual arranjo atende à tributação apenas da comissão? Cada curador terá subconta (com KYC próprio) ou o repasse sai por transferência da conta da plataforma?

---

### 7. Armazenamento do arquivo de áudio

**Aberto.** Armazenar o arquivo **sempre**, ou **só quando a faixa não está no streaming**? (V4 pág. 9–11)

**Impacto:** módulo 3, custo de storage, campo `faixa.arquivo_caminho` e a política do bucket `faixas`.

**Pergunta:** quando o artista envia link de streaming, guardamos também uma cópia do áudio para o player do curador, ou o player toca a partir do streaming?

> Se o player do curador precisa **medir a escuta**, tocar a partir do streaming externo pode inviabilizar a medição — o que empurraria a resposta para "armazenar sempre". Confirmar com dev.

---

### 8. Liberação do crédito versus compartilhamento

**Divergência entre fontes.** O board condiciona a liberação do crédito ao compartilhamento **confirmado e monitorado**; o protótipo libera o crédito nos dois caminhos (compartilhando ou declarando que não vai), e o compartilhamento apenas remunera mais. **O PRD adotou o protótipo.**

**Impacto:** módulos 14.2, 14.4 e 23. A regra do protótipo **enfraquece o antifraude**: o curador pode prometer, receber o acréscimo e não cumprir, com correção apenas por denúncia posterior.

**Pergunta:** o **acréscimo** por compartilhamento deve ficar retido até a verificação da equipe, mesmo que o crédito-base seja liberado na conclusão?

---

## 2. Bloqueiam a Release 1

### 9. SoundCloud: assinar o Artist Pro e viver sem o e-mail?

**Pesquisado em 2026-09-10 em [developers.soundcloud.com](https://developers.soundcloud.com/).** A API existe e serve ao que o protótipo pede; o que restou é decisão, não disponibilidade. A pergunta antiga — *"conseguimos credenciais?"* — está respondida.

- **As credenciais destravaram.** Em 18/05/2026 o SoundCloud abriu **API keys self-serve**: registro instantâneo, sem formulário de análise e sem fila. O "histórico de restrição" que este item registrava não vale mais.
- **Mas exigem assinatura.** *"You need a SoundCloud Artist Pro subscription to register API applications and receive credentials."* São ~US$ 8,25/mês (US$ 99/ano, com 30 dias de teste) numa conta da Dissona — custo recorrente da plataforma, não do usuário.
- **O OAuth é padrão e casa com o nosso.** OAuth 2.1 `authorization_code` com **PKCE obrigatório** (`secure.soundcloud.com/authorize` → `/oauth/token`), `redirect_uri` pré-registrada com match exato, cliente tratado como confidencial (usa `client_secret` na troca) e botão oficial *"Connect with SoundCloud"* para sign-in.
- **Não precisamos mais escrever o fluxo à mão.** O Supabase Auth passou a suportar **custom OAuth/OIDC providers**: OAuth2 puro com `authorization`, `token` e `userinfo` informados explicitamente, `pkce_enabled: true` por padrão e `email_optional: true`. O Free plan aceita 3 custom providers. É isto que derruba a premissa de "fluxo OAuth2 próprio" que estava na arquitetura.
- **O furo é o e-mail: `/me` não devolve.** O OpenAPI oficial (`soundcloud/api`, `openapi/api.yaml`) traz no schema `Me` os campos `full_name`, `first_name`, `last_name`, `permalink_url`, `urn`, `plan` e **`primary_email_confirmed` — que é um booleano**. Campo `email` não existe, e não há scope que o libere (`scopes: {}` nos dois flows; o parâmetro `scope` é *"leave blank by default"*). O pedido de expor o endereço — issue #213 do repositório deles — foi fechado sem entrega.
- **Dois deveres de ToS que não estavam nos requisitos:** um mecanismo acessível de **desconexão** da conta SoundCloud, e o **expurgo dos dados pessoais em até 7 dias** contados dela. Entraram em RF-002.

**Impacto:** RF-002 e a copy do cadastro. O protótipo promete *"Google, Facebook ou SoundCloud preenchem seu nome e e-mail"* — pelo SoundCloud vem o nome, e o e-mail não vem. A divergência está registrada em [07 · pesquisa da API do SoundCloud](prd/07-pendencias-e-divergencias.md#divergência-levantada-pela-pesquisa-da-api-do-soundcloud--2026-09-10).

**O que ainda trava:**

1. **(cliente)** A plataforma assina o **Artist Pro** para ter as credenciais? Sem isso o provedor sai da tela — e aí mudam a copy e o layout do login e do cadastro, como este item já previa.
2. **(cliente + design)** Como o cadastro por SoundCloud colhe o e-mail que o provedor não dá: uma tela a mais — `/cadastrar/confirmar` já existe justamente para o que o social não colhe — ou o SoundCloud entra só como **login** de quem já tem conta?
3. ~~**(dev)** O custom provider do Supabase digere o `/me` do SoundCloud?~~ **Respondido em 2026-09-11: não, e a saída é a prevista.** O GoTrue exige `sub` (`models.NewIdentity`) e o `attribute_mapping` não alcança o `urn`, porque roda depois do parse para a struct `Claims`. O tradutor existe: a Edge Function `soundcloud-userinfo`, que o `userinfo_url` do provider aponta no lugar de `api.soundcloud.com/me`. Implementada, testada e no ar.

---

### 10. Provedor de e-mail transacional

**Aberto.** Não há definição de provedor nem de domínio de envio. Toda a R1 depende de e-mail: verificação, recuperação, convite de admin, aviso de alteração de credencial.

**Pergunta:** qual provedor, e qual domínio remetente? Quem configura SPF, DKIM e DMARC?

---

### 12. Ativação do 2º papel exige aprovação?

**Divergência.** O protótipo do artista, em Conta › Dados da conta, diz *"Ativar papel de curador — depende de aprovação da curadoria"*. Esse fluxo **não existe no board**, que manda direto ao módulo 12 com Bronze auto-aprovado.

**Impacto:** módulos 7.2 e 12.

**Pergunta:** ativar o papel leva ao fluxo normal do módulo 12, ou existe uma aprovação a mais antes do wizard?

---

### 13. Horas da Release 1

**Inconsistência.** A tabela da R1 declara **16,75h**, mas a soma das linhas dá **14,75h**. A causa identificada é a Autenticação aparecer uma vez, embora o escopo aloque 2h para Artista e 2h para Curador.

**Adotado no PRD:** R1 = 16,75h.

**Pergunta:** confirma? Se a Autenticação for 2h no total, a V1 tem 72h e sobram 2h no banco.

---

## 3. Abertas nas releases seguintes

### 14. Pesos do ranking

O discovery V4 (pág. 13) traz **duas versões dos pesos**, uma na tabela e outra no diagrama. O PRD adotou a tabela:

```
Ranking = (média das notas ÷ 5)        × 0,25
        + (feedbacks no prazo ÷ total) × 0,33
        + (calibração: desvio ÷ 2,0)   × 0,27
        + (% de compartilhamentos)     × 0,15
```

**Impacto:** módulos 16, 20.4, 4 e 24. **Conferir a fonte original.**

### 15. Critérios definitivos de classe

Quais credenciais valem para Prata (só link de veículo? formação? prêmio?) e o que o admin avalia qualitativamente no dossiê de Ouro além dos números.
**Impacto:** 12.4, 16.1, 20.3, 20.4.

### 16. Definição de "ciclo" e fórmula do score

O que é um ciclo — trimestre fixo ou janela móvel de 90 dias? Qual a fórmula final do score composto e "≥0,85 sustentado" por quantos ciclos?
**Impacto:** 16, 16.1, 20.4.

### 17. Penalidades: tipos e gravidade

"Zero penalidades" é requisito para Ouro, mas não há lista do que gera penalidade, se expira, nem gravidades.
**Impacto:** 16.1, 20.4, 23, 18.

### 18. Bronze→Prata só por credenciais?

O board registra que a subida é por credenciais, **não** por performance — um Bronze excelente não sobe enquanto não apresentar credenciais. Confirmar, porque define o que o Bronze vê como caminho de evolução (16.1).

### 19. Salvamentos da playlist do curador

Sem integração com o Spotify, o número de salvamentos **não existe** — e ele aparece no card do curador (4) e no cadastro (12.1).
**Pergunta:** a integração entra na R3, ou o campo vira declaratório com verificação manual?

### 20. Modelo de IA e "dados suficientes"

Qual modelo/API, e qual o critério quantitativo de "histórico suficiente" para o relatório do artista. O relatório da música já tem regra (≥ metade dos curadores); o do artista não.
**Impacto:** 2.1, 6.1.

### 21. Critérios e prazos de estorno

Quais motivos são aceitos e em que prazos; o que caracteriza tecnicamente "feedback entregue" (publicado? visualizado? aceito?); se insatisfação do artista gera direito a estorno.
**Impacto:** 22.2, 5, 15. **Decisão de:** cliente + jurídico.

### 22. "Gestão da Homepage & Mídia" não tem módulo

O user flow do admin inclui esse passo e o módulo 26 prevê venda de mídia no banner dos 100 curadores — mas **não existe módulo nem horas alocadas** na V1.
**Pergunta:** quem cadastra destaques, matéria e banner? É trabalho manual no banco, ou precisa de tela? Se precisar de tela, exige **nova recarga de horas**.

### 23. Critérios de aceite da homepage

Os blocos "Critérios de aceite", "Notificações" e "Impactos em outros módulos" do módulo 26 estão **vazios no board**, assim como a user story do ambiente público. Os critérios em [05](prd/05-ambiente-publico.md) foram **derivados** e precisam de validação — é a maior peça isolada da R5 (8h).

### 24. Breakpoints e layout mobile

Os três protótipos da R2 **não têm nenhum `@media`**: a responsividade vem de `clamp()`, `minmax()` e `flex-wrap`. Não há layout mobile ou tablet definido. O PRD diz "web, mobile-first a confirmar", e as personas usam desktop para enviar e celular para acompanhar.
**Impacto:** todo o front. **Decisão de:** cliente + design. Ver [Design System §5](design-system.md).

### 25. Projetos dedicados de staging e produção

Hoje **um único projeto Supabase** (`dissona`, `us-west-2`) serve tanto o Preview quanto a Production da Vercel. Enquanto não há usuário real isso é aceitável e economiza US$ 20/mês, mas tem duas consequências: não existe degrau de validação antes de produção, e um `supabase db reset --linked` apaga o banco dos dois ambientes.

Antes de qualquer usuário real, provisionar `dissona-staging` e `dissona-producao` (US$ 10/mês cada) e separar as env vars da Vercel por escopo.
**Gatilho:** antes do beta. **Decisão de:** técnico. **Impacto:** [arquitetura §2.2 e §9](architecture.md), env vars da Vercel, CI.

### 26. Duas reprovações de contraste mantidas por fidelidade ao protótipo

A auditoria do [Design System §4.2](design-system.md) reprova sete pares de contraste. Cinco foram corrigidos na implementação da R0 (botão em loading, botão desabilitado, dot de sucesso usado como texto, "senha média" e numeral de stepper). Dois foram **mantidos como estão no protótipo**, por decisão de fidelidade visual:

| Par | Ratio | Exigência | Alternativa auditada |
|---|---|---:|---|
| Borda de campo em repouso `#E7E3EF` / branco | **1,26:1** | WCAG 1.4.11 pede 3:1 para componente | `#8A8398` (3,63:1), ou dar contraste pelo fundo do campo |
| Botão primário, branco / `#E35336` | **3,78:1** | AA pede 4,5:1 para texto de 16px/600 | `#C4442A` (4,99:1), que o protótipo já usa no hover |

Ambos estão marcados com `TODO(a11y)` em `src/estilos/tokens.css`, `Campo.module.css` e `Botao.module.css`.

**Consequência:** o item "contraste AA" da [Definition of Done](architecture.md#10-definition-of-done) passa **com estas duas exceções registradas**, e não integralmente. Quem for revisar a R0 precisa saber disso.
**Gatilho:** revisão de acessibilidade antes do beta. **Decisão de:** cliente + design.

### 27. LGPD versus retenção fiscal no expurgo

**Aberto, e é decisão de jurídico.** A política publicada em `/privacidade`
promete apagar a conta em 30 dias. Mas `lancamento_clave` é append-only por
desenho, e `pedido_clave` e `ganho_curador` têm retenção fiscal — apagar em
cascata destruiria a conciliação financeira. E a devolutiva já paga
**permanece com os curadores por obrigação contratual**
([regras §10](prd/01-regras-de-negocio.md)), o que significa que a avaliação
também não pode simplesmente desaparecer.

**A leitura adotada, e implementada:** `expurgar_contas_excluidas`
**anonimiza**. Zera nome, handle, foto, cidade, dados de cobrança e chave Pix;
apaga credenciais, mídias e notificações; preserva as linhas financeiras e a
avaliação, com o `perfil_id` intacto para a conciliação continuar possível.

**Perguntas:** essa leitura atende à LGPD na avaliação do jurídico? Qual o prazo
de retenção fiscal, para virar a chave `lgpd.retencao_fiscal_anos`? E o texto de
`/privacidade` precisa ser reescrito para dizer o que de fato acontece — hoje
ele promete mais do que o sistema pode cumprir.

**Impacto:** job da `0011`, texto legal, e a exportação `.zip` da TASK-135.

---

## 4. Resolvidas

Registradas aqui para que ninguém as reabra por engano.

### Resolvidas na correção do alinhamento dos e2e · 2026-09-17

#### 28. Upload de faixa não sobrevive à Vercel — **resolvida**

**A saída escolhida foi a que o item previa: upload direto ao Storage.**
`FormularioDaFaixa` sobe o arquivo pelo cliente Supabase do navegador e manda à
Server Action apenas o **caminho**; `salvarFaixa` confere que ele está sob a
pasta da própria pessoa e lê tamanho e MIME do metadado do objeto
(`metadadosDoObjeto` → `validarAudioNoStorage`), mantendo as mensagens que a
tela já traduzia.

Três coisas fizeram a mudança ser barata:

- **Nenhuma policy nova.** `"faixas: dono gerencia a propria pasta"` já exige
  `(storage.foldername(name))[1] = auth.uid()::text`, e `subirAudio` sempre
  gravou em `${usuarioId}/${ref}.ext` — a convenção de caminho já era a certa.
- **O limite passou a ser aplicado por quem o declara.** O bucket `faixas` tem
  `file_size_limit` de 50 MB e a lista de MIME desde a `0000_storage`. Era
  redundância; virou a defesa real.
- **O corpo da ação virou um path.** `bodySizeLimit` e `proxyClientMaxBodySize`
  voltaram de `64mb` a `8mb`, folga suficiente para o que ainda viaja por
  Server Action.

O `<input type="file">` continua com `name`: **sem JavaScript** o arquivo volta
ao `multipart` e `validarAudio` o valida como antes. Os dois caminhos existem.

⚠️ **O que sobrou:** o anexo de credencial do curador (5 MB) continua indo por
Server Action e continua acima do teto de ~4,5 MB da Vercel. Não é RF-036 e não
foi movido nesta rodada; quando for, é o mesmo desenho.

⚠️ **Duplicação registrada:** `configuracao.upload.tamanho_max_mb` (50) e o
`file_size_limit` do bucket (52428800) são o mesmo número em dois lugares. O
bucket é a aplicação; a `configuracao` é o que a tela mostra. Comentário em
`src/modulos/faixa/consultas.ts`; o lado SQL já o trazia desde a `0000_storage`
(a migration não foi editada — o que está aplicado tem de bater byte a byte).

**Falta provar em produção.** Nenhum teste local alcança o motivo da mudança:
só subir um arquivo acima de 4,5 MB no **Preview da Vercel** prova que o teto
deixou de importar.

#### 29. O estado `ouviu` é inalcançável na interface da R2 — **resolvida**

**Das duas saídas, a escolhida foi o player na 13.1** (decisão do usuário,
2026-09-17): o curador ouve **antes** de assumir a avaliação, que é o que o nome
do estado sempre disse. RF-071 e a tela 3.3 ficam como estão, com quatro
estados.

Sem componente novo: `PlayerComMedicao` e `registrarEscutaMedida` funcionam como
estavam, e o que mudou é **onde** o player é montado. `lerDetalhe` passou a
trazer a URL assinada do áudio, o mínimo de escuta e o percentual já medido,
pelas mesmas funções que `lerAvaliacao` usa.

`iniciarAvaliacao` continua gravando `avaliando`, e `marcarEnvioComoOuvido`
continua agindo só sobre `recebeu` — nada disso mudou, e é o que impede o estado
de andar para trás. `e2e/sla/s3-estados-do-envio.spec.ts` afirma os **quatro**
estados, cada um pelo gesto que o produz, e a ressalva saiu de
`scripts/matriz-rastreabilidade.mjs`.

### Resolvidas pelo protótipo da R2 · 2026-09-08

Os três arquivos de [`docs/R2/`](R2/) não são imagens: cada um carrega o markup
e o JavaScript da tela numa linha JSON, e `pnpm prototipo` os torna legíveis.
Como o [AGENTS.md](../AGENTS.md) estabelece **protótipo da R2 > board de
discovery > derivação**, o que está lá decide.

| # | Pergunta | Resposta do protótipo | Onde está no código |
|---|---|---|---|
| **1** | Escuta mínima: 60% ou 100%? | **60%**, literal na copy da tela que aplica o gate: *"A escuta é medida. A avaliação só é aceita a partir de 60% da faixa ouvidos."* A promessa de 100% na copy do artista é o que precisa mudar | `configuracao.escuta_minima_percentual` |
| **2** | Qual é o 11º critério? | **Não falta um, faltavam dois.** O grupo Produção tem **Mixagem** e **Arranjo**; com eles, 2+2+3+2+2 = 11 | seed de `criterio`, migration `0008` |
| **3** | Quais 5 são obrigatórios? | `afinacao`, `ritmo`, `melodia`, `personalidade`, `conexao`. **Não** é um por grupo: Execução técnica tem dois e Produção nenhum | `configuracao.criterios_obrigatorios` |
| **4** | Tabela de pacotes | Ensaio 10/R$ 100 · Repertório 30/R$ 285 · Turnê 60/R$ 540 · Catálogo 100/R$ 850 **inativo**. O inativo é o que torna demonstrável a regra "só os ativos aparecem na Carteira" | seed de dev |
| **11** | Matriz de permissões do admin | `Moderador {gestao, moderacao}` · `Financeiro {financeiro}` · `Suporte {gestao}` · Administrador tudo, e *"só o Administrador gere equipe e papéis"* | seed de `permissao_admin`, migration `0003` |

Duas ressalvas sobre estas respostas:

- O protótipo tem **um** booleano por módulo, e `permissao_admin` tem
  `pode_ler` **e** `pode_escrever`. A tradução foi por menor privilégio, e os
  módulos `pacotes` e `configuracao` foram derivados (o primeiro vive no grupo
  Financeiro da navegação; o segundo guarda os pisos de remuneração e ficou só
  com o administrador). A granularidade fina segue à disposição do cliente.
- A #5 também foi respondida pelo protótipo, mas com uma **mudança de
  semântica** grande o bastante para continuar em aberto. Ver §1.


| Item | Decisão | Fonte |
|---|---|---|
| **Política de senha** | ≥8 caracteres, ao menos 1 número | protótipo R2 — *confirmar com dev se atende à política de segurança* |
| **Token de recuperação** | 60 minutos, uso único | protótipo R2 |
| **Verificação de e-mail** | 24 horas | protótipo R2 |
| **Formato de envio** | WAV e MP3, até 50 MB (o board dizia só mp3) | protótipo R2 |
| **Fluxo de envio** | Wizard de 3 passos + campo "O que o curador precisa saber?" | protótipo R2 |
| **Cadastro do curador** | 8 passos (o board previa 6 telas) | protótipo R2 |
| **Papéis do admin** | Administrador · Moderador · Financeiro · Suporte | protótipo R2 |
| **Pacotes** | Acrescentam status ativo/inativo, preço por Clave calculado, log e a regra "só ativos aparecem na Carteira" | protótipo R2 |
| **Estados do saldo** | Disponível · Comprometidas em análise · Devolvidas por falta de resposta | protótipo R2 |
| **Login** | Tela única para artista e curador; admin com login separado, sem social e sem autocadastro | board + protótipo |
| **Stack** | Next.js App Router + TypeScript strict + Supabase | decisão técnica — ver [arquitetura](architecture.md) |
| **Hospedagem** | **Vercel** — um projeto, Production Branch `main`, funções em `pdx1` | decisão técnica — ver [arquitetura §9](architecture.md) |
| **Projetos Supabase** | **Um só** (`dissona`, `us-west-2`) na fase de desenvolvimento; staging e produção viram [#25](#25-projetos-dedicados-de-staging-e-produção) | decisão técnica |
| **Runtime** | **Node 24 LTS** — o Node 20 saiu de suporte em abr/2026 | decisão técnica |
| **DDL** | **Pelo MCP do Supabase** (`apply_migration`); o `.sql` versionado é a fonte e o nome do arquivo carrega a versão que o MCP grava | decisão técnica — ver [arquitetura §2.2 e §2.4](architecture.md) |
| **Escopo em execução** | Backlog vai só até a R2 | [PRD](PRD.md) |
| **Treinar IA com documentos do cliente** | Descartado | discovery (R4) |
| **Planos/Assinatura e Espaço de diálogo** | Adiados para a V2 (−8h), banco recarregado para 74h | discovery |

---

## 5. Riscos com mitigação definida

Não são pendências — são riscos já identificados, com mitigação decidida. Ficam aqui para acompanhamento.

| Risco | Mitigação | Módulo |
|---|---|---|
| No-show de curador | Exibir disponibilidade e carga ("responde em ~Xh", "fila cheia"); permitir sinalizar lista de espera | 4, 17 |
| Confusão ranking × classe | Separar visualmente + tooltip explicando o que cada um mede | 4, 16 |
| Fila de aprovação Prata na escala 200→6.000 | Ações em lote + SLA visível; evento de avaliação geral em data definida | 20.3 |
| Limbo do candidato a Ouro | Dossiê com limite de adiamentos / prazo de decisão | 20.4 |
| Denúncia retaliatória | Penalidade só após julgamento procedente | 23.1 |
| Empty states no lançamento | No beta tudo começa sem dados — tratar explicitamente | 2, 6, 16, 24, 26 |
| Conta ou credencial falsa de curador | Credencial com link verificável + amostragem na aprovação | 12.3, 20.3 |
| Avaliações em massa | Calibração penaliza compressão de notas | 16, 23 |
| **Token pessoal do Supabase em texto puro** no `.mcp.json` local, com acesso de gestão a todos os projetos da organização | **Risco aceito** (decisão de 2026-09-04): não rotacionar. Mitigação em vigor: `.mcp.json` está no `.gitignore` e nunca entrou em commit — conferido com `git ls-files`. O arquivo existe apenas em disco local | — |
