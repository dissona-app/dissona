# Perguntas em aberto — Dissona

Tudo o que ainda **não foi decidido** e trava ou condiciona a implementação. Cada item traz o que está aberto, o impacto, a pergunta objetiva e de quem é a decisão.

← [PRD](PRD.md) · [Pendências e divergências do discovery](prd/07-pendencias-e-divergencias.md) · [Backlog](BACKLOG.md)

**Nada aqui foi resolvido por suposição.** Onde o protótipo da R2 decidiu, o item aparece em [§4 Resolvidas](#4-resolvidas).

---

## Sumário

| # | Pergunta | Trava | Decisão de |
|---|---|---|---|
| [1](#1-escuta-mínima-60-ou-100-da-faixa) | Escuta mínima: 60% ou 100%? | **R2** | cliente |
| [2](#2-11º-critério-de-avaliação) | Qual é o 11º critério de avaliação? | **R2** | cliente |
| [3](#3-quais-5-dos-11-critérios-são-obrigatórios) | Quais 5 dos 11 critérios são obrigatórios? | **R2** | cliente |
| [4](#4-tabela-de-pacotes-de-claves) | Tabela de pacotes de Claves | **R2** | cliente |
| [5](#5-base-de-cálculo-da-remuneração-por-classe) | Base de cálculo da remuneração | **R2** | cliente + financeiro |
| [6](#6-modelo-de-split-no-asaas) | Modelo de split no Asaas | **R2** | cliente + contador |
| [7](#7-armazenamento-do-arquivo-de-áudio) | Armazenar o mp3 sempre? | **R2** | cliente + dev |
| [8](#8-liberação-do-crédito-versus-compartilhamento) | Crédito retido até verificar o compartilhamento? | **R2** | cliente |
| [9](#9-api-do-soundcloud-para-oauth) | API do SoundCloud disponível? | **R1** | dev |
| [10](#10-provedor-de-e-mail-transacional) | Provedor de e-mail e domínio de envio | **R1** | cliente + dev |
| [11](#11-matriz-de-permissões-do-admin) | Matriz de permissões do admin | **R1** | cliente |
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

---

## 1. Bloqueiam a Release 2

### 1. Escuta mínima: 60% ou 100% da faixa?

**Aberto.** Duas telas da mesma release prometem coisas diferentes:

| Fonte | O que diz |
|---|---|
| Protótipo **Curador**, avaliação | *"A escuta é medida. A avaliação só é aceita a partir de **60%** da faixa ouvidos."* |
| Protótipo **Artista**, login | *"...100% da faixa ouvida"* |
| Protótipo **Artista**, onboarding | *"O curador ouve do início ao fim antes de escrever qualquer coisa."* |
| Board V4 | *"player mede tempo mínimo de escuta"* — sem número |

**Impacto:** módulo 14 (gate de aceite da avaliação) e a copy do módulo 1. A promessa é **visível ao usuário final** — se o gate real for 60%, a home do artista promete algo que o sistema não exige.

**Pergunta:** o gate é 60% ou 100%? E, se for 60%, a copy do artista muda?

**Contorno técnico:** o valor vem de `configuracao.escuta_minima_percentual`; a implementação não trava, mas a copy do artista sim.

---

### 2. 11º critério de avaliação

**Aberto.** O método declara **11 itens em 5 grupos**, mas só **10 estão nomeados**:

| Grupo | Itens nomeados |
|---|---|
| Execução técnica | afinação, ritmo |
| Composição | melodia, letra |
| Identidade | personalidade, expressividade, originalidade |
| Impacto | conexão, memorabilidade |
| **Produção** | **— nenhum** |

**Impacto:** seed da tabela `criterio` (migration `0008`), tela 14, cálculo do acréscimo por "responder os onze".

**Pergunta:** qual é o item do grupo Produção? É um só (mixagem? masterização? arranjo?) ou o grupo tem mais de um e outro grupo tem menos?

---

### 3. Quais 5 dos 11 critérios são obrigatórios?

**Aberto.** A regra diz *"cinco critérios são obrigatórios; responder os onze rende acréscimo"* — mas não diz **quais cinco**.

**Impacto:** validação de conclusão da avaliação (RPC `enviar_avaliacao`), flag `criterio.obrigatorio`, cálculo do acréscimo.

**Pergunta:** são cinco itens fixos (quais?), ou um por grupo, ou cinco quaisquer à escolha do curador?

---

### 4. Tabela de pacotes de Claves

**Aberto.** Não há definição de quantas Claves por pacote, preços finais em reais nem os percentuais do desconto progressivo.

**Impacto:** módulos 5 (Carteira), 5.1 (Pacotes), 5.2 (Checkout) e 21 (Pacotes — admin). Sem a tabela não há o que semear nem o que testar no checkout.

**Pergunta:** qual a tabela completa? (ex.: 10 Claves por R$ 95 · 50 Claves por R$ 450 · 100 Claves por R$ 850)

**Contorno:** a tela do admin (21) permite cadastrar os pacotes; o bloqueio é para o seed de dev e para os cenários de teste da R2.

---

### 5. Base de cálculo da remuneração por classe

**Aberto.** A tabela por classe (Bronze 30/38→50% · Prata 40/43→55% · Ouro 45/50→62%) não diz **sobre qual valor** esses percentuais incidem, nem como isso concilia com "1 Clave = R$ 10" e "margem da plataforma 50%".

**Impacto:** função `calcular_remuneracao`, módulos 14.4, 15 e 22. Sem a base não é possível calcular o crédito nem o split.

**Perguntas:**
- Os percentuais incidem sobre o **valor bruto** da Clave ou sobre os 50% que caberiam ao curador?
- Exemplo numérico: artista paga 10 Claves (R$ 100); curador Bronze no prazo (38%) recebe quanto, e a plataforma fica com quanto?
- Se o Ouro chega a 62%, a margem da plataforma cai abaixo de 50% — os 50% são teto, piso ou média?
- Existe teto absoluto em reais por curadoria?

> Este é o item de maior risco de retrabalho: ele contradiz aparentemente a regra dos 50% e atravessa três módulos.

---

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

### 9. API do SoundCloud para OAuth

**Aberto.** SoundCloud **não é provider nativo** do Supabase Auth; exige fluxo OAuth2 próprio. O cadastro de novas aplicações na API do SoundCloud tem histórico de restrição.

**Impacto:** RF-002. Se a API estiver indisponível, o botão sai da tela — o que altera copy e layout do login e do cadastro.

**Pergunta (dev):** conseguimos credenciais de aplicação no SoundCloud? Se não, removemos o provedor ou adiamos?

---

### 10. Provedor de e-mail transacional

**Aberto.** Não há definição de provedor nem de domínio de envio. Toda a R1 depende de e-mail: verificação, recuperação, convite de admin, aviso de alteração de credencial.

**Pergunta:** qual provedor, e qual domínio remetente? Quem configura SPF, DKIM e DMARC?

---

### 11. Matriz de permissões do admin

**Aberto.** O protótipo nomeou quatro papéis — **Administrador · Moderador · Financeiro · Suporte** — mas **não definiu quem acessa o quê**.

**Impacto:** módulo 27.4 e o seed de `permissao_admin`. Sem a matriz, a tela existe mas não tem conteúdo, e as guardas de rota do `(admin)` ficam permissivas.

**Pergunta:** para cada papel, quais módulos são de leitura, quais são de escrita e quais são invisíveis?

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

---

## 4. Resolvidas

Registradas aqui para que ninguém as reabra por engano.

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
| **DDL** | Só pelo Supabase CLI; o MCP do Supabase é para inspeção, nunca para aplicar migration | decisão técnica |
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
