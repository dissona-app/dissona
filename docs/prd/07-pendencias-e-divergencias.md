# 07 — Pendências e divergências

Tudo o que **não foi decidido** neste PRD, porque a decisão não é do time de produto ou porque as fontes se contradizem. Nenhum item aqui foi resolvido por suposição.

← [Voltar ao PRD](../PRD.md) · [Regras de negócio](01-regras-de-negocio.md)

---

## Parte A — Pendências bloqueantes

Itens em que o produto **se comporta de forma diferente** conforme a resposta. Precisam de decisão antes da implementação do módulo correspondente.

### 1. ⚠️ Escuta mínima: 60% ou 100% da faixa?

| Fonte | O que diz |
|---|---|
| Protótipo **Curador**, tela de avaliação | *"A escuta é medida. A avaliação só é aceita a partir de **60%** da faixa ouvidos."* |
| Protótipo **Artista**, login | *"...100% da faixa ouvida"* |
| Protótipo **Artista**, onboarding | *"O curador ouve do início ao fim antes de escrever qualquer coisa. A escuta é medida: sem ela, não sai devolutiva."* |
| Board V4 | *"player mede tempo mínimo de escuta"* — **sem número** |

**Por que é bloqueante:** as duas telas são da mesma release e a promessa é **visível ao usuário final**. Se o gate real for 60%, a home do artista está prometendo algo que o sistema não exige.

**Impacto:** módulo 14 (regra de aceite da avaliação) e copy do módulo 1 (artista).
**Decisão de:** cliente.

### 2. ⚠️ Pesos do ranking: tabela ou diagrama?

O discovery V4 (pág. 13) traz **duas versões dos pesos** do ranking — uma na tabela e outra no diagrama. O PRD adotou a versão da tabela:

```
Ranking = (média das notas ÷ 5)        × 0,25
        + (feedbacks no prazo ÷ total) × 0,33
        + (calibração: desvio ÷ 2,0)   × 0,27
        + (% de compartilhamentos)     × 0,15
```

**Impacto:** módulos 16 (Métricas), 20.4 (Dossiê), 4 (exibição no card do curador), 24 (calibração média).
**Decisão de:** cliente / time de discovery. **Conferir a fonte original.**

---

## Parte B — Divergências entre board e protótipo

O protótipo da R2 é posterior ao board e foi construído para validação com o cliente. Onde ele decide, o PRD segue o protótipo — mas o registro fica aqui para que a diferença seja consciente.

| # | Tema | Board (V4) | Protótipo R2 | Adotado |
|---|---|---|---|---|
| 3 | **Liberação do crédito** | *"Crédito só é liberado após o compartilhamento confirmado — a plataforma precisa monitorar"* | *"O crédito é liberado nos dois caminhos"* (compartilhando ou declarando que não vai) | **Protótipo** ⚠️ ver nota abaixo |
| 4 | Formato de envio | mp3 | **WAV e MP3, até 50 MB** | Protótipo |
| 5 | Fluxo de envio | 3 → 3.1/3.2 → 3.3 | **Wizard de 3 passos** + campo novo *"O que o curador precisa saber?"* | Protótipo |
| 6 | Cadastro do curador | 6 telas (12 a 12.5) | **8 passos** | Protótipo |
| 7 | Papéis do admin | "Administrador, Financeiro, Curadoria…" | **Administrador · Moderador · Financeiro · Suporte** | Protótipo |
| 8 | Pacotes de Claves | criar / editar / excluir | acrescenta **status ativo/inativo**, preço por Clave calculado, **log de alteração** e a regra "só ativos aparecem na Carteira" | Protótipo |
| 9 | Estados do saldo | saldo + extrato | acrescenta **"Comprometidas em análise"** e **"Devolvidas por falta de resposta"** | Protótipo |

### Nota sobre a divergência 3

Esta é mais séria do que uma diferença de UI. O board condiciona a liberação do crédito ao compartilhamento **confirmado e monitorado** (conectando explicitamente com o módulo 23 de antifraude). O protótipo libera o crédito na conclusão da avaliação, em qualquer caminho — o compartilhamento apenas **remunera mais**.

O PRD adotou a regra do protótipo, mas ela **enfraquece o controle antifraude** que o board previa: o curador pode prometer compartilhar, receber o acréscimo e não cumprir, e o único mecanismo de correção é a denúncia posterior (23.1). **Confirmar com o cliente** se o acréscimo por compartilhamento deve ficar retido até verificação.

---

## Parte C — Pendências abertas no board

Itens que o discovery já registrou como não resolvidos.

