# Guia de Testes — Release 2

Extraído de `[Dissona] - Guia de Testes e Validação de Protótipo - Release #2.docx`, que segue sendo o original. Esta versão existe porque **os 16 cenários são o gate da R2** ([BACKLOG](../BACKLOG.md), [plano](../implementation-plan.md)) e, em `.docx`, não eram legíveis por máquina nem diferenciáveis em revisão.

← [BACKLOG](../BACKLOG.md) · [requisitos](../requirements.md) · [perguntas em aberto](../open-questions.md)

---

## Escopo desta rodada

Release 2 — comprar Claves e enviar faixa (Artista), fila e avaliação com notas e feedback (Curador), pacotes de Claves (Admin).

A **Seleção de curadores aparece como placeholder**: entra na R3. É o que o plano cobre com a TASK-215, substituída depois pela TASK-311.

## Os 16 cenários

| # | Ambiente | Cenário | Módulo |
|---|---|---|---|
| A1 | Admin | Lista de pacotes | 21 |
| A2 | Admin | Criar pacote | 21.1 |
| A3 | Admin | Editar / ativar / excluir | 21.1 |
| B1 | Artista | Saldo e resumo | 5 |
| B2 | Artista | Comprar Claves | 5.1 · 5.2 |
| B3 | Artista | Extrato | 5.3 |
| B4 | Artista | Enviar por link | 3 · 3.1 |
| B5 | Artista | Enviar por arquivo | 3 · 3.2 |
| B6 | Artista | Contexto e revisão | 3 |
| B7 | Artista | Confirmação e status | 3 · 3.3 |
| C1 | Curador | Fila de avaliações | 13 |
| C2 | Curador | Iniciar avaliação | 13.1 |
| C3 | Curador | Notas objetivas | 14 |
| C4 | Curador | Nota subjetiva e feedback | 14.1 |
| C5 | Curador | Compartilhamento | 14.2 · 14.3 |
| C6 | Curador | Remuneração por classe | 14.4 |

---

## 4. Ambiente Admin

Pacotes de Claves: criar, editar e ativar os pacotes que o artista compra.

### A1 · Lista de pacotes

**Objetivo:** ver os pacotes cadastrados.

**Passos**
1. Abra Pacotes de Claves.
2. Veja a tabela e o status de cada pacote.

**Resultado esperado**
- Tabela com Nome, Qtd, Valor, Desconto, Preço/Clave e Status.
- Ações Editar / Ativar-Desativar / Excluir visíveis.

### A2 · Criar pacote

**Objetivo:** criar um pacote novo com desconto.

**Passos**
1. Clique em Novo pacote.
2. Preencha nome, qtd, valor e desconto.
3. Salve.

**Resultado esperado**
- O preço por Clave é calculado.
- Validações barram valores/percentuais inválidos.
- O pacote entra na lista.

### A3 · Editar / ativar / excluir

**Objetivo:** gerir um pacote existente.

**Passos**
1. Edite um pacote.
2. Ative/Desative um pacote.
3. Exclua um pacote (com confirmação).

**Resultado esperado**
- As ações funcionam e refletem na lista.
- Só os pacotes ativos aparecem para o artista.

---

## 5. Ambiente Artista

Comprar Claves (Carteira) e enviar faixa para curadoria.

### B1 · Saldo e resumo

**Objetivo:** ver saldo e uso das Claves.

**Passos**
1. Abra a Carteira.

**Resultado esperado**
- Mostra saldo, adquiridas/usadas/devolvidas e as últimas movimentações.

### B2 · Comprar Claves

**Objetivo:** comprar um pacote.

**Passos**
1. Clique em Comprar Claves e escolha um pacote.
2. No checkout, escolha Cartão ou Pix e confirme.
3. Teste os dois resultados (aprovado e recusado).

**Resultado esperado**
- Estados Processando / Aprovado / Recusado aparecem.
- No aprovado, o saldo atualiza; no recusado, nada é cobrado.

### B3 · Extrato

**Objetivo:** conferir o histórico.

**Passos**
1. Abra o Extrato.

**Resultado esperado**
- Lista Claves adquiridas, usadas e devolvidas, com data e origem.

### B4 · Enviar por link

**Objetivo:** enviar colando um link do streaming.

**Passos**
1. Cole um link (Spotify/YouTube).
2. Clique em Detectar faixa.

**Resultado esperado**
- A faixa é detectada (capa e título aparecem).
- Se não detectar, abre o preenchimento manual.

