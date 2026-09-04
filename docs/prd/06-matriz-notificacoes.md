# 06 — Matriz de notificações

Catálogo consolidado dos eventos que geram notificação na V1, cruzando os blocos "Notificações" dos 24 módulos com os catálogos das centrais (módulos 10 e 18).

← [Voltar ao PRD](../PRD.md) · [Regras de negócio](01-regras-de-negocio.md)

---

> **A tabela `notificacao` existe desde a R1** (migration 0005); as centrais de leitura (módulos 10 e 18) chegam na R5. Cada módulo passa a gravar seus eventos a partir da própria release — o que a R5 acrescenta é a interface, não o registro. Por isso o seed de `evento_notificacao` precisa nascer completo, com os eventos de todas as releases.

## Canais e regras gerais

- **Canais:** in-app + e-mail.
- Cada usuário controla os canais por evento em Preferências (10.2 / 17.3 / 18.2).
- **Eventos críticos não são desativáveis:**
  - **Artista:** devolução de crédito.
  - **Curador:** prazo 72h, penalidade, rebaixamento.
- **Abrir a notificação leva sempre à tela de origem.**
- As centrais do artista (10) e do curador (18) têm **a mesma estrutura de tela** — muda só o catálogo de eventos.

---

## Matriz — eventos para o Artista

| Evento | Origem | Canal | Leva para | Crítico |
|---|---|---|---|---|
| Recuperação de senha solicitada | 1.2 | E-mail | Redefinição (1.3) | — |
| Verificação de e-mail no cadastro | 1.1 | E-mail | Verificação | — |
| Confirmação ao alterar e-mail ou senha | 7.2 / 7.4 | E-mail | Conta | — |
| Confirmação de compra de Claves | 5.2 | In-app + e-mail | Carteira (5) | — |
| **Saldo de Claves baixo** ao tentar submeter | 5 / 2 | In-app | Pacotes (5.1) | — |
| Confirmação da seleção + aplicação de Claves | 4 | In-app | Status de envio (3.3) | — |
| Música recebida pelo curador | 3 / 13 | In-app | Status de envio (3.3) | — |
| **Feedback concluído · crédito liberado** | 14 | In-app + e-mail | Análise do curador (6.2) | — |
| Relatório da música disponível | 6.1 | In-app | Detalhe da música (6.1) | — |
| Música compartilhada (playlist / post / matéria) | 14.2 | In-app + e-mail | Análise do curador (6.2) | — |
| Pedido de detalhes para matéria (do curador) | 14.2 → 6.4 | In-app + e-mail | Detalhes/matéria (6.4) | — |
| **Claves devolvidas** — curador não respondeu em 7 dias | SLA / 22.2 | In-app + e-mail | Extrato (5.3) | ✅ |
| Estorno concluído | 22.2 | In-app + e-mail | Extrato (5.3) | ✅ |
| Bloqueio da conta | 23.2 / 20.2 | E-mail | — | ✅ |

---

## Matriz — eventos para o Curador

| Evento | Origem | Canal | Leva para | Crítico |
|---|---|---|---|---|
| Recuperação de senha solicitada | 1.2 | E-mail | Redefinição (1.3) | — |
| Verificação de e-mail no cadastro | 1.1 | E-mail | Verificação | — |
| **Bronze aprovado — boas-vindas** | 12.5 | In-app + e-mail | Painel / curso | — |
| **Cadastro em análise** (candidato a Prata) | 12.5 | In-app + e-mail | Cadastro (12) | — |
| **Aprovação ou recusa de Prata** | 20.3 | In-app + e-mail | Métricas (16) | ✅ |
| Confirmação ao alterar dados sensíveis | 17.2 / 17.4 | E-mail | Conta (17) | — |
| **Nova música na fila** | 4 → 13 | In-app + e-mail | Fila (13) | — |
| **Prazo de 72h se aproximando** | 13 | In-app + e-mail | Fila (13) | ✅ |
| Crédito liberado após a avaliação | 14.4 | In-app | Financeiro (15) | — |
| Avaliação recebida do artista | 6.3 | In-app | Métricas (16) | — |
| Saque solicitado | 15.1 | In-app | Financeiro (15) | — |
| Saque processado | 22.3 | In-app + e-mail | Financeiro (15) | — |
| **Saque pago** | 22.3 | In-app + e-mail | Financeiro (15) | — |
| Falha de pagamento no payout | 22.3 | In-app + e-mail | Financeiro (15) | ✅ |
| **Elegível a Ouro — em avaliação do admin** | 16.1 → 20.4 | In-app + e-mail | Progressão (16.1) | — |
| **Promoção de classe** | 20.4 | In-app + e-mail | Progressão (16.1) | — |
| **Rebaixamento de classe** | 20.4 | In-app + e-mail | Progressão (16.1) | ✅ |
| Denúncia recebida / penalidade aplicada | 23.1 | In-app + e-mail | Métricas (16) | ✅ |
| Bloqueio da conta | 23.2 / 20.2 | E-mail | — | ✅ |

