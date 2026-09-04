# 03 — Ambiente Curador

Oito módulos, 22,5h. Todos web.

← [Voltar ao PRD](../PRD.md) · [Regras de negócio](01-regras-de-negocio.md)

> **User story do ambiente (board):** *Como novo curador, quero acessar minha conta com segurança, para começar a avaliar músicas.*
>
> **User story do fluxo (board):** *Como curador profissional, quero avaliar com método e ser remunerado por qualidade e pontualidade — respeitando prazos e classes.*

| # | Módulo | Release | Total |
|---|---|---|---|
| [11](#11-autenticação) | Autenticação | R1 | 2h *(tela compartilhada com o módulo 1; as horas são alocadas separadamente por ambiente)* |
| [12](#12-perfil--cadastro-de-curador) | Perfil / Cadastro de Curador | R1 | 2,5h |
| [12.6](#126--alteração-de-cadastro--mídias) | Alteração de cadastro / mídias | R1 | 2,5h |
| [13](#13-avaliações--fila--pendentes) | Avaliações › Fila / pendentes | R2 | 2,5h |
| [14](#14-avaliações--notas--feedback) | Avaliações › Notas + feedback | R2 | 4h |
| [15](#15-financeiro-do-curador) | Financeiro do Curador | R4 | 2,5h |
| [16](#16-métricas-de-performance) | Métricas de Performance | R3 | 2,5h |
| [17](#17-conta-e-configurações) | Conta e Configurações | R1 | 2h |
| [18](#18-notificações) | Notificações | R5 | 2h |

---

## 11. Autenticação

**Release 1 · 2h · Origem: board + protótipo R2 (Curador)**

> **Login compartilhado.** O curador entra pela **mesma tela** do artista. Não há mudança de escopo em relação ao módulo 1 — a arquitetura é a mesma. Ver a especificação completa em [02 — Ambiente Artista, módulo 1](02-ambiente-artista.md#1-autenticação).

### O que muda para o curador

| Ponto | Comportamento |
|---|---|
| **Copy da tela** | *"Área do curador — Escute com método. Seja remunerado por isso. Sua leitura crítica vira feedback que o artista pode citar."* Rodapé: *"Você define seus serviços e preços · Remuneração por classe e prazo · Bronze, Prata e Ouro por mérito"* |
| **Roteamento (1.4)** | Escolher "Sou curador" no **1º acesso** leva direto ao **Cadastro de curador (módulo 12)**, e só depois ao onboarding do curador |
| **Classificação** | **O login não classifica.** Perfil profissional e classe (Bronze/Prata) são definidos no módulo 12 |
| **Onboarding** | Fila · avaliação · remuneração · classes |
| **Verificação de e-mail** | *"Enviamos um link de verificação. Ele vale por 24 horas. Depois de confirmar, você escolhe seus papéis na plataforma."* |

### Critérios de aceite

- [ ] Usuário cria conta (e-mail ou social) com aceite de termos.
- [ ] Usuário faz login (e-mail ou social).
- [ ] Usuário recupera e redefine a senha via link.
- [ ] No 1º acesso, escolhe o papel e é roteado corretamente (artista → dashboard; curador → cadastro de curador).
- [ ] Onboarding aparece no 1º acesso e pode ser pulado.
- [ ] Uma mesma conta pode ter os dois papéis.

### Notificações

- Novo cadastro concluído → alerta ao admin.
- Recuperação de senha → e-mail transacional ao usuário.
- *A notificação de "curador Prata em análise" pertence ao módulo 12.*

### Impactos em outros módulos

- Seleção "curador" (1º acesso) → **Cadastro de curador (12)**.
- Seleção "artista" → **Dashboard do artista (2)**.
- Conta criada → base de usuários da **Gestão (Admin 20)**.
- Papéis definidos aqui se relacionam com **Conta e configurações (17.1)**.

---

## 12. Perfil / Cadastro de Curador

**Release 1 · 2,5h · Origem: board (ampliado na V4) + protótipo R2 (Curador)**

### Objetivo

Cadastrar o curador, coletar perfil e credenciais, classificá-lo (Bronze / candidato a Prata) e encaminhá-lo à tela final por classe. **É aqui que a V4 introduz as classes.**

> **Ouro nunca sai daqui.** A classe Ouro vem por convite ou por progressão de desempenho + decisão do admin.

O protótipo estrutura o cadastro como um wizard: *"São oito perguntas curtas: gêneros, atuação, canais, serviços, preços e as credenciais que definem sua classe."*

### Telas

| # | Tela |
|---|---|
| 12 | Identificação |
| 12.1 | Modalidades de compartilhamento |
| 12.2 | Serviços e preço |
| 12.3 | Perfil profissional / credenciais |
| 12.4 | Classificação (Bronze / Prata) |
| 12.5 | Tela final por classe |
| 12.6 | Alteração de cadastro / mídias |

### 12 · Identificação

**Campos:** Nome · E-mail · Senha (se não veio da conta) · Foto.
**Comportamento:** se já estiver logado, herda nome e e-mail — *"Nome e e-mail vêm da conta em que você já está. A senha segue a mesma."*
**Ações:** Voltar ao login · Continuar.

### 12.1 · Modalidades de compartilhamento

**Campos:** Tipo (**Playlist · YouTube · Instagram · Site · Blog · Rádio · Podcast**) · Nome + link.
**Ações:** inserir / remover mídia · adicionar canal.
**Comportamento:** o sistema **detecta o nº de salvamentos da playlist pelo link** (integração).
**Validação:** validar o link antes de salvar.

### 12.2 · Serviços e preço

**Campos:** preço em **Claves** por serviço — **Feedback** (padrão) · Playlist · Post · Matéria.
**Ações:** adicionar / editar serviço + preço.
**Nota:** *"1 Clave equivale a R$ 10. Você pode mudar os preços depois, no painel."*

### 12.3 · Perfil profissional / credenciais

Bloco introduzido na V4 (release de conteúdo do cliente).

**Campos:**
- **Atuação** (multi): jornalista · radialista · produtor · playlister · A&R · professor · músico
- **Tempo de atuação:** <1 · 1–3 · 3–5 · 5–10 · +10
- **Especialidade**
- **Participação em disco** (sim/não + link)
- **Veículos publicados** (links)
- **Formação**
- **Prêmios**
- **Bio** (com contador)

*Alimenta a classificação (12.4).*

### 12.4 · Classificação

Automática, a partir das credenciais declaradas:

| Resultado | Condição |
|---|---|
| **Bronze** (padrão) | Não comprova ≥2 credenciais |
| **Candidato a Prata** | **≥2 credenciais verificáveis** com link |

**Exibe:** as credenciais reconhecidas e a contagem.
**Nota obrigatória na tela:** *"A classe Ouro não é atribuída no cadastro. Ela vem por convite ou por desempenho na plataforma."*

### 12.5 · Tela final por classe

| Classe | Tela |
|---|---|
| **Bronze** | *"Curador Bronze aprovado."* **Auto-aprovado**, acesso liberado na hora. Oferece o **curso de curadoria** (opcional), com módulos numerados, título, descrição e duração. Ações: "Começar o curso" · "Ir para o painel" |
| **Prata** | *"Cadastro em análise."* — *"Seu perfil de candidato a Prata foi enviado para a avaliação manual do time Dissona. Assim que for aprovado, você recebe um aviso por e-mail e o acesso à curadoria é liberado."* Notifica o admin (módulo 20.3) |

**Aviso comum no wizard:** *"Seu cadastro passa por avaliação da equipe. Bronze é liberado na hora; candidato a Prata recebe resposta por e-mail."*

**Aceite:** ao enviar, o curador aceita Termos de uso e Política de privacidade, incluindo o tratamento de dados conforme a LGPD.

### 12.6 · Alteração de cadastro / mídias

Entrou na V3.1 do discovery — não constava na tabela original. É a **manutenção** do que foi definido no cadastro.

**Exibe:** tabela de mídias com nome, tipo e link, com resumo e status por item.
**Ações:** "Inserir nova mídia" · Editar (nome, link, imagem) · Excluir (com confirmação) · Editar serviços/preços.
**Regra:** **alterar mídia não altera a classe.**

### Critérios de aceite

- [ ] Completa dados, mídias, serviços e perfil profissional.
- [ ] Sistema classifica em Bronze ou candidato a Prata.
- [ ] Bronze aprovado na hora (parabéns + curso).
- [ ] Prata gera "em análise" + notifica admin.
- [ ] Adiciona, edita e exclui playlists/mídias.
- [ ] Edita serviços/preços.

### Notificações

- **Prata** → alerta ao admin.
- **Bronze** → boas-vindas.

### Impactos em outros módulos

- Cria curador aprovável em **Gestão (20)**.
- Habilita na **Seleção de curadores (4)**.
- Alimenta **Métricas / progressão (16)**.
- **12.6** reflete na **Seleção de curadores (4)** e no compartilhamento (**14**).

### Regras

- **Bronze = padrão**; **Prata = ≥2 credenciais verificáveis com link.**
- **Ouro não é atribuído no cadastro.**
- A aprovação do Prata acontece no **Admin › Gestão (20.3)** — aqui só dispara.
- Bronze é auto-aprovado e recebe o curso de curadoria.
- Thresholds configuráveis.
- Alterar mídia não altera a classe.
- Validar link antes de salvar.

---

## 13. Avaliações › Fila / pendentes

**Release 2 · 2,5h · Origem: board + protótipo R2 (Curador) + guia de testes**

### Objetivo

Mostrar as músicas pendentes com prazo de 72h e status, e abrir a avaliação.

### Telas

| # | Tela |
|---|---|
| 13 | Fila de avaliações |
| 13.1 | Detalhe do item / abrir avaliação |

### 13 · Fila de avaliações

**Colunas:** Música (capa, artista, título) · **Gênero** · **Serviço** · **Prazo restante (72h)** · **Status**.
**Ordenação e filtros:** por prazo (mais urgente primeiro, padrão), status e gênero. Colunas Música, Prazo e Status são ordenáveis.
**Ação:** abrir item → 13.1.
**Estado vazio:** *"Nada nesse recorte — troque o status ou o gênero para ver outras faixas."*
**Nota de rodapé:** *"Você tem 72h para responder com repasse cheio. Sem resposta em 7 dias, a Clave volta para o artista e a faixa sai da sua fila."*

### 13.1 · Detalhe do item

**Exibe:** capa e gênero · título e artista · duração · data de envio · dados da faixa · status · **"O que o artista quer saber"** (o contexto escrito no envio) · **prazo restante** · **serviços contratados** com nome, descrição e valor em Claves · **total da leitura**.

**Ação:** **"Iniciar avaliação"** → módulo 14.

### Critérios de aceite

- [ ] Curador vê a fila de músicas pendentes.
- [ ] Ordena e filtra por prazo, gênero ou artista.
- [ ] Abre um item para iniciar a avaliação.

**Cenários do Guia de Testes R2:**

- [ ] **Fila de avaliações** — tabela com música, prazo (72h) e status; ordenação por prazo (mais urgente primeiro) funciona.
- [ ] **Iniciar avaliação** — o detalhe mostra dados, prazo e serviço contratado, e segue para a avaliação.

### Notificações

- Novo envio na fila do curador.
- Alerta de **prazo próximo do vencimento**.

### Impactos em outros módulos

- Abre a **Avaliação (14)**.
- O prazo alimenta a **remuneração (14.4 / Financeiro 15)** e a **devolução de crédito**.

### Regras

- Prazo de **72h** para remuneração cheia.
- **Sem resposta em 7 dias** → crédito devolvido ao artista e faixa removida da fila.

---

## 14. Avaliações › Notas + feedback

**Release 2 · 4h · Origem: board (alterado na V4) + protótipo R2 (Curador) + guia de testes**

### Objetivo

Conduzir a avaliação metódica — notas objetivas com escuta medida, nota subjetiva e feedback — o compartilhamento e a apuração da remuneração por classe.

### Telas

| # | Tela |
|---|---|
| 14 | Notas objetivas |
| 14.1 | Nota subjetiva e feedback |
| 14.2 | Compartilhamento |
| 14.3 | Outras formas de divulgação |
| 14.4 | Remuneração por classe |

O protótipo apresenta as cinco etapas como um wizard com indicador de passo e ação **"Salvar e sair"** disponível durante todo o fluxo.

### 14 · Notas objetivas

**Player:** áudio com **medição do tempo ouvido**, exibindo o progresso da escuta e a duração.

⚠️ **Regra de escuta em conflito.** O protótipo do curador diz: *"A escuta é medida. A avaliação só é aceita a partir de **60%** da faixa ouvidos."* O protótipo do artista promete *"**100%** da faixa ouvida"*. Ver [pendência 1](07-pendencias-e-divergencias.md).

**Critérios (11 itens em 5 grupos), notas de 0 a 5 com uma casa decimal:**

| Grupo | Itens |
|---|---|
| Execução técnica | afinação, ritmo |
| Composição | melodia, letra |
| Identidade | personalidade, expressividade, originalidade |
| Impacto | conexão, memorabilidade |
| Produção | — |

**Justificar e sugerir por item:** campo de texto com contador. Não é obrigatório, mas com **≥250 caracteres** rende **+3%** de remuneração.

**Nota na tela:** *"Cinco critérios são obrigatórios. Os onze rendem acréscimo na remuneração, e a justificativa de 250 caracteres também."*

**Exibe:** resumo das notas objetivas com média e quantidade de critérios preenchidos, agrupado por bloco.

### 14.1 · Nota subjetiva e feedback

**Campos:**
- **Nota subjetiva** (0,0 a 5,0, slider com casa decimal) — *"O quanto a faixa te pegou, para além dos critérios."*
- **Feedback para o artista** — **obrigatório**, com contador.

**Regra:** **≥150 caracteres** para garantir o acréscimo.

### 14.2 · Compartilhamento

**Opções:** Playlist · Post Instagram · Matéria · Outros.

**Regra:** o compartilhamento **não é obrigatório**, mas gera acréscimo quando realizado. O crédito é liberado nos dois caminhos:
- ao confirmar o compartilhamento prometido, **ou**
- ao marcar **"Não vou compartilhar desta vez"** — *"Confirma a entrega sem o acréscimo e libera o crédito do mesmo jeito."*

**Nota na tela:** *"Quando você leva a faixa para fora da plataforma, o acréscimo entra na sua remuneração e o artista aparece na home."* · *"Diga onde a faixa vai circular. A equipe confere o registro antes de liberar o acréscimo."*

### 14.3 · Outras formas de divulgação

**Campo:** especificar (rádio, podcast etc.) quando a opção "Outros" for escolhida.

### 14.4 · Remuneração por classe

**Exibe a composição do valor:**
- Classe atual do curador
- **Piso** conforme o prazo de 72h, com o percentual correspondente
- **Acréscimos** por opcionais cumpridos, com rótulo, descrição e valor de cada um
- **Teto** da classe
- **"Você recebe"** — valor final
- Resumo: faixa · serviço · compartilhamento

| Classe | Piso · atraso | Piso · no prazo | Teto |
|---|---|---|---|
| Ouro | 45% | 50% | 62% |
| Prata | 40% | 43% | 55% |
| Bronze | 30% | 38% | 50% |

**Ação:** **"Concluir e liberar crédito"** — *"O crédito entra no seu financeiro assim que a entrega é confirmada. O artista recebe a devolutiva na hora."*

### Critérios de aceite

- [ ] Dá notas objetivas com escuta medida.
- [ ] Escreve feedback ≥150 caracteres.
- [ ] Escolhe o compartilhamento.
- [ ] Vê a remuneração conforme classe / prazo / opcionais.
- [ ] Crédito é liberado ao concluir + compartilhar.

**Cenários do Guia de Testes R2:**

- [ ] **Notas objetivas** — o player mede a escuta; as notas aceitam casas decimais; justificar rende acréscimo na remuneração.
- [ ] **Nota subjetiva e feedback** — o feedback é obrigatório, com mínimo de caracteres para o acréscimo.
- [ ] **Compartilhamento** — não é obrigatório; compartilhar dá acréscimo; o crédito libera ao confirmar (compartilhando ou não).
- [ ] **Remuneração por classe** — a escala por classe (Bronze/Prata/Ouro) aparece com os acréscimos; concluir libera o crédito.

### Notificações

- Feedback concluído → **avisa o artista**.
- Crédito liberado → **Financeiro do curador**.

### Impactos em outros módulos

- Alimenta o **relatório por IA** (6 e 2).
- Remuneração → **Financeiro do curador (15)** e **da plataforma (22)**.
- Notas → **Métricas / ranking / calibração (16)**.
- Compartilhamento → **Homepage** (seção Artistas compartilhados).

### Regras

- Remuneração escalonada por classe: **Ouro 45/50→62% · Prata 40/43→55% · Bronze 30/38→50%**.
- Sem resposta em 7 dias → crédito devolvido ao artista.
- Para ganhar o acréscimo, o curador precisa responder os **11 itens totais**.
- Todas as notas aceitam casas decimais.
- ⚠️ O board registra que *"o crédito só é liberado após o compartilhamento confirmado — a plataforma precisa monitorar (pendência técnica, conecta com Antifraude 23)"*, o que **conflita** com a regra do protótipo de liberar o crédito nos dois caminhos. Ver [pendência 3](07-pendencias-e-divergencias.md).

---

## 15. Financeiro do Curador

**Release 4 · 2,5h · Origem: board (alterado na V4)**

### Objetivo

O curador acompanha ganhos, entende a composição da remuneração (classe + prazo + acréscimos) e solicita saque — conversão de Claves em reais para transferência.

### Telas

| # | Tela |
|---|---|
| 15 | Financeiro (remuneração por classe) |
| 15.1 | Solicitação de saque |

### 15 · Financeiro

**Exibe:**
- Saldo disponível
- Ganhos no período
- **Classe atual e % correspondente**
- **Extrato por curadoria:** música · base · acréscimos (quais opcionais) · penalidade de prazo · líquido

**Ações:** filtrar período · exportar extrato · solicitar saque → 15.1.
**Estados:** saldo zero · abaixo do mínimo para saque.

> O extrato por curadoria vive **dentro** da tela 15 — não é tela separada no fluxo.

### 15.1 · Solicitação de saque

**Exibe:** valor · dados de recebimento (PIX / conta) · confirmação.
**Validações:** valor ≤ saldo · valor ≥ mínimo · dados bancários válidos.
**Estados:** em processamento · pago · recusado.

### Critérios de aceite

- [ ] Curador entende como cada curadoria virou dinheiro (base + acréscimos − penalidade).
- [ ] Saque só libera o valor efetivamente disponível.
- [ ] Créditos devolvidos (7 dias) não aparecem como ganho.

### Notificações

- Saque solicitado / processado / pago.
- Crédito liberado após a avaliação.

### Impactos em outros módulos

- Puxa a remuneração das **avaliações (14)** e a **classe (16)**.
- O saque é processado (payout) no **Financeiro da plataforma (22)**.

### Regras

- Piso por classe/prazo (72h) + acréscimos por opcionais até o teto da classe.
- Feedback após 72h → o acumulado chega **no máximo a 50%**.
- 7 dias sem resposta → crédito devolvido ao artista; **não entra no saldo**.
- `1 Clave = R$ 10`; a plataforma retém 50%.
- Dados bancários validados antes de habilitar o saque.

---

## 16. Métricas de Performance

**Release 3 · 2,5h · Origem: board (ampliado na V4)**

### Objetivo

Dar ao curador visibilidade da performance — ranking, calibração, prazo e compartilhamento — e do caminho de evolução de classe.

### Telas

| # | Tela |
|---|---|
| 16 | Métricas de performance |
| 16.1 | Progressão Prata → Ouro |

### 16 · Métricas de performance

**Topo:** classe atual (selo) · posição no ranking · ganhos (atalho para o Financeiro 15).

**Os 4 componentes do ranking, com peso visível:**

| Componente | Peso |
|---|---|
| Média das notas dos artistas | 0,25 |
| % de feedbacks no prazo (72h) | 0,33 |
| Calibração (desvio) + faixa | 0,27 |
| % de compartilhamentos | 0,15 |

**Histórico:** evolução por período (gráfico) · distribuição das notas por faixa.
**Ações:** filtrar período · abrir detalhe → 16.1.
**Estados:** "Dados insuficientes" (curador novo).

### 16.1 · Progressão Prata → Ouro

**Exibe:** classe atual + meta (Ouro) · score composto + evolução por ciclo.

**Checklist de elegibilidade:**
- Volume: curadorias (ex.: 42/60)
- Tempo: ciclos em Prata (ex.: 1/2)
- Score ≥0,85 sustentado
- Zero penalidades

**Comunicação obrigatória:** a evolução para Ouro é **por convite**, mas existem critérios em avaliação (o checklist).

**Status:** "Em progressão" · "Elegível — em avaliação" · "Não elegível" · aviso de rebaixamento.

### Critérios de aceite

- [ ] Usuário visualiza classe, ranking e os 4 componentes.
- [ ] Usuário entende a calibração e como melhorar.
- [ ] Usuário Prata acompanha o progresso rumo a Ouro.
- [ ] Fica claro que Ouro depende do convite do admin.

### Notificações

- Elegível a Ouro → avisado (em avaliação).
- Promoção / rebaixamento → aviso.

### Impactos em outros módulos

- Puxa dados das **avaliações (14)**.
- Elegibilidade **dispara o dossiê (20.4)**.
- Classe alimenta o selo na **Seleção (4)** e no **perfil (17)**.
- Classe **define a remuneração (15)**.

### Regras

Ver [§4 Ranking e calibração](01-regras-de-negocio.md#4-ranking-e-calibração) e [§2.1 Progressão](01-regras-de-negocio.md#21-progressão-prata--ouro).

- ⚠️ Conferir os pesos do ranking: tabela × diagrama divergem (V4 pág. 13).
- Ouro **não é automático** — passa por decisão do admin.
- Bronze→Prata é por credenciais, não por performance — ⚠️ confirmar com o cliente.
- Thresholds configuráveis.
- **Empty states** são críticos: no beta, todo curador começa "sem dados".

---

## 17. Conta e Configurações

**Release 1 · 2h · Origem: board + protótipo R2 (Curador)**

### Objetivo

Permitir ao curador gerenciar perfil, dados da conta (inclusive bancários), preferências e segurança.

### Telas

| # | Tela |
|---|---|
| 17 | Conta |
| 17.1 | Perfil |
| 17.2 | Dados da conta |
| 17.3 | Preferências |
| 17.4 | Segurança |

### 17.1 · Perfil

**Campos:** Foto · Bio · Gêneros · **Credenciais (somente leitura)**.
**Ações:** upload/trocar foto · Salvar.
**Regra:** a **classe aparece somente em leitura**. A edição de mídias e serviços fica em 12.6.

### 17.2 · Dados da conta

**Campos:** E-mail da conta · **Dados de recebimento** (chave Pix / conta bancária, com CPF).
**Exibe:** a chave cadastrada e seu status (ex.: "Verificada").
**Nota:** *"As Claves ganhas nas leituras viram repasse nesta chave."*
**Ações:** alterar e-mail (com senha atual e confirmação no novo endereço) · cadastrar/editar dados bancários · **validar dados bancários** · atalho "Ver financeiro".

### 17.3 · Preferências

**Campos:** notificações (toggles por evento) · idioma da interface.
**Comportamento:** salvo automaticamente.
**Nota:** *"Vale para a interface. A faixa e o contexto chegam no idioma do artista."*

### 17.4 · Segurança

Idêntico ao artista: alterar senha com reautenticação, painel de **sessões ativas** e exclusão de conta em 2 passos com exportação LGPD e apagamento em 30 dias.

### Critérios de aceite

- [ ] Edita perfil e dados da conta.
- [ ] Cadastra/edita dados bancários válidos.
- [ ] Ajusta preferências e segurança.

### Notificações

- Confirmação ao alterar dados sensíveis.

### Impactos em outros módulos

- Preferências → **Notificações (18)**.
- Dados bancários → **Financeiro do curador (15)**.

### Regras

- Alterar e-mail/senha exige reautenticação.
- Excluir conta segue LGPD.
- Dados bancários **validados antes de habilitar o saque**.

---

## 18. Notificações

**Release 5 · 2h · Origem: board (alterado na V4)**

### Objetivo

Centralizar os avisos do curador e levá-lo direto à ação. Mesma estrutura de tela do artista (10) — muda o catálogo de eventos.

**Canais:** in-app + e-mail.

### Telas

| # | Tela |
|---|---|
| 18 | Central de notificações |
| 18.1 | Detalhe (com os novos gatilhos) |
| 18.2 | Preferências |

### 18 · Central

**Eventos exibidos:**
- Nova música na fila · prazo se aproximando (72h)
- Crédito liberado · avaliação recebida do artista
- Saque processado / pago
- **Mudança de classe** (promoção / rebaixamento)
- **Elegível a Ouro — em avaliação do admin**
- **Cadastro em análise** e aprovação (gatilhos da V4)
- Denúncia / penalidade aplicada

**Ações:** marcar como lida · filtrar por tipo · abrir detalhe → 18.1.
**Estados:** sem notificações (empty) · não lidas em destaque.

### 18.1 · Detalhe

**Exibe:** conteúdo completo · data/hora · contexto. Para eventos de classe: **motivo, score/critério envolvido e o que muda** (ex.: remuneração).
**Ações — ir para a origem:** Métricas → 16 · Fila → 13 · Financeiro → 15.
**Estados:** lida · não lida.

### 18.2 · Preferências

Por evento, canais in-app / e-mail (on/off).
**Validação:** eventos críticos — **prazo, penalidade e rebaixamento** — não são desativáveis.

### Critérios de aceite

- [ ] Curador vê seus eventos; abrir o Detalhe leva à origem certa.
- [ ] Novos gatilhos de classe (promoção / rebaixamento / Ouro) chegam com contexto.
- [ ] Prazo (72h) avisa antes de vencer; penalidade sempre notifica.

### Notificações

É o próprio módulo — consome eventos e exibe.

### Impactos em outros módulos

Consome eventos de **fila (13)**, **avaliações (14)**, **financeiro (15 e 22 — payouts)**, **métricas (16)**, **gestão (20)** e **moderação (23)**.

### Regras

- Eventos críticos (prazo 72h, penalidade, rebaixamento) **não são desativáveis**.
- O aviso de prazo dispara **antes** de vencer as 72h.