### 10. Armazenamento do arquivo de áudio

Armazenar o mp3 **sempre**, ou **só quando a música não está no streaming**? (V4 pág. 9–11)
**Impacto:** módulo 3, custo de storage (S3), estrutura de dados da música.
**Decisão de:** cliente + dev.

### 11. Critérios definitivos de classe

Os thresholds de classificação (≥2 credenciais para Prata; ≥60 curadorias, 2 ciclos, score ≥0,85 para Ouro) estão marcados como **configuráveis** e **pendentes de validação** do cliente.
**Impacto:** módulos 12.4, 16.1, 20.3, 20.4.

### 12. Bronze → Prata é por credenciais, não por performance

O board registra: *"Bronze→Prata é por credenciais (não performance) — confirmar com o cliente."* Isso significa que um curador Bronze com desempenho excelente **não sobe de classe** enquanto não apresentar credenciais.
**Impacto:** módulo 16.1 (o que o Bronze vê como caminho de evolução).

### 13. Política mínima de senha ✅ *resolvida pelo protótipo*

O board deixou "a definir com dev". O protótipo definiu: **8 caracteres ou mais, com pelo menos 1 número**. Token de recuperação: 60 minutos, uso único. Verificação de e-mail: 24 horas.
**Status:** resolvida — mas **confirmar com dev** se atende à política de segurança.

### 14. Papéis e permissões do admin

O board registra: *"Módulo novo (V3.1). Papéis e permissões a detalhar com o cliente."* O protótipo nomeou quatro papéis, mas **não definiu a matriz de permissões por módulo**.
**Impacto:** módulo 27.4.

### 15. Monitoramento do compartilhamento prometido

Pendência técnica. Na V1 a auditoria é **manual, por denúncia**. A auditoria automática via **Spotify API** só entra na V2.
**Impacto:** módulos 14.2, 23. Relacionado à divergência 3.

### 16. Detecção de salvamentos da playlist do curador

Depende de integração com o Spotify (ou equivalente). O número de salvamentos aparece no card do curador (módulo 4) e no cadastro (12.1) — **sem a integração, o dado não existe**.
**Impacto:** módulos 4, 12.1.

### 17. Ativação do 2º papel "depende de aprovação da curadoria"

O protótipo do artista, em Conta › Dados da conta, diz: *"Ativar papel de curador — os papéis se acumulam... **Depende de aprovação da curadoria**."*

Esse fluxo de aprovação **não está descrito no board**. O board diz apenas que o 2º papel é ativado em Conta e configurações e leva ao Cadastro de curador (12) — onde a classificação Bronze é automática.

**Pergunta:** ativar o papel de curador leva ao fluxo normal do módulo 12 (com Bronze auto-aprovado), ou existe uma aprovação adicional?
**Impacto:** módulos 7.2, 12.

### 18. Homepage pública sem critérios de aceite

Os blocos "Critérios de aceite", "Notificações" e "Impactos em outros módulos" do módulo 26 estão **vazios no board**, assim como a "User story" do ambiente público. Os critérios em [05 — Ambiente Público](05-ambiente-publico.md) foram **derivados** das funcionalidades e precisam de validação.
**Impacto:** módulo 26 (8h, a maior peça isolada da R5).

### 19. "Gestão da Homepage & Mídia" não tem módulo

O user flow do admin inclui o passo **"Gestão da Homepage & Mídia"**, e o módulo 26 prevê **venda de mídia** no banner dos 100 curadores. Mas **não existe módulo de gestão de homepage no escopo da V1** — nem horas alocadas.

**Pergunta:** quem cadastra os destaques, a matéria e o banner? É trabalho manual/banco, ou precisa de tela?
**Impacto:** escopo da R5 — pode ser trabalho não orçado.

---

## Parte D — Restrição de projeto

### 20. Banco de horas

| Item | Valor |
|---|---|
| Escopo total mapeado | **82h** |
| Horas vendidas originalmente | **70h** |
| Saldo previsto no fechamento original | **−12h** |
| Ajuste feito | Planos/Assinatura (4,5h) e Espaço de diálogo (3,5h) adiados para a V2 |
| Banco recarregado para | **74h** — **+4h aprovadas pelo cliente** |

**Consequência:** qualquer ampliação de escopo na V1 — incluindo a resolução da pendência 19 com uma tela nova — exige **nova recarga de horas**.

### 21. Inconsistência na tabela de horas da Release 1

A tabela da Release 1 no board declara **Total 16,75h**, mas a soma das suas linhas dá **14,75h** — diferença de exatamente 2h.

