# 01 — Regras de negócio

Regras transversais da Dissona, consolidadas do board de Discovery V4, dos protótipos da Release 2 e do Guia de Testes. Cada regra indica sua origem. Conflitos entre fontes estão marcados com ⚠️ e detalhados em [07 — Pendências e divergências](07-pendencias-e-divergencias.md).

← [Voltar ao PRD](../PRD.md)

---

## 1. Claves — a moeda da plataforma

| Regra | Valor | Origem |
|---|---|---|
| Valor unitário | **1 Clave = R$ 10,00** | board |
| Margem / retenção da plataforma | **50%** sobre a Clave consumida | board |
| Pacotes | Desconto progressivo por volume; preço por Clave calculado automaticamente | board + protótipo |
| Visibilidade | **Só pacotes ativos aparecem na Carteira do artista** | protótipo |
| Alteração de pacote | Vale para **novas compras** e fica registrada em **log**; compras já feitas continuam válidas | protótipo |
| Validade do crédito | **O crédito não expira** e vale para qualquer curador da plataforma | protótipo |
| Atualização de saldo | Após pagamento aprovado | board |

### 1.1 Estados do saldo

O protótipo da Carteira separa o saldo em três blocos — **isso não existia no board**:

- **Saldo disponível** — Claves livres para uso, exibidas também em reais.
- **Comprometidas em análise** — Claves aplicadas em envios ainda não avaliados.
- **Devolvidas por falta de resposta** — Claves que voltaram porque o curador não respondeu em 7 dias.

### 1.2 Extrato

Registra Claves **adquiridas, usadas e devolvidas**, com data, origem, tipo, valor e saldo resultante. A devolução por não resposta aparece explicitamente como "devolvida".

---

## 2. Classes de curador

A classe mede **credenciais e nível**, não desempenho. É diferente do ranking (§4).

| Classe | Como se obtém | Aprovação |
|---|---|---|
| **Bronze** | Padrão para quem não comprova ≥2 credenciais | **Automática**, na hora. Recebe o curso de curadoria (opcional) |
| **Prata** | Candidato ao declarar **≥2 credenciais verificáveis com link** | **Manual**, pelo admin (módulo 20.3) |
| **Ouro** | **Nunca é atribuído no cadastro.** Por convite, ou por progressão de desempenho + decisão do admin | **Manual**, com dossiê (módulo 20.4) |

**Regras de apoio:**

- Thresholds de classificação são **configuráveis**.
- Alterar mídias ou serviços **não altera a classe**.
- O link da credencial é **validado antes de salvar**.
- O admin exige credencial com **link/evidência verificável** e faz amostragem na aprovação (antifraude).
- Toda decisão de classe é **logada** (governança).
- Bronze→Prata é por credenciais, não por performance — ⚠️ confirmar com o cliente.

### 2.1 Progressão Prata → Ouro

Elegibilidade cumulativa:

- **≥60 curadorias** concluídas
- **≥2 ciclos consecutivos** em Prata (3 meses cada)
- **Score composto ≥0,85** sustentado
- **Zero penalidades** no período

Ao ficar elegível, o sistema **dispara automaticamente o dossiê** para o admin (20.4). A promoção **não é automática** — o admin aprova, adia ou recusa. A comunicação ao curador deve deixar claro que "a evolução para Ouro é por convite, mas existem critérios em avaliação".

### 2.2 Rebaixamento

Ouro com **score <0,75 por 2 ciclos** → alerta → revisão → possível rebaixamento a Prata.

---

## 3. Remuneração por classe

**Substitui a escala flat de 40–60%** definida em versões anteriores do discovery.

| Classe | Piso · em atraso | Piso · no prazo (72h) | Teto (com opcionais) |
|---|---|---|---|
| **Ouro** | 45% | 50% | **62%** |
| **Prata** | 40% | 43% | **55%** |
| **Bronze** | 30% | 38% | **50%** |

### 3.1 Como o valor é apurado

1. **Piso** — definido pela classe e pelo cumprimento do prazo de 72h.
2. **Acréscimos** — por itens opcionais cumpridos, até o teto da classe:
   - Responder os **11 critérios** (5 obrigatórios + 6 opcionais).
   - Justificativa por item com **≥250 caracteres** — rende **+3%**.
   - Feedback escrito com **≥150 caracteres**.
   - **Compartilhamento** realizado.
