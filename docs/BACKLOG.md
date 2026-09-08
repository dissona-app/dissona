# Backlog de desenvolvimento — Dissona

**Escopo em execução: até a Release 2.** O [PRD](PRD.md) especifica a V1 inteira (24 módulos, 5 releases); este backlog é o que está sendo construído. Nada de R3+ é feito adiantado.

Derivado do [PRD](PRD.md) e dos documentos de ambiente, do [modelo de dados](data-model.md), dos [requisitos](requirements.md), da [arquitetura](architecture.md) e do [plano de implementação](implementation-plan.md). O número entre parênteses é o módulo/tela do PRD.

← [PRD](PRD.md) · [Perguntas em aberto](open-questions.md) · [Design System](design-system.md)

---

## Bloqueios — resolver antes de codar o módulo afetado

Detalhamento e perguntas objetivas em [open-questions](open-questions.md).

### Travam a R2

- [ ] **Escuta mínima: 60% ou 100% da faixa** — protótipo do curador diz 60%, o do artista promete 100% ([#1](open-questions.md#1-escuta-mínima-60-ou-100-da-faixa)) · afeta 14 e a copy de 1
- [ ] **11º critério de avaliação** — só 10 estão nomeados; falta o item do grupo Produção ([#2](open-questions.md#2-11º-critério-de-avaliação)) · trava o seed de `criterio`
- [ ] **Quais 5 dos 11 critérios são obrigatórios** ([#3](open-questions.md#3-quais-5-dos-11-critérios-são-obrigatórios)) · trava a validação de `enviar_avaliacao`
- [ ] **Tabela de pacotes de Claves** — quantidades, preços e descontos ([#4](open-questions.md#4-tabela-de-pacotes-de-claves)) · trava o seed e os testes de checkout
- [ ] **Base de cálculo da remuneração por classe** — os percentuais incidem sobre o bruto ou sobre os 50%? Ouro no teto (62%) fura a margem declarada ([#5](open-questions.md#5-base-de-cálculo-da-remuneração-por-classe)) · **maior risco de retrabalho**
- [ ] **Modelo de split com o Asaas**, junto do contador do cliente ([#6](open-questions.md#6-modelo-de-split-no-asaas))
- [ ] **Armazenamento do mp3: sempre ou só fora do streaming** ([#7](open-questions.md#7-armazenamento-do-arquivo-de-áudio)) · se o player precisa medir escuta, pode forçar "sempre"
- [ ] **Acréscimo de compartilhamento fica retido até verificação?** — board e protótipo divergem ([#8](open-questions.md#8-liberação-do-crédito-versus-compartilhamento))

### Travam a R1

- [ ] **Disponibilidade da API do SoundCloud** para OAuth — não é provider nativo do Supabase ([#9](open-questions.md#9-api-do-soundcloud-para-oauth))
- [ ] **Provedor de e-mail transacional e domínio de envio** ([#10](open-questions.md#10-provedor-de-e-mail-transacional))
- [x] **Matriz de permissões por papel do admin** ([#11](open-questions.md#11-matriz-de-permissões-do-admin)) — definida pelo protótipo do Admin da R2 e semeada na `0003`
- [ ] **Ativar o 2º papel exige aprovação da curadoria?** ([#12](open-questions.md#12-ativação-do-2º-papel-exige-aprovação))
- [ ] **Confirmar as horas da Release 1** — 16,75h declaradas × 14,75h somadas ([#13](open-questions.md#13-horas-da-release-1))

### Decisão de produto, não bloqueante para começar

- [ ] **Breakpoints e layout mobile** — os protótipos da R2 não têm nenhum `@media` ([#24](open-questions.md#24-breakpoints-e-layout-mobile))

---

## R0 — Fundação técnica

Setup; não consome horas do banco de 74h. Ver [plano · R0](implementation-plan.md#r0--fundação-técnica).

### Repositório e toolchain
- [x] Criar repositório e configurar Next.js App Router com TypeScript `strict`
- [x] Configurar pnpm 11, Node 24 (`.nvmrc` + `engines`) e scripts (`dev`, `build`, `lint`, `typecheck`, `test`, `e2e`)
- [x] Configurar ESLint e Prettier
- [x] Configurar CI com typecheck, lint, testes e build

### Plataforma de dados
Um único projeto Supabase, tratado como desenvolvimento — `dissona` / `fhqcibjzmowcjkdrqyvi` / `us-west-2`. Staging e produção viram [#25](open-questions.md#25-projetos-dedicados-de-staging-e-produção).
- [x] Apontar `.env.local` para o projeto `dissona` — hoje carrega as chaves do projeto `metrya`
- [x] Instalar o Supabase CLI como devDependency
- [x] Configurar o fluxo de migrations — pelo MCP, com o `.sql` versionado como fonte. **A stack local (`supabase start` / `db reset`) ficou fora**: exige Docker, e a decisão foi não usar. O gate "banco reconstruível" passa a ser verificado reaplicando `supabase/migrations/` no projeto de desenvolvimento
- [x] Criar `lib/supabase` (cliente, servidor, middleware) e geração de `tipos-bd.ts`
- [x] Migration `0000_storage` — buckets `faixas`, `capas`, `avatares`, `materiais`, `exportacoes` e policies

### Estrutura da aplicação
- [x] Criar os route groups `(publico)`, `(auth)`, `(app)` e `(admin)`
- [x] Implementar `middleware.ts` de sessão e guarda de papel por route group
- [x] Configurar TanStack Query com providers e política de cache
- [x] Criar `lib/dinheiro.ts`, `claves.ts`, `formato.ts`, `mascaras.ts` e `erros.ts`
- [x] Criar `lib/configuracao` para leitura tipada da tabela `configuracao`

### Design System
- [x] Criar `src/estilos/tokens.css` a partir do [Design System](design-system.md)
- [x] Criar componentes base: `Botao`, `Campo`, `AreaTexto`, `Selecao`, `Grupo`
- [x] Criar componentes base: `Cartao`, `Painel`, `Tabela`, `Etiqueta`, `SeloClasse`
- [x] Criar componentes base: `Modal`, `Gaveta`, `Aviso`, `BarraProgresso`, `EstadoVazio`, `Passos`
- [x] Criar componente `CampoNota` (0–5 com uma casa decimal)
- [x] Criar componente `Player` com medição de escuta confiável (inclusive seek e pausa)
- [x] Criar shell do ambiente autenticado com header, navegação e troca de papel

### Entrega e conformidade
- [x] Criar `.gitignore` **antes** do primeiro commit — `.env*.local` e `.mcp.json` carregam segredo
- [x] Configurar Playwright e estrutura de `e2e` — 16 cenários do guia como `skip`, mais 9 testes da R0
- [ ] Conectar o repositório à Vercel: Production Branch `main`, funções em `pdx1`, Node 24
- [ ] Configurar as env vars da Vercel nos escopos Production e Preview
- [ ] Cadastrar as Redirect URLs de Preview e produção no Supabase Auth
- [x] Criar páginas públicas de Termos de uso e Política de privacidade — estrutura pronta, **texto pendente do jurídico**

---

## R1 — Fundação do produto · 16,75h

### Banco — migrations `0001` a `0005`
- [x] Migration `0000b` — extensões `citext`, `pg_cron` e `pg_net` (infra, fora da faixa por release)
- [x] Migration `0001` — enums base, `perfil`, `papel_usuario`, helpers de RLS (`tem_papel`, `e_admin`), trigger de `atualizado_em`, trigger de criação de perfil em `auth.users` e RLS com 22 asserções em [`supabase/testes/`](../supabase/testes/)
- [x] Migration `0001b` — revogação de `execute` por papel: `revoke from public` não basta no Supabase, ver [`supabase/testes/README.md`](../supabase/testes/README.md)
- [x] Migration `0002` — `perfil_artista`, `perfil_curador`, `credencial_curador`, `midia_curador`, `servico_curador`, mais os helpers `meu_perfil_artista_id`/`meu_perfil_curador_id` e a RPC `ler_contexto_sessao`
- [x] Migration `0003` — `membro_admin`, `convite_admin`, `permissao_admin`, `log_auditoria`, `tem_permissao` e `aceitar_convite_admin`
- [x] Trigger genérico `registrar_auditoria` nas tabelas sensíveis — segredos removidos do rastro, e o `motivo` vindo de `current_setting`
- [x] Migration `0004` — tabela `configuracao` e seed de **32** chaves, com o que o protótipo da R2 decidiu
- [x] Migration `0005` — `notificacao`, `evento_notificacao` (**seed completo: 42 eventos das cinco releases**), `preferencia_notificacao`
- [x] Função `registrar_notificacao`, usada por todos os módulos — nenhum `insert` direto. Revogada até de `authenticated`
- [ ] `servicoNotificacao` no código, com canal in-app e e-mail

### Autenticação (1 / 11)
- [ ] Tela de login com e-mail e senha (1)
- [ ] Login social com Google
- [ ] Login social com Facebook
- [ ] Login social com SoundCloud (OAuth próprio) — *bloqueado por [#9](open-questions.md#9-api-do-soundcloud-para-oauth)*
- [ ] Tela de cadastro com aceite de Termos e LGPD (1.1)
- [ ] Fluxo de verificação de e-mail com link de 24h
- [ ] Tela de recuperação de senha com resposta neutra (1.2)
- [ ] Tela de redefinição de senha com token de 60min e uso único (1.3)
- [ ] Tela de seleção de perfil artista/curador (1.4)
- [ ] Roteamento pós-login por papel e por primeiro acesso
- [ ] Onboarding do artista em 4 passos (1.5)
- [ ] Onboarding do curador em 4 passos (1.5)
- [ ] Onboarding do admin em versão enxuta (1.5)
- [ ] Reabrir o onboarding pelo menu de ajuda ("Rever onboarding")
- [ ] Reautenticação para troca de e-mail e de senha
- [ ] Encerramento das demais sessões ao trocar credencial
- [ ] Notificação de novo cadastro concluído → admin

### Cadastro do curador (12)
- [ ] Wizard de cadastro com 8 passos, progresso e retomada por `passo_cadastro`
- [ ] Identificação com herança de nome e e-mail da conta (12)
- [ ] Modalidades de compartilhamento com validação de link (12.1)
- [ ] Serviços e preços em Claves, com Feedback obrigatório (12.2)
- [ ] Perfil profissional e credenciais (12.3)
- [ ] Classificação automática Bronze / candidato a Prata, com thresholds vindos de `configuracao` (12.4)
- [ ] Tela final Bronze aprovado, com curso de curadoria (12.5)
- [ ] Tela final Prata em análise, com disparo ao admin (12.5)
- [ ] Alteração de cadastro e gestão de mídias, sem alterar a classe (12.6)

### Conta e configurações (7 / 17)
- [ ] Perfil do artista com bio 280, até 3 gêneros e links validados (7.1)
- [ ] Dados da conta do artista e dados de cobrança (7.2)
- [ ] Troca de e-mail com confirmação no novo endereço (7.2)
- [ ] Ativação do papel de curador pelo artista (7.2) — *bloqueado por [#12](open-questions.md#12-ativação-do-2º-papel-exige-aprovação)*
- [ ] Preferências do artista: notificações e idioma, com eventos críticos não desativáveis (7.3)
- [ ] Segurança do artista com painel de sessões ativas (7.4)
- [ ] Fluxo de exclusão de conta em 2 passos, com exportação LGPD em `.zip` (7.4)
- [ ] Perfil do curador com credenciais e classe somente leitura (17.1)
- [ ] Dados de recebimento do curador com validação de chave Pix (17.2)
- [ ] Preferências do curador (17.3)
- [ ] Segurança do curador (17.4)

### Admin (19 / 27)
- [ ] Login admin restrito, sem social e sem autocadastro (19)
- [ ] Recuperação de senha admin com cooldown (19.1)
- [ ] Redefinição de senha admin (19.2)
- [ ] Dados pessoais do membro admin, com reautenticação (27.1)
- [ ] Listagem da equipe com status e ações (27.2)
- [ ] Convite de membro por e-mail com papel (27.3)
- [ ] Aceite de convite e definição de senha
- [ ] Papéis e permissões por módulo (27.4) — *bloqueado por [#11](open-questions.md#11-matriz-de-permissões-do-admin)*

### Gate da R1
- [ ] Conta criada por e-mail e por social, com papel escolhido e roteado
- [ ] Curador Bronze liberado na hora; Prata em análise com admin notificado
- [ ] Admin convida membro, que aceita e entra
- [ ] Toda ação sensível grava em `log_auditoria`
- [ ] Todo evento da R1 grava em `notificacao`

---

## R2 — Núcleo do produto · 14,5h

### Banco — migrations `0006` a `0010`
- [ ] Migration `0006` — `faixa`, `envio`, `servico_envio`
- [ ] Migration `0007` — `pacote_clave`, `pedido_clave`, `evento_provedor`, `lancamento_clave`, view `saldo_carteira`
- [ ] Migration `0008` — `criterio` (seed), `avaliacao`, `nota_criterio`, `compartilhamento`, view `nota_avaliacao` — *bloqueado por [#2](open-questions.md#2-11º-critério-de-avaliação) e [#3](open-questions.md#3-quais-5-dos-11-critérios-são-obrigatórios)*
- [ ] Função `calcular_remuneracao` (piso, acréscimos, teto, penalidade de prazo, líquido e comissão) — *bloqueada por [#5](open-questions.md#5-base-de-cálculo-da-remuneração-por-classe)*
- [ ] Migration `0009` — `ganho_curador` e RPC `enviar_avaliacao`
- [ ] Migration `0010` — RPC `confirmar_selecao_curadores`, `devolver_claves_sem_resposta` e índices da fila

### Envio de música (3)
- [ ] Passo 1 — colar link com autodetecção de metadados (3)
- [ ] Passo 1 — upload de WAV/MP3 até 50 MB, com validação no servidor (3)
- [ ] Detalhes quando o link não retorna dados (3.1)
- [ ] Detalhes do arquivo enviado (3.2)
- [ ] Passo 2 — gênero e campo obrigatório "O que o curador precisa saber?"
- [ ] Passo 3 — revisão do envio, com o aviso sobre saldo e seleção
- [ ] Tela de confirmação do envio
- [ ] **Placeholder da Seleção de curadores** criando os `envio`, para a R2 ser testável fim a fim — a tela real (módulo 4) é da R3

### Carteira e Claves (5)
- [ ] Carteira com saldo disponível, comprometido e devolvido (5)
- [ ] Últimas movimentações na carteira (5)
- [ ] Lista de pacotes ativos com desconto progressivo e preço por Clave (5.1)
- [ ] Checkout com Pix — QR e copia e cola (5.2)
- [ ] Checkout com cartão tokenizado, sem persistir dados do cartão (5.2)
- [ ] Estados de pagamento: processando, aprovado e recusado (5.2)
- [ ] Extrato de Claves com filtro por tipo e estado vazio por filtro (5.3)
- [ ] Bloqueio por saldo insuficiente com alerta e CTA de compra

### Pacotes de Claves — admin (21)
- [ ] Lista de pacotes com preço por Clave e status (21)
- [ ] Criar e editar pacote com recálculo valor ↔ desconto e economia do artista (21.1)
- [ ] Ativar e desativar pacote, refletindo na Carteira do artista
- [ ] Excluir pacote com confirmação, mantendo compras já feitas, com registro em log

### Fila de avaliações (13)
- [ ] Fila com prazo de 72h, status e ordenação por urgência (13)
- [ ] Ordenação por Música, Prazo e Status com `aria-sort` (13)
- [ ] Filtros por status e gênero, com estado vazio por recorte (13)
- [ ] Detalhe do item com serviços contratados, total e contexto do artista (13.1)
- [ ] "Iniciar avaliação" movendo o envio para `avaliando` (13.1)

### Avaliação (14)
- [ ] Player com medição de escuta e trava de envio (14) — *bloqueado por [#1](open-questions.md#1-escuta-mínima-60-ou-100-da-faixa)*
- [ ] Notas objetivas por critério, 0–5 com uma casa decimal (14)
- [ ] Justificativa por critério com contador de 250 caracteres (14)
- [ ] Resumo das notas objetivas com média e contagem por grupo (14)
- [ ] Nota subjetiva com slider de 0,0 a 5,0 (14.1)
- [ ] Feedback escrito obrigatório com contador de 150 caracteres (14.1)
- [ ] Escolha de compartilhamento e opção "Não vou compartilhar desta vez" (14.2)
- [ ] Outras formas de divulgação, com especificação obrigatória (14.3)
- [ ] Resumo da remuneração por classe com composição do valor (14.4)
- [ ] Concluir avaliação e liberar crédito, em transação única (14.4)
- [ ] Salvar e sair em todas as etapas, com retomada pelo `passo_atual`

### Integrações
- [ ] Spotify — metadados de faixa por link
- [ ] YouTube — metadados de faixa por link
- [ ] Asaas — cobrança Pix
- [ ] Asaas — cobrança com cartão tokenizado
- [ ] Asaas — webhook idempotente por `id_evento_provedor`
- [ ] Asaas — implementar o modelo de repasse definido (transferência, subcontas ou split diferido) — *bloqueado por [#6](open-questions.md#6-modelo-de-split-no-asaas)*
- [ ] Asaas — criação de subconta do curador no cadastro, guardando a carteira
- [ ] Asaas — webhook de situação de KYC liberando o saque

### Jobs e SLA
- [ ] Job `avisar_prazo_72h` — aviso antes de vencer, evento crítico
- [ ] Job `devolver_claves_sem_resposta` — devolve a Clave, tira a faixa da fila, lança no extrato e notifica
- [ ] Garantir que crédito devolvido **não** entra como ganho do curador
- [ ] Estados do envio `Recebeu → Ouviu → Avaliando → Pronto` gravados para o Status de envio (3.3, R3)

### Gate da R2
- [ ] Os **16 cenários do [Guia de Testes da Release 2](R2/guia-de-testes-r2.md)** passam em E2E — os arquivos existem em `e2e/`, hoje como `skip`
- [ ] Compra de Claves credita uma única vez sob webhook duplicado
- [ ] Avaliação concluída gera ganho com o percentual correto por classe e prazo
- [ ] Devolução de 7 dias aparece no extrato e remove a faixa da fila
- [ ] `repasse + comissão = valor da transação` em toda transação

---

## Transversais — qualidade e conformidade

### Testes
- [ ] Testes unitários do cálculo de remuneração por classe (piso, acréscimos, teto, penalidade)
- [ ] Testes unitários do saldo derivado de `lancamento_clave`
- [ ] Testes unitários dos schemas Zod
- [ ] Testes de RLS tabela por tabela
- [ ] Teste de idempotência do webhook de pagamento
- [ ] E2E dos 16 cenários do Guia de Testes da Release 2

### Interface
- [ ] Revisão de empty states em todas as listas — no beta tudo começa sem dados
- [ ] Códigos de erro tipados, com tradução na camada de View
- [ ] Revisão de acessibilidade: anel de foco, contraste AA, `aria-sort`, alvo de toque, foco preso em modal com ESC e clique-fora
- [ ] Suporte a pt-BR, es e en na interface

### Conformidade e governança
- [ ] Job `expurgar_contas_excluidas` (LGPD, 30 dias)
- [ ] Auditoria de thresholds: nenhum número de negócio hardcoded — tudo vem de `configuracao`
- [ ] Conferir que todo evento de R1 e R2 grava em `notificacao` (a central de leitura chega na R5)
- [ ] Usar **"Envios"**, nunca "Submissões", na interface do admin