**Causa identificada:** a linha "Autenticação · Artista e Curador · 2h" aparece **uma única vez**, embora o escopo aloque **2h para o ambiente Artista e 2h para o ambiente Curador**. É a única leitura que faz os totais por ambiente fecharem (Artista 26,5h e Curador 22,5h incluem, cada um, 2h de Autenticação) e o total geral dar 74h.

**Adotado neste PRD:** R1 = **16,75h**, com Autenticação listada duas vezes. **Confirmar** que essa é a intenção — se a Autenticação for de fato 2h no total, a V1 tem 72h e não 74h, e sobram 2h no banco.

---

## Parte E — Riscos operacionais mapeados

Não são pendências, são riscos já identificados com mitigação definida. Ficam aqui para acompanhamento.

| Risco | Mitigação definida | Módulo |
|---|---|---|
| **No-show de curador** | Exibir disponibilidade/carga ("responde em ~Xh", "fila cheia"); permitir que o curador sinalize lista de espera | 4, 17 |
| **Confusão ranking × classe** | Separar visualmente + tooltip explicando o que cada um mede | 4, 16 |
| **Fila de aprovação Prata** na escala 200→6.000 | Ações em lote + SLA visível; sugestão do cliente: anunciar um **evento de avaliação geral** em data definida | 20.3 |
| **Limbo do candidato a Ouro** | Dossiê com limite de adiamentos / prazo de decisão | 20.4 |
| **Denúncia retaliatória** | Penalidade só após julgamento procedente | 23.1 |
| **Empty states no lançamento** | No beta tudo começa "sem dados" — tratar explicitamente em Métricas, Dashboard, Catálogo e Homepage | 2, 6, 16, 24, 26 |
| **Conta ou credencial falsa de curador** | Exigir credencial com link/evidência verificável + amostragem na aprovação | 12.3, 20.3 |
| **Avaliações em massa** | Mitigado pela calibração (desvio-padrão penaliza compressão de notas) | 16, 23 |

---

## Estacionamento de ideias

Registradas no discovery, fora do escopo da V1:

- **Pacote Premium de classes** promete feedback em 48h — exigirá recalcular a remuneração por classe quando entrar.
- **Validação automática de compartilhamento** após o feedback do curador (V2). Em primeiro momento, será manual.

---

## Divergências levantadas pela implementação do banco · 2026-09-08

Registradas aqui porque a precedência do [AGENTS.md](../../AGENTS.md) —
**protótipo da R2 > board > derivação** — as resolveu a favor do protótipo, e o
banco já reflete isso. Cada uma tem o detalhe no cabeçalho da migration que a
causou.

| # | O que divergia | Decidido | Onde |
|---|---|---|---|
| 1 | O grupo Produção não tinha item nomeado | Tem **dois**: Mixagem e Arranjo. O board perdeu dois itens, não um | `0008` |
| 2 | Quais cinco critérios são obrigatórios | afinação, ritmo, melodia, personalidade, conexão — **não** um por grupo | `0004` |
| 3 | Escuta mínima 60% × 100% | **60%**; a copy do artista é que muda | `0004` |
| 4 | Semântica de `remuneracao.*` | *(piso, teto na avaliação, teto com compartilhamento)*, e não *(atraso, prazo, teto)*. **RF-066 foi corrigido** | `0004`, `0009` |
| 5 | Penalidade de atraso | −8 pontos no **piso**, mínimo 15. `teto_atraso_percentual` deixou de existir | `0004`, `0009` |
| 6 | `evento_notificacao.destinatario` | `papel[]`, e não escalar: cinco eventos servem artista e curador | `0005` |
| 7 | `log_auditoria.registro_id` | `text`, e não `uuid`: `lancamento_clave.id` é `bigint` | `0003` |
| 8 | Faixa das migrations | `0011` são os jobs de R1+R2; a R3 começa em `0012` | `0011` |

### E uma divergência interna do próprio protótipo

Sobre o **acréscimo por compartilhamento** ([#8](../open-questions.md)), o
protótipo se contradiz: a copy do passo diz *"a equipe confere o registro antes
de liberar o acréscimo"*, mas o cálculo soma os 8 pontos na hora, e o cenário
**C5** do Guia de Testes afirma que *"o crédito é liberado ao confirmar"*.

Adotado o **cálculo**, que é o comportamento observável, com
`configuracao.compartilhamento.acrescimo_retido = false`. O `ganho_curador`
grava o item como `{"chave":"compartilhou","percentual":8,"retido":false}`, para
o histórico continuar interpretável se a decisão virar.