3. **Penalidade de prazo** — feedback entregue após 72h faz o acumulado chegar **no máximo a 50%**.
4. **Líquido** — exibido no extrato por curadoria: *música · base · acréscimos (quais opcionais) · penalidade de prazo · líquido*.

### 3.2 Liberação do crédito

O crédito é liberado ao **concluir a avaliação**, tanto quando o curador compartilha quanto quando declara que **não vai compartilhar**. O compartilhamento não é obrigatório — apenas remunera mais.

⚠️ O board registra em um ponto que "o crédito só é liberado após o compartilhamento confirmado", o que **conflita** com a regra acima. Ver pendência 07.

---

## 4. Ranking e calibração

O ranking mede **desempenho contínuo**. É diferente da classe (§2) e os dois devem aparecer separados na interface, com tooltip explicando o que cada um mede — o artista não pode confundir.

### 4.1 Fórmula

```
Ranking = (média das notas ÷ 5)          × 0,25
        + (feedbacks no prazo ÷ total)   × 0,33
        + (calibração: desvio ÷ 2,0)     × 0,27
        + (% de compartilhamentos)       × 0,15
```

⚠️ **Os pesos divergem entre a tabela e o diagrama do discovery (V4 pág. 13).** Os valores acima vêm da tabela. Ver pendência 07.

### 4.2 Calibração

Calibração = **desvio-padrão** das notas dadas pelo curador. Premia quem usa toda a escala; pune quem comprime as notas.

| Faixa | Classificação |
|---|---|
| < 0,5 | Baixa |
| 0,5 – 0,9 | Média |
| 1,0 – 1,5 | Alta |
| > 1,5 | Muito alta |
| **< 0,6** | **Compressão de notas** |

---

## 5. Avaliação — o método

### 5.1 Critérios objetivos

Notas de **0 a 5, com uma casa decimal**. Cinco grupos, num total de **11 itens**:

| Grupo | Itens |
|---|---|
| **Execução técnica** | afinação, ritmo |
| **Composição** | melodia, letra |
| **Identidade** | personalidade, expressividade, originalidade |
| **Impacto** | conexão, memorabilidade |
| **Produção** | — |

- **Cinco critérios são obrigatórios**; responder os **onze** rende acréscimo na remuneração.
- **Justificativa/sugestão por item**: não obrigatória; com **≥250 caracteres** rende **+3%** de remuneração.

### 5.2 Nota subjetiva e feedback

- **Nota subjetiva**: 0 a 5, com casa decimal — "o quanto a faixa te pegou, para além dos critérios".
- **Feedback escrito**: **obrigatório**. Mínimo de **150 caracteres** para garantir o acréscimo.

### 5.3 Escuta medida

O player mede o tempo de escuta antes de aceitar a avaliação.

⚠️ **Contradição não resolvida:** o protótipo do curador informa que *"a avaliação só é aceita a partir de **60%** da faixa ouvidos"*, enquanto o protótipo do artista promete *"**100%** da faixa ouvida"* e *"o curador ouve do início ao fim"*. As duas telas são da mesma release. **Decisão pendente com o cliente.** Ver pendência 07.

### 5.4 Nota final

```
NF = NO + NS
```
Onde NO = notas objetivas e NS = nota subjetiva. A **nota média do artista** é a média das NF de cada música.

### 5.5 Compartilhamento

Modalidades: **Playlist · Post Instagram · Matéria · Outros** (com campo para especificar, ex.: rádio).

- **Não é obrigatório.** Gera acréscimo quando realizado.
- O crédito é liberado nos dois caminhos.
- A equipe **confere o registro antes de liberar o acréscimo**.
- Na V1 a auditoria é **manual, por denúncia**. Auditoria automática via Spotify API fica para a V2.

---

## 6. SLA e ciclo de vida do envio

| Prazo | O que acontece |
|---|---|
| **72 horas** | Prazo para o curador responder com **repasse cheio**. Aviso dispara antes de vencer |
| **Após 72h** | Feedback ainda é aceito, mas o acumulado chega **no máximo a 50%** |
| **7 dias sem resposta** | **Clave devolvida automaticamente ao artista**; a faixa **sai da fila** do curador; a devolução aparece no extrato e gera notificação |

**Estados do envio**, exibidos ao artista em barras por curador/playlist com mudança de cor a cada ação:

```
Recebeu → Ouviu → Avaliando → Pronto
```

---

## 7. Envio de música