### B5 · Enviar por arquivo

**Objetivo:** enviar por upload.

**Passos**
1. Envie um arquivo (mp3/wav).
2. Preencha os detalhes (título, capa, gênero, data).

**Resultado esperado**
- Aceita o arquivo e segue para o contexto.

### B6 · Contexto e revisão

**Objetivo:** dar contexto e revisar o envio.

**Passos**
1. Escolha o gênero e escreva o que o curador precisa saber.
2. Revise o resumo e clique em Enviar para curadoria.

**Resultado esperado**
- O wizard mostra o progresso (3 passos).
- A revisão traz faixa, gênero e contexto.

### B7 · Confirmação e status

**Objetivo:** concluir e acompanhar.

**Passos**
1. Veja a tela de confirmação.
2. Clique em Acompanhar status.

**Resultado esperado**
- Confirmação "Sua submissão chegou".
- O Status mostra o progresso por curador (Recebeu → Ouviu → Avaliando → Pronto).

> ⚠️ A confirmação do protótipo diz **"Sua submissão chegou"**, mas a terminologia decidida é **"Envios"**, nunca "Submissões" ([PRD §9](../PRD.md), [arquitetura §8](../architecture.md)). Ao implementar, use "Seu envio chegou".

---

## 6. Ambiente Curador

Fila de avaliações e a avaliação completa (notas, feedback e remuneração).

### C1 · Fila de avaliações

**Objetivo:** ver e ordenar as faixas pendentes.

**Passos**
1. Abra a Fila.
2. Ordene/filtre por prazo e status.

**Resultado esperado**
- Tabela com música, prazo (72h) e status.
- Ordenação por prazo (mais urgente primeiro) funciona.

### C2 · Iniciar avaliação

**Objetivo:** abrir um item para avaliar.

**Passos**
1. Abra um item da fila e clique em Iniciar avaliação.

**Resultado esperado**
- Detalhe mostra dados, prazo e serviço contratado.
- Segue para a avaliação (notas + feedback).

### C3 · Notas objetivas

**Objetivo:** dar as notas com escuta medida.

**Passos**
1. Ouça a faixa no player.
2. Dê as notas por critério (até 11 itens, com casa decimal).
3. Escreva as justificativas.

**Resultado esperado**
- O player mede a escuta.
- As notas aceitam casas decimais.
- Justificar rende acréscimo na remuneração.

> O guia diz "até 11 itens", o que confirma a contagem — mas o 11º critério segue sem nome ([#2](../open-questions.md)), e quais 5 são obrigatórios também ([#3](../open-questions.md)).

### C4 · Nota subjetiva e feedback

**Objetivo:** escrever o parecer.

**Passos**
1. Dê a nota subjetiva e escreva o feedback.

**Resultado esperado**
- O feedback é obrigatório (mínimo de caracteres para o acréscimo).

### C5 · Compartilhamento

**Objetivo:** escolher a divulgação.

**Passos**
1. Escolha compartilhar (playlist/post/matéria) ou não.

**Resultado esperado**
- Não é obrigatório; compartilhar dá acréscimo.
- **O crédito libera ao confirmar (compartilhar ou não).**

> A última linha **corrobora o que já está decidido**: o crédito-base libera na confirmação, compartilhando ou não — o PRD já adotou o protótipo nesse ponto. Ela **não** responde a pendência [#8](../open-questions.md), que pergunta outra coisa: se o **acréscimo** por compartilhamento deve ficar retido até a verificação da equipe. Sobre o acréscimo, o guia é silencioso.

### C6 · Remuneração por classe

**Objetivo:** ver a remuneração e concluir.

**Passos**
1. Veja a remuneração por classe e conclua a avaliação.

**Resultado esperado**
- A escala por classe (Bronze/Prata/Ouro) aparece com os acréscimos.
- Concluir libera o crédito.

---

## Como o original registra status

O `.docx` traz, por cenário, as linhas **Status** e **Observações**, com esta legenda:

| Status | Significado |
|---|---|
| OK | Funcionou como esperado. |
| Ressalva | Funcionou, mas com algum problema ou dúvida. |
| Falhou | Não funcionou ou não correspondeu ao esperado. |
| N/A | Não testado / não se aplica. |

Isso é para a validação **manual do protótipo**. No desenvolvimento, cada cenário vira um teste do Playwright em `e2e/`, e o status passa a ser o resultado da suíte.
