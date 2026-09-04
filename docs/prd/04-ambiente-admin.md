# 04 — Ambiente Admin

Sete módulos, 17h. Todos web.

← [Voltar ao PRD](../PRD.md) · [Regras de negócio](01-regras-de-negocio.md)

> **User story do ambiente:** *Como administrador, quero moderar, conciliar finanças, pagar curadores e gerir planos e mídia, para manter a plataforma saudável.*

| # | Módulo | Release | Discovery | UI | Total |
|---|---|---|---|---|---|
| [19](#19-autenticação-admin) | Autenticação Admin | R1 | 0,5h | 0,5h | 1h |
| [20](#20-gestão-de-curadores-e-artistas) | Gestão de Curadores e Artistas | R3 | 1,5h | 1h | 2,5h |
| [21](#21-gestão-de-pacotes-de-claves) | Gestão de Pacotes de Claves | R2 | 1h | 1,5h | 2,5h |
| [22](#22-financeiro-da-plataforma) | Financeiro da Plataforma | R5 | 2h | 1,5h | 3,5h |
| [23](#23-moderação-e-antifraude) | Moderação e Antifraude | R3 | 1h | 1h | 2h |
| [24](#24-dashboard-admin) | Dashboard Admin | R4 | 1h | 1h | 2h |
| [27](#27-conta-e-equipe) | Conta e equipe | R1 | 1,5h | 2h | 3,5h |

---

## 19. Autenticação Admin

**Release 1 · 1h · Origem: board + protótipo R2 (Admin)**

### Objetivo

Dar acesso restrito e seguro ao painel administrativo, só a membros autorizados.

> **Correção registrada no discovery:** a entrega anterior trazia "usuário consegue se cadastrar" e login social copiados do fluxo de usuário. **O admin não tem autocadastro nem login social.** Contas de admin nascem por convite em Conta e equipe (27).

### Telas

| # | Tela |
|---|---|
| 19 | Login admin |
| 19.1 | Recuperação de senha |
| 19.2 | Redefinição de senha |

### 19 · Login admin

**Copy do protótipo:** *"Área administrativa — Acesso restrito. Entre com seu e-mail corporativo."*

**Campos:** E-mail · Senha.
**Ações:** "Entrar" · "Esqueci minha senha" → 19.1 · "Falar com um administrador".
**Rodapé:** *"Contas são criadas por convite."*

**Validações:** só permite e-mails com papel admin · erro genérico de credencial.
**Estados:** loading · credencial inválida · **acesso negado (sem papel admin)** · conta bloqueada.

### 19.1 · Recuperação de senha

**Campo:** e-mail admin.
**Ação:** "Enviar link de recuperação", com **cooldown** para reenvio.
**Resposta neutra:** *"Se este e-mail estiver cadastrado, enviamos um link de recuperação. Por segurança, não confirmamos se a conta existe. O link expira em 60 minutos e vale um único uso."*

### 19.2 · Redefinição de senha

**Campos:** Nova senha (com indicador de força) · Confirmar nova senha.
**Ação:** "Redefinir" → volta ao Login admin.
**Validações:** força · igualdade · token válido e de uso único.
**Estados:** link inválido/expirado → reiniciar recuperação · concluído (*"Encerramos as outras sessões da conta. Entre com a senha nova."*).

### Critérios de aceite

- [ ] Admin autorizado consegue logar.
- [ ] Não é possível criar conta admin pela tela (só por convite/equipe).
- [ ] Admin recupera e redefine a senha via link.
- [ ] Acesso negado a quem não tem papel admin.

### Notificações

- Recuperação de senha → e-mail transacional.
- (Opcional) alerta de login suspeito.

> A notificação "novo cadastro" **não se aplica aqui** — era copiada do fluxo artista/curador.

### Impactos em outros módulos

- Papéis e contas de admin vêm de **Conta e equipe (27)**.
- Dá acesso ao **Dashboard admin (24)** e aos demais módulos admin.

### Regras

- Acesso só para e-mails com papel de admin/equipe, definido em Conta e equipe.
- Sessão com **expiração** e **log de acessos**.
- Token de redefinição expira e é de uso único.
- **Sugerir camada extra de segurança (ex.: 2FA)** — alinhar com dev.

---

## 20. Gestão de Curadores e Artistas

**Release 3 · 2,5h · Origem: board (ampliado na V4)**

### Objetivo

O admin gerencia usuários e conduz o lado administrativo das classes — aprova Prata, decide a promoção a Ouro (dossiê) e faz o rebaixamento.

### Telas

| # | Tela |
|---|---|
| 20 | Listagem de usuários |
| 20.1 | Detalhe do usuário |
| 20.2 | Bloqueio e exclusão |
| 20.3 | Aprovação de curadores (Prata) |
| 20.4 | Dossiê promoção Prata→Ouro + decisão |

### 20 · Listagem de usuários

**Indicadores no topo:** curadores por classe · pendentes de aprovação (Prata) · candidatos a Ouro.
**Tabela:** Nome · tipo · classe · status · data · métricas.
**Ações:** filtrar por tipo/classe/status · busca · abrir detalhes → 20.1 · ações rápidas.

> **Terminologia:** se houver aba de envios, usar **"Envios"**, nunca "Submissões".

### 20.1 · Detalhe do usuário

**Exibe:** cadastro + credenciais (no caso do curador) · classe atual · métricas (ranking, calibração, prazo, compartilhamento) · avaliações recebidas.
**Ações:** bloquear → 20.2 · aprovar Prata → 20.3 · abrir dossiê → 20.4.

### 20.2 · Bloqueio e exclusão

Bloquear (com motivo) / desbloquear · **excluir (LGPD)**.

### 20.3 · Aprovação (Prata)

O "candidato a Prata" vindo do módulo 12.5 cai aqui como "em análise".

**Exibe:** fila de pendentes · credenciais com comprovações e links.
**Ações:** **aprovar com motivo** → vira Prata · **recusar com motivo** → permanece Bronze.

### 20.4 · Dossiê Prata → Ouro

**Dossiê exibe:** score + evolução por ciclo · abertura dos 4 componentes do ranking · **amostra de 3–5 feedbacks** · preço médio + recorrência.
**Decisão:** aprovar → vira Ouro · adiar ou recusar → permanece Prata.
**Rebaixamento:** Ouro com score <0,75 por 2 ciclos → alerta → Prata.

### Critérios de aceite

- [ ] Lista / filtra usuários.
- [ ] Usuário visualiza detalhe completo.
- [ ] Usuário bloqueia/exclui com motivo.
- [ ] Usuário aprova/recusa Prata.
- [ ] Usuário visualiza dossiê e decide sobre Ouro (logado).
- [ ] Usuário rebaixa Ouro→Prata.

### Notificações

- Aprovação / recusa de Prata → **ao curador**.
- Promoção / rebaixamento → **ao curador**.
- Pendente Prata / candidato Ouro → **ao admin**.

### Impactos em outros módulos

- Recebe Prata do **Cadastro (12)**.
- Recebe candidatos a Ouro da **Progressão (16.1)**.
- Classe → selo na **Seleção (4)**, **perfil (17)** e **remuneração (15)**.
- Bloqueio afeta o acesso (**Autenticação**).

### Regras

- **Bronze auto-aprovado · Prata aprovação manual (20.3) · Ouro por convite OU progressão + decisão (20.4).**
- Escala 200→6.000: classificação automática por critérios; o admin decide **apenas** Prata e Ouro.
- **Toda decisão é logada** (governança).
- Bloqueio/exclusão com motivo + LGPD.
- Thresholds configuráveis. ⚠️ Critérios definitivos de classe são pendência do cliente.
- **Antifraude:** exigir credenciais com link/evidência verificável + amostragem na aprovação.
- **Prevenção de gargalo — fila de aprovação:** ações em lote e SLA visível, para a fila não empilhar na escala 200→6.000. Sugestão do cliente: anunciar um **evento de avaliação geral** em data definida.
- **Prevenção de gargalo — limbo Ouro:** dossiê com **limite de adiamentos** / prazo de decisão.
- *"Treinar IA com documentos" foi descartado (R4).*

---

## 21. Gestão de Pacotes de Claves

**Release 2 · 2,5h · Origem: board + protótipo R2 (Admin) + guia de testes**

### Objetivo

Criar e editar os pacotes de Claves — valores e descontos — que o artista compra.

### Telas

| # | Tela |
|---|---|
| 21 | Lista de pacotes |
| 21.1 | Criar / editar pacote |

### 21 · Lista de pacotes

**Copy do protótipo:** *"Base de 1 Clave por R$ 10, com desconto progressivo por volume."*

**Colunas:** Nome · Claves (qtd) · Valor · Desconto · **Por Clave** · **Status** · Ações.
**Ações por linha:** Editar · **Ativar/Desativar** · Excluir.
**Ação principal:** "Novo pacote" → 21.1.
**Nota de rodapé:** *"Só os pacotes ativos aparecem na Carteira do artista. Toda mudança de preço fica registrada em log e entra no Financeiro."*

**Excluir pacote** (modal): *"O pacote sai da Carteira do artista na hora. Compras já feitas continuam válidas e a exclusão fica registrada em log. Se a ideia for só tirar de circulação, desative."*

### 21.1 · Criar / editar pacote

**Campos:** Nome do pacote · Qtd de Claves (com base calculada) · **Desconto (%)** — recalcula o valor · **Valor (R$)** — recalcula o desconto · toggle **Pacote ativo**.

**Cálculo exibido:** preço por Clave · desconto aplicado · **economia do artista**.

**Validações:** valores e percentuais válidos.
**Nota:** *"Ativo aparece na Carteira do artista na hora em que você salva."* · *"A alteração vale para novas compras e fica registrada em log."*

### Critérios de aceite

- [ ] Admin cria e edita pacotes de Claves.
- [ ] Define preço, quantidade e promoções.
- [ ] Ativa ou desativa pacotes disponíveis.

**Cenários do Guia de Testes R2:**

- [ ] **Lista de pacotes** — tabela com Nome, Qtd, Valor, Desconto, Preço/Clave e Status; ações Editar / Ativar-Desativar / Excluir visíveis.
- [ ] **Criar pacote** — o preço por Clave é calculado; validações barram valores/percentuais inválidos; o pacote entra na lista.
- [ ] **Editar / ativar / excluir** — as ações funcionam e refletem na lista; só os pacotes ativos aparecem para o artista.

### Notificações

- (Interno) **log de alteração de pacote/preço**.

### Impactos em outros módulos

- Define os pacotes exibidos em **Comprar Claves (5)**.
- Impacta o **Financeiro da plataforma (22)**.

### Regras

- Base: `1 Clave = R$ 10`; margem da plataforma **50%**.
- Descontos progressivos por volume.
- Alteração de pacote reflete na Carteira do artista.
- Compras já feitas continuam válidas após exclusão do pacote.

---

## 22. Financeiro da Plataforma

**Release 5 · 3,5h · Origem: board (alterado na V4)**

### Objetivo

O admin gere o dinheiro da plataforma — venda de Claves, receita (margem 50%), estornos ao artista, payouts aos curadores e a **separação tributária correta**.

> **A Dissona é um marketplace: tributa só a comissão (margem), não o valor cheio.** A solução é o **split de pagamento no gateway** (ex.: Asaas), separando na origem repasse × tributável.

### Telas

| # | Tela |
|---|---|
| 22 | Visão geral e rateio |
| 22.1 | Relatórios financeiros |
| 22.2 | Estornos |
| 22.3 | Payouts |

### 22 · Visão geral e rateio

**Exibe:**
- Claves vendidas · receita bruta · repasses · receita líquida
- **Claves em circulação** (passivo / crédito não usado)
- **Split por transação:** repasse (curador) × comissão tributável (plataforma)

**Invariante:** `repasse + comissão = valor da transação`.

**Ações:** filtrar período · conciliar · ir para Estornos / Payouts.
**Estados:** pendência de conciliação.

### 22.1 · Relatórios financeiros

**Exibe:** relatórios por ambiente (Admin / Curador / Artista) — base para a contabilidade.
**Ações:** exportar (CSV/PDF) · **fechar caixa do período**.
**Estados:** período aberto · fechado.

### 22.2 · Estornos

**Fila:** transação · artista · curador · motivo · valor.

**Motivos previstos:**
1. **Devolução em 7 dias** → crédito volta ao artista.
2. **Serviço pago não entregue** (insatisfação que gera devolução) → com **justificativa (campo não obrigatório)**.

**Ações:** aprovar / negar estorno · estornar Claves ao artista.
**Validações:** só sobre transações elegíveis · **não estornar feedback já entregue**.
**Estados:** pendente · estornado · negado.

### 22.3 · Payouts

**Fila de saques solicitados:** curador · valor · dados de recebimento.
**Ações:** aprovar / processar **em lote** · marcar como pago.
**Validações:** saque ≤ saldo do curador · split aplicado.
**Estados:** a processar · processando · pago · falha.

### Critérios de aceite

- [ ] Toda transação separa repasse × comissão tributável.
- [ ] Admin processa payouts e fecha o caixa do período.
- [ ] Estornos cobrem serviço não entregue (insatisfação com o serviço não feito) e devolução de 7 dias.
- [ ] Relatórios financeiros exportáveis por ambiente.

### Notificações

- Saque a aprovar · payout pago · estorno concluído · falha de pagamento.

### Impactos em outros módulos

- Recebe compras de Claves (**Dashboard artista / Carteira**).
- Liquida o **Financeiro do curador (15 · saques → payouts)**.
- Estornos conectam ao **compartilhamento (14.2)** e à devolução por prazo.
- Base para os **KPIs do Dashboard Admin (24)**.

### Regras

- `1 Clave = R$ 10`; margem/retenção **50%**.
- Relatórios financeiros para Admin / Curador / Artista.
- Devolução de crédito ao artista após 7 dias sem resposta do curador.
- O rateio/payout ao curador **varia conforme a classe** (Bronze/Prata/Ouro), acompanhando a remuneração escalonada.

---

## 23. Moderação e Antifraude

**Release 3 · 2h · Origem: board**

### Objetivo

Proteger a integridade da plataforma — monitorar comportamento suspeito, tratar denúncias e bloquear manualmente.

**Riscos mapeados:** conta fake de curador · artista manipulando avaliação · avaliações em massa (mitigado pela calibração).

### Telas

| # | Tela |
|---|---|
| 23 | Logs de comportamento |
| 23.1 | Denúncias |
| 23.2 | Bloqueio manual |

### 23 · Logs de comportamento

**Exibe:** ações e padrões suspeitos — logins, avaliações em massa, contas fake, manipulação.
**Indicadores e filtros:** alertas automáticos · contas sinalizadas · filtro por tipo/período/usuário.

### 23.1 · Denúncias

**Fila:** de artistas sobre curadores e vice-versa. Exemplos: *"não ouviu"*, *"escreveu mal"*, *"prometeu compartilhar e não fez"*.

**Informações da denúncia:** quem · alvo · motivo · evidências · contexto.
**Ações:** classificar como **procedente / improcedente** · encaminhar para bloqueio · arquivar.

### 23.2 · Bloqueio manual

Bloquear com **motivo e registro**, definir duração, desbloquear.

### Critérios de aceite

- [ ] Usuário visualiza logs e alertas.
- [ ] Usuário trata denúncias e encaminha ações.
- [ ] Usuário bloqueia com motivo registrado.

### Notificações

- Alerta de comportamento suspeito → **admin**.
- Denúncia recebida → **admin**.
- Bloqueio → **usuário**.

### Impactos em outros módulos

- **Denúncia procedente = penalidade** → afeta a **Progressão (16.1)** e o **dossiê (20.4)**.
- Bloqueio afeta acesso e **Gestão (20)**.
- Conecta com a **verificação de compartilhamento**.

### Regras

- Antifraude: logs, padrões e bloqueios automáticos (definição com dev).
- **A denúncia não penaliza automaticamente.** A penalidade só vale após a denúncia ser julgada **procedente** — protege o curador de artista insatisfeito.
- Bloqueio manual sempre logado, com motivo.
- Auditoria de compartilhamento: **manual (por denúncia) na V1**; automática (Spotify API) na V2.

---

## 24. Dashboard Admin

**Release 4 · 2h · Origem: board**

### Objetivo

Visão da saúde da plataforma num painel — usuários, volume, resumo financeiro e sinais que exigem ação. É a **tela inicial** do ambiente Admin.

### Telas

| # | Tela |
|---|---|
| 24 | KPIs da plataforma |

### 24 · KPIs da plataforma

**Exibe:**
- Nº de artistas · curadores **por classe** (Bronze / Prata / Ouro)
- Envios no período · avaliações concluídas
- Claves vendidas / em circulação · receita (resumo)
- **% de feedbacks no prazo (SLA 72h)** · calibração média
- Denúncias abertas
- **Candidatos a Prata/Ouro aguardando decisão**

**Ações:** filtrar período.
**Atalhos:** Gestão → 20 · Moderação → 23 · Financeiro → 22.

### Critérios de aceite

- [ ] Admin vê de forma rápida os números-chave e o que precisa de ação.
- [ ] Cada indicador crítico tem atalho para o módulo responsável.

### Notificações

- Recebe alertas (candidato a classe, denúncia) **dos módulos de origem**.

### Impactos em outros módulos

- Lê dados de todos os ambientes.
- Atalhos para **Gestão (20)**, **Moderação (23)** e **Financeiro (22)**.

### Regras

- Ações profundas ficam em Gestão (20), Moderação (23) e Financeiro (22) — o dashboard é uma tela só.
- Margem/retenção 50%; `1 Clave = R$ 10`.

---

## 27. Conta e equipe

**Release 1 · 3,5h · Origem: board (módulo novo da V3.1) + protótipo R2 (Admin)**

### Objetivo

Gerenciar a própria conta do admin e a equipe — membros, papéis, permissões e convites. **É aqui que nascem as contas de admin**, por convite — conecta diretamente com a Autenticação Admin (19).

### Telas

| # | Tela |
|---|---|
| 27 | Conta e equipe |
| 27.1 | Dados pessoais / perfil |
| 27.2 | Equipe |
| 27.3 | Convidar membro |
| 27.4 | Papéis e permissões |

### 27.1 · Dados pessoais / perfil

**Campos:** foto · Nome · **Cargo** · E-mail corporativo · segurança (senha).
**Ações:** trocar foto · **Alterar e-mail** · **Alterar senha** · Salvar.
**Nota:** *"Trocar e-mail ou senha pede sua senha atual."* Exibe a data da última alteração de senha.

**Modais de reautenticação:**
- *Alterar senha* — senha atual, nova senha, confirmar. *"Use 8 caracteres ou mais, com pelo menos um número. Ao confirmar, encerramos as outras sessões."*
- *Alterar e-mail* — novo e-mail + senha atual. *"O novo endereço passa a valer depois da confirmação enviada para ele."*

### 27.2 · Equipe

**Tabela:** Membro (iniciais + nome + tag) · E-mail · **Papel** · Status · Ações.
**Ações:** ver/editar membro · **reenviar convite** · ativar/desativar · desativar/remover. O próprio usuário aparece marcado como "Você".
**Nota:** *"Contas administrativas existem só por convite. O acesso começa quando o convite é aceito."*

### 27.3 · Convidar membro

**Campos:** E-mail corporativo · **Papel**.
**Ação:** "Enviar convite" → e-mail.
**Nota:** *"Enviamos um convite por e-mail. O acesso vale a partir do momento em que a pessoa aceita."*

### 27.4 · Papéis e permissões

**Papéis definidos no protótipo:** **Administrador · Moderador · Financeiro · Suporte**.

> O board listava "Administrador, Financeiro, Curadoria…". **O protótipo prevalece.**

**Campos:** por papel, acessos por módulo (toggles), com rótulo e descrição de cada permissão.
**Nota:** *"O papel define o que cada integrante alcança no painel."* · *"Administrador mantém acesso total, inclusive a equipe e papéis."*

### Critérios de aceite

- [ ] Gerencia a própria conta e a equipe.
- [ ] Convida membros e define papéis/permissões.
- [ ] Controla os acessos internos.

### Notificações

- Convite enviado ao novo membro.
- Confirmação de alteração de permissões.

### Impactos em outros módulos

- Papéis definem o acesso aos módulos de Admin.
- Contas logam pela **Autenticação admin (19)**.

### Regras

- Convite por e-mail com papel; o membro **define a senha ao aceitar**.
- Papéis controlam o acesso aos módulos do admin.
- ⚠️ **Papéis e permissões a detalhar com o cliente** — o board registra essa pendência.