| Regra | Definição | Origem |
|---|---|---|
| Unidade | **Uma faixa por envio** | protótipo |
| Formatos | **WAV e MP3, até 50 MB** | protótipo (board dizia só mp3) |
| Origem alternativa | Link do Spotify ou YouTube, com **autodetecção** de capa, título e artista | board + protótipo |
| Fallback | Se a autodetecção falhar, abre preenchimento manual de detalhes | board + protótipo |
| Contexto | Campo **"O que o curador precisa saber?"** — obrigatório no wizard | protótipo (não existia no board) |
| Limite de curadores | **Sem limite por faixa** — o teto é o saldo de Claves | protótipo |
| Momento do débito | As Claves **só saem quando o artista confirma a seleção** de curadores | protótipo |
| Duplicidade | Não permitir selecionar o mesmo curador duas vezes para a mesma música | board |

⚠️ **Pendência do cliente:** armazenar o mp3 sempre, ou só quando a música não está no streaming? (V4 pág. 9–11)

---

## 8. Relatórios gerados por IA

| Relatório | Quando é gerado | Onde aparece |
|---|---|---|
| **Relatório da música** | Somente após **≥ metade dos curadores contratados** enviarem feedback. Antes disso: estado "dados insuficientes" | Detalhe da música (6.1), exportável em PDF |
| **Relatório do artista** (evolução temporal) | Somente com **histórico suficiente**. Antes disso: "dados insuficientes" | Dashboard (2) com prévia, tela própria em 2.1, exportável em PDF |

Conteúdo do relatório do artista: evolução ao longo do tempo, pontos fortes e pontos de atenção recorrentes (ex.: afinação, ritmo), música de melhor e de pior nota no período, com filtro de período.

---

## 9. Segurança e autenticação

Definições vindas majoritariamente do protótipo, que **resolveu a pendência** que o board deixou aberta ("política mínima a definir com dev").

| Regra | Valor | Origem |
|---|---|---|
| Identificador único da conta | **E-mail** | board |
| Política de senha | **8 caracteres ou mais, com pelo menos 1 número** | protótipo |
| Armazenamento | Hash | board |
| Token de redefinição de senha | **60 minutos, uso único** | protótipo |
| Link de verificação de e-mail | **24 horas** | protótipo |
| Erro de login | Mensagem genérica — **não revela** se o problema é o e-mail ou a senha | board |
| Recuperação de senha | Resposta neutra: *"se este e-mail estiver cadastrado, enviamos um link"* — não confirma a existência da conta | board + protótipo |
| Alteração de e-mail ou senha | Exige **reautenticação** (senha atual) | protótipo |
| Efeito da alteração | **Encerra as outras sessões** da conta e avisa por e-mail | protótipo |
| Sessões ativas | Painel com dispositivo, local e último acesso; permite encerrar sessões | protótipo (não existia no board) |
| Troca de e-mail | O novo endereço só passa a valer **após confirmação enviada para ele** | protótipo |
| Admin | Sessão com **expiração** e **log de acessos**. Sugerida camada extra (2FA), a alinhar com dev | board |

### 9.1 Login e papéis

- **Login único** para artista e curador — mesma tela. O papel é escolhido dentro do fluxo (1.4).
- **Login social**: Google, Facebook e SoundCloud (OAuth). Pré-preenchem nome e e-mail; o usuário confirma antes de criar.
- **Papéis são acumuláveis e reversíveis** — não é escolha única. O 2º papel é ativado em Conta e configurações.
- ⚠️ O protótipo acrescenta que a ativação do papel de curador *"depende de aprovação da curadoria"* — fluxo **não descrito** no board. Ver pendência 07.
- **Admin não tem autocadastro nem login social.** Contas de admin nascem por convite em Conta e equipe (27).
- **Onboarding** existe nos três ambientes (admin em versão enxuta). Aparece só no 1º acesso, pode ser pulado e é reabrível pelo menu de ajuda.

---

## 10. LGPD e privacidade

| Regra | Definição | Origem |
|---|---|---|
| Aceite | Termos de uso + Política de privacidade, **obrigatório no cadastro** | board |
| Uso de dados | *"Seus dados servem só para operar a curadoria. Nada de venda de base ou publicidade dirigida."* | protótipo |
| Exportação | Antes de excluir, o usuário **exporta seus dados** em arquivo `.zip` (perfil, faixas enviadas, devolutivas recebidas, histórico de Claves) | protótipo |
| Exclusão | Conta **desativada imediatamente**, apagada em **30 dias**. Reversível nesse prazo entrando de novo | protótipo |
| Confirmação | Exige senha atual **e** digitar `EXCLUIR` | protótipo |
| Retenção | Devolutivas já pagas **permanecem com os curadores** por obrigação contratual | protótipo |
| Exclusão pelo admin | Bloqueio e exclusão com **motivo registrado** | board |