**Conteúdo obrigatório do detalhe (18.1)** para eventos de classe: motivo · score ou critério envolvido · **o que muda** (ex.: percentual de remuneração).

---

## Matriz — eventos para o Admin

| Evento | Origem | Canal | Leva para |
|---|---|---|---|
| **Novo cadastro concluído** (novo usuário na plataforma) | 1.1 | In-app | Gestão (20) |
| **Curador Prata em análise** — aguardando aprovação | 12.5 | In-app + e-mail | Aprovação (20.3) |
| **Candidato a Ouro** — dossiê disponível | 16.1 | In-app + e-mail | Dossiê (20.4) |
| Nova compra de Claves (conciliação) | 5.2 | In-app | Financeiro (22) |
| Alerta de comportamento suspeito | 23 | In-app | Logs (23) |
| **Denúncia recebida** | 23.1 | In-app + e-mail | Denúncias (23.1) |
| Saque a aprovar | 15.1 | In-app | Payouts (22.3) |
| Estorno pendente | 22.2 | In-app | Estornos (22.2) |
| Convite de membro enviado | 27.3 | E-mail (ao convidado) | Aceite do convite |
| Confirmação de alteração de permissões | 27.4 | In-app | Papéis (27.4) |
| Recuperação de senha admin | 19.1 | E-mail | Redefinição (19.2) |
| *(Opcional)* Alerta de login suspeito | 19 | E-mail | — |

> **Não existe** notificação de "novo cadastro admin" — contas de admin nascem por convite, não por autocadastro. O board registra explicitamente que essa notificação foi copiada por engano do fluxo artista/curador em uma entrega anterior.

---

## Eventos por módulo de origem

| Módulo | Emite | Consome |
|---|---|---|
| 1 / 11 Autenticação | Novo cadastro (→admin) · recuperação de senha (→usuário) | — |
| 2 Dashboard do artista | — *(opcional: saldo baixo)* | Sim |
| 3 Enviar música | Música recebida (→artista) · feedback pronto (→artista) | — |
| 4 Seleção de curadores | Confirmação + aplicação de Claves (→artista) · nova música na fila (→cada curador) | — |
| 5 Carteira | Compra confirmada (→artista) · saldo baixo · nova compra (→admin) · Claves devolvidas | — |
| 6 Catálogo + análises | "Feedback concluído" atualiza status · envio de detalhes (→e-mail ao curador) | — |
| 7 Conta e config. (artista) | Confirmação ao alterar dados sensíveis | — |
| **10 Notificações (artista)** | — | 14, 6, 5, 22 |
| 12 Cadastro do curador | Prata (→admin) · Bronze boas-vindas (→curador) | — |
| 13 Fila | Novo envio na fila · alerta de prazo | — |
| 14 Notas + feedback | Feedback concluído (→artista) · crédito liberado (→financeiro do curador) | — |
| 15 Financeiro do curador | Saque solicitado / processado / pago · crédito liberado | — |
| 16 Métricas | Elegível a Ouro · promoção / rebaixamento | — |
| 17 Conta e config. (curador) | Confirmação ao alterar dados sensíveis | — |
| **18 Notificações (curador)** | — | 13, 14, 15/22, 16, 20, 23 |
| 19 Autenticação admin | Recuperação de senha · *(opcional)* login suspeito | — |
| 20 Gestão | Aprovação/recusa de Prata (→curador) · promoção/rebaixamento (→curador) · pendente Prata / candidato Ouro (→admin) | — |
| 21 Pacotes de Claves | *(interno)* log de alteração de pacote/preço | — |
| 22 Financeiro da plataforma | Saque a aprovar · payout pago · estorno concluído · falha de pagamento | — |
| 23 Moderação | Comportamento suspeito (→admin) · denúncia recebida (→admin) · bloqueio (→usuário) | — |
| 24 Dashboard admin | — | Candidato a classe, denúncia |
| 26 Homepage pública | ⚠️ não definido no board | ⚠️ não definido |
| 27 Conta e equipe | Convite enviado · confirmação de alteração de permissões | — |
