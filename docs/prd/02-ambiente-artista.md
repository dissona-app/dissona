# 02 — Ambiente Artista

Nove módulos, 26,5h. Todos web.

← [Voltar ao PRD](../PRD.md) · [Regras de negócio](01-regras-de-negocio.md)

> **User story do ambiente:** *Como artista independente, quero enviar minha música e receber feedback estruturado, para evoluir e saber onde melhorar.*

| # | Módulo | Release | Discovery | UI | Total |
|---|---|---|---|---|---|
| [1](#1-autenticação) | Autenticação | R1 | 1h | 1h | 2h |
| [2](#2-dashboard-do-artista) | Dashboard do Artista | R4 | 3h | 1h | 4h |
| [3](#3-minhas-músicas--enviar) | Minhas Músicas › Enviar | R2 | 1h | 1h | 2h |
| [3.3](#33-status-de-envio) | Status de envio | R3 | 1,5h | 2h | 3,5h |
| [4](#4-seleção-de-curadores) | Seleção de Curadores | R3 | 1,5h | 2h | 3,5h |
| [5](#5-carteira-e-claves) | Carteira e Claves | R2 | 1,5h | 2h | 3,5h |
| [6](#6-minhas-músicas--catálogo--análises) | Catálogo + análises | R4 | 3,5h | 2h | 5,5h |
| [7](#7-conta-e-configurações) | Conta e Configurações | R1 | 0,5h | 0,75h | 1,25h |
| [10](#10-notificações) | Notificações | R5 | 0,5h | 0,75h | 1,25h |

---

## 1. Autenticação

**Release 1 · 2h · Origem: board + protótipo R2 (Artista e Curador)**

> ⚠️ Este módulo é **compartilhado com o ambiente Curador** (lá numerado como 11) na parte de recuperação e redefinição de senha. Login e cadastro, porém, têm **rotas exclusivas por perfil** (`/artista/entrar` + `/artista/cadastrar`, `/curador/entrar` + `/curador/cadastrar`) — reversão de 2026-09-17 da decisão anterior de tela única, registrada em [07 — Pendências e divergências](07-pendencias-e-divergencias.md). `/entrar` e `/cadastrar` sem prefixo continuam existindo, neutras, como fallback (ex.: links antigos).

### Objetivo

Dar a entrada única e segura na plataforma — cadastro, login (e-mail/social), recuperação de senha, escolha de papel e onboarding — roteando cada usuário ao seu ambiente.

### Telas

| # | Tela |
|---|---|
| 1 | Login |
| 1.1 | Cadastro / Criar conta |
| 1.2 | Recuperação de senha |
| 1.3 | Redefinição de senha |
| 1.4 | Seleção de perfil |
| 1.5 | Onboarding (por ambiente) |
| — | Verificação de e-mail *(acrescentada no protótipo)* |

### 1 · Login

> Rotas exclusivas por perfil: `/artista/entrar` usa a copy do Artista, `/curador/entrar` usa a copy do Curador (abaixo). `/entrar`, sem prefixo, continua existindo com a copy do Artista, como fallback neutro.

**Campos:** E-mail · Senha (com mostrar/ocultar)

**Login social:** Google · Facebook · SoundCloud (OAuth)

**Ações:**
- Botão **Entrar**
- "Esqueci minha senha" → 1.2
- "Criar conta" → 1.1, na rota do mesmo perfil

**Roteamento:**
- Login OK **com papel já definido** → vai direto ao ambiente
- **1º acesso (sem papel)** → 1.4 Seleção de perfil — só alcança quem chegou por login **social** sem papel ainda definido, já que o cadastro por e-mail nas rotas exclusivas grava o papel na hora (ver 1.1)

**Validações:** e-mail em formato válido; senha obrigatória; erro genérico *"e-mail ou senha inválidos"* (não revela qual).

**Estados:** loading no "Entrar" · erro de credencial · conta bloqueada (mensagem + contato).

**Copy do protótipo (Artista):** título *"Curadoria musical — Leitura real da sua música."*; rodapé de reforço *"7 dias para a devolutiva · até 11 critérios com nota · 100% da faixa ouvida"*. ⚠️ Ver pendência sobre o percentual de escuta.

**Copy do protótipo (Curador):** *"Área do curador — Escute com método. Seja remunerado por isso."*; rodapé *"Você define seus serviços e preços · Remuneração por classe e prazo · Bronze, Prata e Ouro por mérito"*.

### 1.1 · Cadastro

> Rotas exclusivas por perfil: `/artista/cadastrar` e `/curador/cadastrar`, cada uma com o papel já implícito na rota. `/cadastrar`, sem prefixo, continua existindo sem papel implícito, como fallback neutro — e é quem ainda passa por 1.4 depois de confirmar o e-mail.

**Campos:** Nome completo · E-mail · Senha · Confirmar senha

**Cadastro social:** mesmos 3 provedores, pré-preenchendo nome e e-mail. O usuário confirma antes de criar.

**Aceite obrigatório:** checkbox de Termos de uso + Política de privacidade, com menção explícita ao tratamento de dados conforme a LGPD.

**Ação:** "Criar conta" → e-mail de verificação → destino conforme a rota:
- `/artista/cadastrar` ou `/curador/cadastrar` → o papel é gravado ao confirmar o e-mail, e a pessoa vai direto ao ambiente (artista) ou ao wizard do módulo 12 (curador), **sem** passar por 1.4.
- `/cadastrar` (sem prefixo) → 1.4, como antes.

**Validações:** e-mail único (checar duplicidade) · força de senha (8+ caracteres, ao menos 1 número, com indicadores visuais) · senha = confirmação · nome obrigatório.

**Estados:** loading · sucesso · e-mail já cadastrado → erro + link "Entrar".

**Bloco "Como funciona"** (protótipo, ao lado do formulário):
1. **Envie sua música** — uma faixa por envio; quantos curadores couberem no seu saldo.
2. **Receba leitura real** — até 11 critérios, cada um com nota decimal e um parágrafo obrigatório.
3. **Acompanhe sua evolução** — relatórios que comparam faixa a faixa.
4. **Circule mais longe** — playlist, post ou matéria, a partir do parecer.

### Verificação de e-mail *(protótipo)*

Link de verificação válido por **24 horas**. Ações: "Já confirmei, continuar" · "Reenviar e-mail" · "corrija o endereço". Após confirmar, segue para o onboarding.

### 1.2 · Recuperação de senha

**Campo:** e-mail cadastrado.
**Ação:** "Enviar link de recuperação" → e-mail transacional.
**Resposta neutra:** *"Se este e-mail estiver cadastrado, enviamos um link de recuperação. Por segurança, não confirmamos se a conta existe. O link expira em 60 minutos e vale um único uso."*
**Ações da tela de confirmação:** voltar ao login · reenviar link · continuar para a redefinição.

### 1.3 · Redefinição de senha

**Campos:** Nova senha (com indicador de força) · Confirmar nova senha.
**Ação:** "Redefinir" → sucesso → volta ao Login.
**Validações:** força de senha · igualdade · token válido, não expirado e de uso único.
**Estado de erro:** *"Este link expirou ou já foi usado. Cada link vale 60 minutos e só funciona uma vez."* → reiniciar recuperação.
**Efeito:** ao redefinir, **encerra as outras sessões** da conta.

### 1.4 · Seleção de perfil

**Opções:** "Sou artista" · "Sou curador".
**Nota visível:** é possível ativar o outro papel depois, em Conta e configurações.

**Roteamento:**
- **Artista** → 1.5 Onboarding → Dashboard do artista (módulo 2)
- **Curador (1º acesso)** → Cadastro de curador (módulo 12) → depois o onboarding do curador

### 1.5 · Onboarding

Tour curto em **4 passos**, com "Avançar" / "Pular" / "Voltar" e indicador "Passo X de 4".

| Passo | Artista | Curador |
|---|---|---|
| 1 | Envie sua música | Fila |
| 2 | Receba leitura real | Avaliação |
| 3 | Acompanhe sua evolução | Remuneração |
| 4 | Circule mais longe | Classes |

Só no 1º acesso; reabrível pelo menu de ajuda ("Rever onboarding"). Existe nos três ambientes — no admin, em versão enxuta.

### Critérios de aceite

- [ ] Usuário cria conta (e-mail ou social) com aceite de termos.
- [ ] Usuário faz login (e-mail ou social).
- [ ] Usuário recupera e redefine a senha via link.
- [ ] No 1º acesso, escolhe o papel e é roteado corretamente (artista → dashboard; curador → cadastro de curador).
- [ ] Onboarding aparece no 1º acesso e pode ser pulado.
- [ ] Uma mesma conta pode ter os dois papéis.

### Notificações

- Novo cadastro concluído → **alerta ao admin** (novo usuário na plataforma).
- Recuperação de senha → **e-mail transacional ao usuário**.
- *Obs.: a notificação de "curador Prata em análise" pertence ao módulo 12, não a este.*

### Impactos em outros módulos

- Seleção "curador" (1º acesso) → entra no fluxo de **Cadastro de curador (12)**.
- Seleção "artista" → **Dashboard do artista (2)**.
- Conta criada → base de usuários da **Gestão (Admin 20)**.
- Papéis definidos aqui se relacionam com **Conta e configurações** (ativar 2º papel).

### Regras

Ver [§9 Segurança e autenticação](01-regras-de-negocio.md#9-segurança-e-autenticação).

---

## 2. Dashboard do Artista

**Release 4 · 4h (3h discovery + 1h UI) · Origem: board**

### Objetivo

Visão geral do artista numa tela — saldo de Claves, catálogo, nota média — e o relatório de evolução gerado por IA em tela própria. É a tela inicial do ambiente Artista após o login.

### Telas

| # | Tela |
|---|---|
| 2 | Dashboard |
| 2.1 | Relatório geral (IA) |

### 2 · Dashboard

**Blocos de topo:** Meu Catálogo · Estatísticas de envio · Promover música · Comprar Claves + saldo em Claves.

**Exibe:**
- **Nota média do artista** em destaque — média das Notas Finais (NF) de cada música.
- Resumo de notas por música, em tabela: *Música · NO · NS · NF*.
- Prévia do relatório geral (texto de IA) + link "ver completo" → 2.1.

**Ações rápidas:** abrir catálogo → 6 · comprar Claves → 5 · promover música · abrir detalhe de música · abrir relatório completo.

**Regra:** saldo insuficiente **bloqueia novo envio** → leva a Comprar Claves.

**Estados:** artista novo sem envios (empty state + CTA).

### 2.1 · Relatório geral (IA)

**Exibe:**
- Texto consolidado por IA: evolução do artista ao longo do tempo.
- Pontos fortes e pontos de atenção recorrentes (ex.: afinação, ritmo).
- Música de melhor e de pior nota no período.

**Ações:** abrir a partir do dashboard · filtrar período · exportar PDF.

**Estados:** "Dados insuficientes" (poucos envios/feedbacks).

### Critérios de aceite

- [ ] Artista vê saldo, catálogo e nota média numa tela.
- [ ] Tabela NO/NS/NF bate com o detalhe de cada música.
- [ ] Relatório IA abre em tela própria quando há dados; senão, estado vazio.

### Notificações

Consome, não emite. **Opcional:** aviso de saldo baixo.

### Impactos em outros módulos

- Puxa **NF das avaliações (14)** e o Relatório do Artista (IA).
- "Comprar Claves" → **Carteira (5)** / gateway (Financeiro da plataforma, R5).
- "Meu Catálogo" abre o **módulo 6**.

### Regras

`1 Clave = R$ 10` · `NF = NO + NS` · Relatório do Artista só é exibido com histórico suficiente; senão, "dados insuficientes".

---

## 3. Minhas Músicas › Enviar

**Release 2 · 2h · Origem: board + protótipo R2 (Artista) + guia de testes**

### Objetivo

Enviar a música (link ou arquivo), completar os detalhes quando o sistema não extrai do streaming, dar contexto ao curador e revisar antes de enviar.

> **Mudança em relação ao board:** o protótipo transformou o envio em um **wizard de 3 passos** com indicador de progresso, e acrescentou um **campo de contexto** que não existia no discovery.

### Telas

| # | Tela |
|---|---|
| 3 | Enviar música (passo 1) |
| 3.1 | Detalhes — link sem dados |
| 3.2 | Detalhes — arquivo |
| — | Contexto (passo 2) *(protótipo)* |
| — | Revisão (passo 3) *(protótipo)* |
| — | Confirmação *(protótipo)* |
| 3.3 | Status de envio → [seção própria](#33-status-de-envio) |

### Passo 1 · Enviar música

Duas entradas paralelas:

**A. Colar link** (Spotify ou YouTube) → botão **"Detectar faixa"** → estado *"Procurando os dados da faixa"*.
- Detectou → mostra "Faixa encontrada" com capa, título e informações; oferece **"Corrigir dados"**.
- Não detectou → abre **3.1 Detalhes (link sem dados)**.

**B. Enviar arquivo** — upload de **MP3 ou WAV, até 50 MB** → abre **3.2 Detalhes**.

### 3.1 · Detalhes (link sem dados)

**Campos:** Capa · Título · Estilo predominante · "A faixa já foi lançada?" + data · links Spotify / YouTube (se houver).

*Ocorre quando o sistema não consegue extrair os dados do streaming.*

### 3.2 · Detalhes (arquivo)

**Campos:** upload da capa · Título · Estilo · Data de lançamento · Spotify/YouTube (se disponível).

*Caminho para música ainda não lançada; grava no banco.*

### Passo 2 · Contexto *(protótipo)*

**Campos:** Gênero da faixa · **"O que o curador precisa saber?"** (texto livre, com contador).

### Passo 3 · Revisão *(protótipo)*

Exibe faixa (título + informações), fonte do arquivo/link, gênero e o contexto escrito. Ações: Voltar · **Enviar para curadoria**.

**Aviso na tela:** *"A escolha dos curadores vem em seguida. Não existe limite por faixa: o teto é o seu saldo, e as Claves só saem quando você confirma a seleção."*

### Confirmação *(protótipo)*

*"Sua submissão chegou. Em breve alguém vai ouvir com atenção. Avisamos assim que a primeira leitura estiver pronta."*
Ações: **Acompanhar status** · Voltar para o início · Enviar outra faixa.

### Critérios de aceite

- [ ] Envio por link ou mp3.
- [ ] Completa detalhes quando o sistema não extrai.
- [ ] Acompanha o status do envio em tempo real.

**Cenários do Guia de Testes R2:**

- [ ] **Enviar por link** — colar link do Spotify/YouTube e clicar em "Detectar faixa": a faixa é detectada (capa e título aparecem); se não detectar, abre o preenchimento manual.
- [ ] **Enviar por arquivo** — enviar mp3/wav e preencher título, capa, gênero e data: aceita o arquivo e segue para o contexto.
- [ ] **Contexto e revisão** — o wizard mostra o progresso (3 passos); a revisão traz faixa, gênero e contexto.
- [ ] **Confirmação e status** — confirmação "Sua submissão chegou"; o Status mostra o progresso por curador.

### Notificações

- Música recebida pelo curador → **avisa o artista**.
- Feedback pronto → **avisa o artista**.

### Impactos em outros módulos

- Consome Claves (**Carteira 5**) após a **Seleção (4)**.
- Alimenta o **Catálogo + análises (6)**.
- Status conecta com **Notificações (10)**.

### Regras

- Uma faixa por envio; sem limite de curadores (o teto é o saldo).
- Se a autodetecção funcionar, pula a tela de detalhes.
- ⚠️ **Pendência do cliente:** armazenar o mp3 sempre ou só quando a música não está no streaming?

---

## 3.3 Status de envio

**Release 3 · 3,5h (1,5h discovery + 2h UI) · Origem: board + protótipo R2**

Entrou na V3.1 do discovery. Aparece **depois** da Seleção de curadores e da aplicação de Claves.

### Exibe

Tabela/barras por curador ou playlist, com **Curador · Andamento · Prazo · Etapa**. As barras mudam de cor a cada ação, para gerar expectativa:

```
Recebeu → Ouviu → Avaliando → Pronto
```

Cada linha mostra as iniciais e o nome do curador, sua **classe**, o prazo restante e a etapa atual.

**Nota de rodapé (protótipo):** *"Cada curador tem 72h para responder com repasse cheio. Sem resposta em 7 dias, a Clave volta para a sua carteira e aparece no extrato."*

O protótipo inclui um botão **"Simular avanço"** — recurso do protótipo, **não do produto**.

---

## 4. Seleção de Curadores

**Release 3 · 3,5h (1,5h discovery + 2h UI) · Origem: board**

> No protótipo da R2 este módulo aparece apenas como **placeholder** ("Próximo release").

### Objetivo

O artista pesquisa, compara e seleciona curadores para avaliar sua música, escolhendo serviços e pagando com Claves. É o ponto de conexão entre enviar (3), pagar (5) e a fila do curador (13). O artista chega aqui logo após submeter a música — **a música já vem selecionada**.

### Telas

| # | Tela |
|---|---|
| 4 | Pesquisa de curadores |
| 4.1 | Detalhe do curador |

### 4 · Pesquisa de curadores

**Busca:** por nome.

**Filtros:**
- Gênero/estilo — com **matching** contra a música submetida (sugerir curadores compatíveis primeiro)
- **Classe** (Ouro / Prata / Bronze)
- Serviço oferecido (Feedback, Playlist, Post, Matéria)
- Faixa de preço em Claves

**Card do curador:**
- Foto + nome
- **Selo de classe**
- Ranking + calibração
- Serviços + preço em Claves
- Modalidades (playlist com nº de salvamentos)
- % de compartilhamento

**Seleção / resumo (carrinho):**
- Curadores selecionados + serviços escolhidos por curador
- Total em Claves × saldo disponível
- CTA **"Confirmar e aplicar Claves"**

**Estados:** sem saldo → CTA comprar → Carteira (5) · filtro sem resultado · confirmação com resumo antes de debitar.

### 4.1 · Detalhe do curador

**Exibe:** foto, nome, bio · selo de classe + posição no ranking + calibração · estilos que cura · modalidades de compartilhamento (playlists com salvamentos, links, canais) · serviços + preços em Claves · estatísticas (feedbacks enviados, % de compartilhamento, média de avaliação dos artistas) · amostra de artistas/músicas compartilhados recentemente.

**Ações:** escolher serviço(s) e adicionar à seleção · voltar à pesquisa.

### Critérios de aceite

- [ ] Pesquisa e filtra curadores por gênero, classe, serviço e preço.
- [ ] Vê ranking, calibração, classe e preço de cada curador.
- [ ] Seleciona um ou vários curadores e escolhe os serviços.
- [ ] Vê o total em Claves e o saldo; só confirma com saldo suficiente.
- [ ] Ao confirmar, as Claves são aplicadas e a música entra na fila dos curadores (72h).

### Notificações

- Confirmação da seleção + aplicação de Claves → **ao artista**.
- Nova música na fila → **alerta a cada curador selecionado**.

### Impactos em outros módulos

- Consome saldo da **Carteira (5)**; se faltar, leva a comprar Claves.
- Cria itens na **Fila de avaliações do curador (13)**.
- Dispara o **Status de envio (3.3)**.
- Puxa perfil, classe, serviços e preços do **Cadastro do curador (12)**.
- Devolução em 7 dias reflete no **Extrato (5.3)** e no Financeiro.

### Regras

- `1 Clave = R$ 10`; preço definido **por serviço e por curador**.
- **Feedback é o serviço padrão/obrigatório**; Playlist, Post e Matéria são opcionais e cobrados à parte.
- Só confirma com saldo suficiente — senão, leva a comprar Claves.
- Não permitir selecionar o **mesmo curador duas vezes** para a mesma música.
- Se o curador não responder em 7 dias, o crédito é devolvido ao artista (aparece no extrato).
- A detecção do nº de salvamentos da playlist é via integração — dependência técnica.
- **Ranking ≠ classe.** Exibir os dois, com tooltip explicando o que cada um mede.
- **Prevenção de no-show:** exibir disponibilidade/carga do curador ("responde em ~Xh", "fila cheia") e permitir que ele sinalize lista de espera.

---

## 5. Carteira e Claves

**Release 2 · 3,5h (1,5h discovery + 2h UI) · Origem: board + protótipo R2 (Artista) + guia de testes**

### Objetivo

Comprar Claves, acompanhar saldo e ver o extrato de consumo.

### Telas

| # | Tela |
|---|---|
| 5 | Carteira |
| 5.1 | Pacotes de Claves |
| 5.2 | Checkout |
| 5.3 | Extrato |

### 5 · Carteira

**Exibe:**
- **Saldo disponível** em Claves, com o equivalente em reais (*"Uma Clave equivale a R$ 10"*)
- **Comprometidas em análise**
- **Devolvidas por falta de resposta**
- Resumo de uso e **últimas movimentações**

**Ações:** "Comprar Claves" → 5.1 · "Ver extrato" → 5.3.

### 5.1 · Pacotes de Claves

Lista de pacotes com **desconto progressivo**. Cada card traz quantidade, preço, preço por Clave e selo (ex.: mais vendido).

**Copy do protótipo:** *"Quanto maior o pacote, menor o preço por Clave. O crédito não expira e vale para qualquer curador da plataforma."*

**Ação:** selecionar pacote → 5.2.

### 5.2 · Checkout

**Formas de pagamento:** Cartão (número, nome impresso, validade, código de segurança) e **Pix** (QR + código copia e cola).

**Resumo do pedido:** quantidade · valor bruto · desconto do pacote · **total** · preço por Clave.

**Estados:** processando · **aprovado** (*"o saldo entra na carteira assim que o banco confirma"*, com ações "Ir para a carteira" e "Ver no extrato") · **recusado** (*"O banco não autorizou a cobrança. Nada foi debitado e o saldo continua o mesmo."*, com "Tentar de novo").

**Ações auxiliares:** trocar de pacote · voltar para a carteira.

### 5.3 · Extrato

**Colunas:** Data · Origem · Tipo · Claves · Saldo. Com filtro por tipo de movimentação.

**Estado vazio:** *"Nada nesse filtro — troque o tipo de movimentação para ver o restante."*

**Nota:** *"Quando um curador não responde em 7 dias, a Clave volta para a sua carteira e aparece aqui como devolvida."*

### Critérios de aceite

- [ ] Usuário compra pacote e paga.
- [ ] Saldo atualiza corretamente.
- [ ] Extrato mostra adquiridas / usadas / devolvidas.

**Cenários do Guia de Testes R2:**

- [ ] **Saldo e resumo** — a Carteira mostra saldo, adquiridas/usadas/devolvidas e as últimas movimentações.
- [ ] **Comprar Claves** — escolher pacote, escolher Cartão ou Pix, confirmar e testar os dois resultados: estados Processando/Aprovado/Recusado aparecem; no aprovado o saldo atualiza, no recusado nada é cobrado.
- [ ] **Extrato** — lista Claves adquiridas, usadas e devolvidas, com data e origem.

### Notificações

- Confirmação de compra de Claves → **ao artista**.
- Alerta de **saldo baixo** ao tentar submeter sem Claves suficientes.
- Aviso ao **Financeiro/Admin** de nova compra (conciliação).
- **Claves devolvidas** (curador não respondeu em 7 dias).

### Impactos em outros módulos

- Saldo alimenta o **Envio (3)** e a **Seleção (4)**.
- Pacotes são definidos pelo **Admin (21)**.
- Conecta com o **Financeiro da plataforma (22)**.

### Regras

- Saldo atualiza após pagamento aprovado.
- Margem da plataforma sobre a Clave = **50%** (backend).
- Devolução de Claves entra no extrato quando o curador não responde em 7 dias.
- Nota fiscal emitida a cada compra.

---

## 6. Minhas Músicas › Catálogo + análises

**Release 4 · 5,5h (3,5h discovery + 2h UI) · Origem: board**

### Objetivo

O artista navega suas músicas, lê a análise de cada curador, avalia o curador e — quando solicitado — envia material para a matéria.

### Telas

| # | Tela |
|---|---|
| 6 | Catálogo |
| 6.1 | Detalhe da música |
| 6.2 | Análise do curador |
| 6.3 | Avaliação do curador |
| 6.4 | Detalhes / matéria |

### 6 · Catálogo

**Exibe** galeria com capa · título · status (em avaliação / concluída) · NF.
**Ações:** filtrar por status · enviar nova música · abrir detalhes → 6.1.
**Estados:** sem músicas (empty state).

### 6.1 · Detalhe da música

**Exibe:** capa · título · lançamento · links Spotify/YouTube · NF · lista de curadores que avaliaram com o status de cada um · **Relatório da música (IA)**, quando disponível.

**Ações:** abrir análise de um curador → 6.2 · baixar relatório em PDF.

**Estados:** aguardando curadores ("dados insuficientes p/ relatório") · parcialmente avaliada.

### 6.2 · Análise do curador

**Exibe:** nota por item + justificativa/sugestão · feedback escrito do curador · nota subjetiva · compartilhamentos feitos por esse curador.

**Ações:** abrir justificativa (box) · ir para avaliar o curador → 6.3.

**Estados:** feedback ainda não enviado por esse curador.

### 6.3 · Avaliação do curador

**Campos:** nota ao curador (0–5) · feedback (mensagem **sigilosa**) · pergunta *"Compartilhar esta mensagem com o curador?"* (Sim/Não).

**Ação:** enviar avaliação. **Uma avaliação por curador por música.**

**Estados:** já avaliado · confirmação de envio.

*A avaliação do curador é sigilosa e serve para filtrar maus curadores.*

### 6.4 · Detalhes / matéria

Quando o curador compartilha via matéria, ele pode pedir texto, fotos ou vídeos ao artista. **O uso não é obrigatório.**

**Campos:** upload de arquivos (Word, PDF, JPG, PNG) · sugestão de texto/imagens para a matéria.

**Ação:** enviar → arquivos vão para a área do curador + e-mail de aviso.

**Estados:** nada solicitado · enviado.

### Critérios de aceite

- [ ] Cada música abre a análise de cada curador (notas por item + justificativa + NS + feedback).
- [ ] Artista consegue avaliar o curador (nota + feedback sigiloso).
- [ ] Relatório da música em PDF, respeitando o mínimo de metade dos curadores.
- [ ] Envio de detalhes para matéria funciona, com e-mail de aviso ao curador.

### Notificações

- "Feedback concluído" **atualiza o status no catálogo**.
- Envio de detalhes → **e-mail ao curador**.

### Impactos em outros módulos

- Puxa avaliações (**14**); alimenta a nota média do **Dashboard (2)**.
- A avaliação do curador (6.3) alimenta o **ranking (16)**.
- Detalhes/matéria (6.4) conecta ao compartilhamento do curador (**14.2 / 14.3**).

### Regras

- O detalhe do curador mostra NO por item + justificativa + NS + feedback escrito.
- **Relatório da Música (IA) só sai após ≥ metade dos curadores contratados enviarem feedback**; antes disso, "dados insuficientes".
- Ao enviar detalhes para matéria, os arquivos vão para a área do curador + e-mail de aviso.

---

## 7. Conta e Configurações

**Release 1 · 1,25h (0,5h discovery + 0,75h UI) · Origem: board + protótipo R2 (Artista)**

### Objetivo

Permitir ao artista gerenciar perfil, dados da conta, preferências e segurança. É aqui que o usuário **ativa o 2º papel** (curador).

### Telas

| # | Tela |
|---|---|
| 7 | Conta |
| 7.1 | Perfil |
| 7.2 | Dados da conta |
| 7.3 | Preferências |
| 7.4 | Segurança |

### 7.1 · Perfil

**Campos:** Foto · Nome artístico · **Cidade** · **Usuário (handle)** · Bio (**até 280 caracteres**, com contador) · Gêneros (multi-select, **até 3**) · Links e redes: Instagram, Spotify, YouTube, Site — cada um com validação.

**Exibe também** (visão pública do perfil): iniciais/avatar, estatísticas — **Faixas** (enviadas para curadoria), **Leituras** (curadorias concluídas), **Indicações** (compartilhadas por curadores) — e a lista "Suas faixas".

**Ações:** upload/trocar foto (*"JPG ou PNG, a partir de 400×400"*) · Salvar alterações · Cancelar.

**Nota:** *"Curadores veem essas informações antes de ouvir você."* · *"Dados sensíveis, como e-mail e senha, ficam em Configurações."*

### 7.2 · Dados da conta

**Campos:** E-mail da conta · Dados de cobrança (nome, CPF) · cartões salvos.

**Ações:**
- **Alterar e-mail** — exige senha atual; o novo endereço só passa a valer após confirmação enviada para ele.
- **Gerenciar cobrança** — *"Emitimos nota fiscal em cada compra de Claves."*
- **Ativar papel de curador** — *"Os papéis se acumulam: você segue artista e passa a receber faixas para avaliar."* ⚠️ O protótipo acrescenta *"Depende de aprovação da curadoria"* — fluxo não descrito no board.

### 7.3 · Preferências

**Campos:** notificações (toggles por tipo de evento) · idioma da interface (Português (Brasil), Español, English).
**Comportamento:** salvo automaticamente.
**Nota:** *"A devolutiva chega no idioma em que o curador escreveu."*

### 7.4 · Segurança

**Alterar senha** — pede a senha atual; ao confirmar, encerra as outras sessões e avisa por e-mail.
**Sessões ativas** — lista com navegador, cidade e último acesso; permite encerrar sessões que não sejam a atual.
**Excluir conta** — fluxo LGPD em 2 passos:
1. *Leve seus dados antes* — gera `.zip` com perfil, faixas enviadas, devolutivas recebidas e histórico de Claves.
2. *Confirmar a exclusão* — exige senha atual e digitar `EXCLUIR`. Conta desativada na hora, apagada em 30 dias, reversível nesse prazo. Devolutivas já pagas ficam com os curadores por obrigação contratual.

### Critérios de aceite

- [ ] Artista edita perfil e dados da conta.
- [ ] Ajusta preferências de notificação e idioma.
- [ ] Altera senha e pode excluir a conta.
- [ ] Consegue ativar o papel de curador.

### Notificações

- Confirmação ao alterar dados sensíveis (e-mail/senha).

### Impactos em outros módulos

- Preferências → **Notificações (10)**.
- Dados de cobrança → **compra de Claves (5)**.
- Ativar papel curador → **Cadastro de curador (12)**.

### Regras

- Alterar e-mail/senha exige reautenticação/confirmação.
- Excluir conta segue LGPD (aviso, prazo, exportação de dados).
- Conta e configurações existe nos 3 ambientes, com a mesma base e campos variando.
- É o ponto de entrada para Planos/Assinatura (módulo da V2).

---

## 10. Notificações

**Release 5 · 1,25h (0,5h discovery + 0,75h UI) · Origem: board**

### Objetivo

Centralizar os avisos do artista e levá-lo direto à origem de cada um.

**Canais:** in-app + e-mail. Mesma estrutura de tela do Curador (18) — muda apenas o catálogo de eventos.

### Telas

| # | Tela |
|---|---|
| 10 | Central de notificações |
| 10.1 | Detalhe |
| 10.2 | Preferências |

### 10 · Central

**Eventos exibidos:**
- Feedback concluído · crédito liberado
- Música compartilhada (playlist / post / matéria)
- Relatório da música disponível · saldo de Claves baixo
- Pedido de detalhes para matéria (vindo do curador)
- Estorno concluído (Claves devolvidas)

**Ações:** abrir detalhe → 10.1 · filtrar por tipo.
**Estados:** sem notificações (empty) · não lidas em destaque.

### 10.1 · Detalhe

Conteúdo completo do aviso, data/hora e contexto (qual música, curador, valor). Ações: ir para a origem (CTA) · marcar como lida/não lida. Estados: lida · não lida.

### 10.2 · Preferências

Por evento, canais in-app / e-mail (on/off).
**Validação:** eventos críticos **não são desativáveis**.

> *"Preferências" não consta no fluxograma original — é sugestão do discovery para controlar canais.*

### Critérios de aceite

- [ ] Artista vê seus eventos; abrir o Detalhe leva à origem.
- [ ] Feedback concluído e crédito liberado chegam em tempo real.
- [ ] Devolução (7 dias) gera aviso ao artista.

### Notificações

É o próprio módulo — consome eventos e exibe.

### Impactos em outros módulos

Consome eventos de **avaliações (14)**, **catálogo/análises (6)**, **carteira (5)** e **financeiro (22 — estornos)**.

### Regras

- Eventos críticos (devolução de crédito) **não são desativáveis**.
- Abrir a notificação leva **sempre** à tela de origem.