---

## 11. Financeiro da plataforma

- A Dissona é um **marketplace**: tributa **só a comissão (margem)**, não o valor cheio da transação.
- **Solução:** split de pagamento no gateway (ex.: Asaas), separando **na origem** repasse (curador) × comissão tributável (plataforma).
- **Invariante:** `repasse + comissão = valor da transação`.
- **Claves em circulação** são passivo — crédito comprado e ainda não usado.
- **Relatórios financeiros** separados por ambiente: Admin / Curador / Artista, exportáveis em CSV e PDF, com fechamento de caixa por período.
- Emissão de **nota fiscal em cada compra de Claves** (protótipo).

### 11.1 Estornos

Dois motivos previstos:

1. **Devolução por 7 dias sem resposta** → crédito volta ao artista automaticamente.
2. **Serviço pago não entregue** (insatisfação que gera devolução) → com campo de justificativa, **não obrigatório**.

Regras: só sobre transações elegíveis; **não estornar feedback já entregue**. Estados: pendente · estornado · negado.

### 11.2 Payouts

Fila de saques solicitados com curador, valor e dados de recebimento. Aprovação e processamento **em lote**. Validações: saque ≤ saldo do curador; split aplicado; dados bancários validados antes de habilitar o saque. Estados: a processar · processando · pago · falha.

---

## 12. Moderação e antifraude

**Riscos mapeados:** conta fake de curador · artista manipulando avaliação · avaliações em massa (mitigado pela calibração) · credencial falsa · compartilhamento prometido e não cumprido.

| Regra | Definição |
|---|---|
| Logs | Ações e padrões suspeitos, alertas automáticos, contas sinalizadas |
| Denúncias | De artistas sobre curadores e vice-versa. Ex.: "não ouviu", "escreveu mal", "prometeu compartilhar e não fez" |
| **Penalidade** | Só se aplica **após a denúncia ser julgada procedente**. A denúncia **não penaliza automaticamente** — protege o curador de artista insatisfeito |
| Efeito da penalidade | Afeta a progressão de classe (16.1) e o dossiê (20.4) |
| Bloqueio manual | Sempre **logado, com motivo** e duração; permite desbloqueio |

---

## 13. Prevenção de gargalos

Riscos operacionais mapeados no discovery, com a mitigação definida:

| Gargalo | Mitigação |
|---|---|
| **No-show de curador** | Exibir disponibilidade/carga na seleção ("responde em ~Xh", "fila cheia"). Permitir que o curador sinalize **lista de espera** — a decisão fica com ele |
| **Ranking × classe** | Separar visualmente e usar tooltip explicando o que cada um mede |
| **Fila de aprovação Prata** (escala 200→6.000) | Ações **em lote** e SLA visível. Sugestão do cliente: anunciar um **evento de avaliação geral** em data definida |
| **Limbo do candidato a Ouro** | Dossiê com **limite de adiamentos** / prazo de decisão |
| **Denúncia retaliatória** | Penalidade só após julgamento procedente (§12) |
| **Lançamento sem dados** | Tratar bem os **empty states** — no beta, tudo começa "sem dados" |

---

## 14. Glossário

| Termo | Definição |
|---|---|
| **Clave** | Moeda da plataforma. 1 Clave = R$ 10 |
| **NO** | Nota objetiva — média dos critérios avaliados |
| **NS** | Nota subjetiva — nota livre do curador, 0 a 5 |
| **NF** | Nota final = NO + NS |
| **Calibração** | Desvio-padrão das notas do curador; mede uso da escala |
| **Classe** | Bronze / Prata / Ouro — mede credenciais |
| **Ranking** | Score composto — mede desempenho |
| **Ciclo** | Período de 3 meses usado na progressão de classe |
| **Envios** | Termo oficial na interface do admin. **Nunca usar "Submissões"** |
| **Modalidade** | Canal de compartilhamento do curador: playlist, YouTube, Instagram, site, blog, rádio, podcast |
| **Serviço** | O que o curador vende: Feedback (padrão), Playlist, Post, Matéria |
