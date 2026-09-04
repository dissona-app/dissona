# Plano de implementação — Dissona

Sequenciamento técnico das releases: objetivo, tasks, dependências e critérios de pronto.

← [PRD](PRD.md) · [Arquitetura](architecture.md) · [Modelo de dados](data-model.md) · [Backlog](BACKLOG.md)

---

## Como este documento se relaciona com os outros

| Documento | Papel |
|---|---|
| **[PRD](PRD.md)** | O **quê** — 24 módulos, V1 completa, 5 releases |
| **[requirements](requirements.md)** | Critérios de aceite por requisito |
| **Este plano** | O **em que ordem** — dependências técnicas entre releases |
| **[BACKLOG](BACKLOG.md)** | O **escopo em execução** — checklist até a R2 |

O escopo do PRD é a V1 inteira. O escopo **em execução** vai só até a R2. As releases 3 a 5 estão aqui em nível de task para que as decisões de R1 e R2 sejam tomadas sabendo o que vem depois — não para serem construídas antes da hora.

---

## Premissas

- Stack decidida: **Next.js (App Router) + TypeScript strict + Supabase + Vercel**. Ver [arquitetura §2](architecture.md#2-stack) e [§9](architecture.md#9-ambientes-e-deploy).
- **Um projeto Supabase**, em desenvolvimento, servindo Preview e Production da Vercel. Staging e produção dedicados são [#25](open-questions.md#25-projetos-dedicados-de-staging-e-produção).
- Migrations numeradas por release; **nenhuma tabela de R3+ criada antes da sua release**. Uma exceção decidida: `notificacao` sai da R5 para a R1 (migration `0005`).
- Banco de horas: **74h** de V1 (38h discovery + 36h UI). Qualquer ampliação exige nova recarga.
- Ordem de trabalho dentro de cada release: **migration → serviço/RPC → Server Action → tela → E2E**.

---

## Mapa de dependências

```
R0 Fundação técnica
 └─ R1 Fundação do produto  (auth, cadastro do curador, conta, equipe admin)
     └─ R2 Núcleo           (envio, Claves, fila, avaliação, pacotes)
         ├─ R3 Descoberta   (seleção, status, métricas, gestão, moderação)
         │   └─ R4 Dashboards e relatórios
         └─────── R5 Vitrine pública e fechamento
```

**Dependências que atravessam release:**

| Item de release anterior | Existe por causa de | Consequência se ignorado |
|---|---|---|
| `notificacao` na R1 | Centrais de leitura na R5 | Reabrir dez módulos entregues para retroagir eventos |
| `envio` modelado na R2 | Seleção de curadores na R3 | Refazer a fila e o modelo de prazo |
| `lancamento_clave` com tipo `estorno` | Estornos na R5 | Migrar histórico financeiro |
| `compartilhamento` com `url` e `verificado_em` | Homepage na R5 | Perder o dado de origem da vitrine |
| `configuracao` na R1 | Thresholds pendentes do cliente | Deploy a cada decisão de negócio |

---

## R0 — Fundação técnica

**Objetivo:** repositório, banco, shell autenticado e componentes base prontos, de modo que a R1 seja só produto.

Não consome horas do banco de 74h — é custo de setup.

### TASK-000 · Repositório e toolchain
`pnpm` 11 + Node 24 · Next.js App Router · TypeScript `strict` · ESLint + Prettier · scripts `dev`, `build`, `lint`, `typecheck`, `test`, `e2e`.
**Pronto:** repositório versionado, scripts funcionando, CI executando typecheck, lint e testes.

### TASK-001 · Projeto Supabase e migrations
Projeto `dissona` (desenvolvimento) · Supabase CLI como devDependency · `.env.local` apontando para o projeto certo · fluxo local de migration · geração de `lib/supabase/tipos-bd.ts`.
**Depende de:** TASK-000
**Pronto:** `supabase db reset` reconstrói o banco do zero a partir de `supabase/migrations/`; tipos gerados entram no typecheck.

### TASK-002 · Route groups e guarda de sessão
`(publico)`, `(auth)`, `(app)`, `(admin)` · `middleware.ts` renovando sessão e aplicando a guarda de papel · `lib/supabase/{cliente,servidor,middleware}.ts`.
**Depende de:** TASK-001
**Pronto:** rota de cada grupo redireciona corretamente sem papel, com papel errado e sem sessão.

### TASK-003 · Bibliotecas de domínio
`lib/dinheiro.ts` (centavos) · `lib/claves.ts` · `lib/formato.ts` · `lib/mascaras.ts` · `lib/erros.ts` · `lib/configuracao`.
**Depende de:** TASK-001
**Pronto:** cada função com teste unitário; nenhuma conversão de dinheiro fora de `dinheiro.ts`.

### TASK-004 · Tokens e componentes base
`estilos/tokens.css` a partir do [Design System](design-system.md) · `Botao`, `Campo`, `AreaTexto`, `Selecao`, `Grupo`, `Cartao`, `Painel`, `Tabela`, `Etiqueta`, `SeloClasse`, `Modal`, `Gaveta`, `Aviso`, `BarraProgresso`, `EstadoVazio`, `Passos`.
**Depende de:** TASK-000
**Pronto:** todos com estados de foco, erro e desabilitado; contraste AA conferido.

### TASK-005 · Componentes especializados
`CampoNota` (0–5, uma casa decimal) · `Player` com medição de escuta.
**Depende de:** TASK-004
**Pronto:** `Player` reporta percentual ouvido de forma confiável, inclusive com seek e pausa.

### TASK-006 · Shell autenticado
Header, navegação por ambiente, troca de papel artista ↔ curador, menu de ajuda com "Rever onboarding".
**Depende de:** TASK-002, TASK-004

### TASK-007 · Storage e políticas
Buckets `faixas`, `capas`, `avatares`, `materiais`, `exportacoes` com policies.
**Depende de:** TASK-001

### TASK-008 · E2E, deploy e páginas legais
Playwright configurado · CI no GitHub Actions · deploy na Vercel com `main` = produção e Preview por branch · env vars por escopo · Termos de uso e Política de privacidade.
**Depende de:** TASK-000

**Gate da R0:** `pnpm typecheck && pnpm lint && pnpm test && pnpm build` verde no CI; banco reconstruível a partir de `supabase/migrations/`; shell navegável com sessão real no Preview da Vercel.

---

## R1 — Fundação do produto · 16,75h

**Objetivo:** qualquer pessoa cria conta, entra, escolhe o papel, completa o cadastro de curador quando for o caso, e o admin gerencia a própria equipe.

### Banco
| Task | Conteúdo | Depende de |
|---|---|---|
| TASK-101 | Migration `0001` — enums, `perfil`, `papel_usuario`, helpers de RLS | TASK-001 |
| TASK-102 | Migration `0002` — perfis de artista e curador, credenciais, mídias, serviços | TASK-101 |
| TASK-103 | Migration `0003` — `membro_admin`, `convite_admin`, `permissao_admin`, `log_auditoria`, trigger `registrar_auditoria` | TASK-101 |
| TASK-104 | Migration `0004` — `configuracao` + seed dos thresholds | TASK-101 |
| TASK-105 | Migration `0005` — `notificacao`, `evento_notificacao` (**seed completo, todas as releases**), `preferencia_notificacao`, função `registrar_notificacao` | TASK-101 |
| TASK-106 | `servicoNotificacao` no código — canais in-app e e-mail | TASK-105 |

### Autenticação (módulos 1 / 11)
| Task | Conteúdo | Depende de |
|---|---|---|
| TASK-110 | Login e-mail/senha | TASK-101, TASK-002 |
| TASK-111 | Login social Google e Facebook | TASK-110 |
| TASK-112 | Login social SoundCloud (OAuth próprio) | TASK-110 · ⚠️ bloqueio |
| TASK-113 | Cadastro com aceite de Termos e LGPD | TASK-110 |
| TASK-114 | Verificação de e-mail (24h) | TASK-113, TASK-106 |
| TASK-115 | Recuperação e redefinição de senha (60min, uso único) | TASK-113, TASK-106 |
| TASK-116 | Seleção de perfil e roteamento pós-login | TASK-113 |
| TASK-117 | Onboarding de artista, curador e admin | TASK-116 |
| TASK-118 | Reautenticação e encerramento das demais sessões | TASK-110 |

### Cadastro do curador (módulo 12)
| Task | Conteúdo | Depende de |
|---|---|---|
| TASK-120 | Wizard de 8 passos com progresso e retomada (`passo_cadastro`) | TASK-102, TASK-116 |
| TASK-121 | Identificação com herança de nome e e-mail | TASK-120 |
| TASK-122 | Modalidades com validação de link | TASK-120 |
| TASK-123 | Serviços e preços em Claves | TASK-120, TASK-003 |
| TASK-124 | Perfil profissional e credenciais | TASK-120 |
| TASK-125 | Classificação automática Bronze / candidato a Prata | TASK-124, TASK-104 |
| TASK-126 | Telas finais por classe + notificação ao admin | TASK-125, TASK-106 |
| TASK-127 | Alteração de cadastro e mídias (12.6) | TASK-122, TASK-123 |

### Conta e configurações (módulos 7 / 17)
| Task | Conteúdo | Depende de |
|---|---|---|
| TASK-130 | Perfil do artista (bio 280, até 3 gêneros, links) | TASK-102 |
| TASK-131 | Dados da conta e cobrança do artista | TASK-130 |
| TASK-132 | Ativação do papel de curador | TASK-131, TASK-120 · ⚠️ bloqueio |
| TASK-133 | Preferências: notificações e idioma | TASK-105 |
| TASK-134 | Segurança: senha, sessões ativas | TASK-118 |
| TASK-135 | Exclusão de conta em 2 passos + exportação LGPD | TASK-134, TASK-007 |
| TASK-136 | Perfil do curador (credenciais em leitura) | TASK-102 |
| TASK-137 | Dados de recebimento com validação de chave Pix | TASK-136 |
| TASK-138 | Preferências e segurança do curador | TASK-133, TASK-134 |

### Admin (módulos 19 / 27)
| Task | Conteúdo | Depende de |
|---|---|---|
| TASK-140 | Login admin restrito | TASK-103, TASK-002 |
| TASK-141 | Recuperação e redefinição de senha admin com cooldown | TASK-140, TASK-106 |
| TASK-142 | Dados pessoais do membro | TASK-140 |
| TASK-143 | Listagem da equipe | TASK-140 |
| TASK-144 | Convite por e-mail com papel | TASK-143, TASK-106 |
| TASK-145 | Aceite de convite e definição de senha | TASK-144 |
| TASK-146 | Papéis e permissões por módulo | TASK-143 · ⚠️ bloqueio |

**Gate da R1:** conta criada por e-mail e por social · papel escolhido e roteado · curador Bronze liberado na hora e Prata em análise com admin notificado · admin convida membro que aceita e entra · toda ação sensível gravando em `log_auditoria` · todo evento da R1 gravando em `notificacao`.

---

## R2 — Núcleo do produto · 14,5h

**Objetivo:** fechar o ciclo econômico — o artista compra Claves e envia música, o curador avalia e é remunerado.

### Banco
| Task | Conteúdo | Depende de |
|---|---|---|
| TASK-201 | Migration `0006` — `faixa`, `envio`, `servico_envio` | TASK-102 |
| TASK-202 | Migration `0007` — `pacote_clave`, `pedido_clave`, `evento_provedor`, `lancamento_clave`, view `saldo_carteira` | TASK-201 |
| TASK-203 | Migration `0008` — `criterio` (seed), `avaliacao`, `nota_criterio`, `compartilhamento`, view `nota_avaliacao` | TASK-201 · ⚠️ bloqueio: 11º critério |
| TASK-204 | Função `calcular_remuneracao` | TASK-104 |
| TASK-205 | Migration `0009` — `ganho_curador` e RPC `enviar_avaliacao` | TASK-203, TASK-204 |
| TASK-206 | Migration `0010` — RPC `confirmar_selecao_curadores`, `devolver_claves_sem_resposta`, índices da fila | TASK-202 |

### Envio de música (módulo 3)
| Task | Conteúdo | Depende de |
|---|---|---|
| TASK-210 | Passo 1 — link com autodetecção de metadados | TASK-201, TASK-260 |
| TASK-211 | Passo 1 — upload WAV/MP3 até 50 MB, validado no servidor | TASK-201, TASK-007 |
| TASK-212 | Detalhes manuais (3.1 e 3.2) | TASK-210, TASK-211 |
| TASK-213 | Passo 2 — gênero e contexto para o curador | TASK-212 |
| TASK-214 | Passo 3 — revisão e confirmação | TASK-213 |
| TASK-215 | **Placeholder de seleção** criando os envios, para a R2 ser testável fim a fim | TASK-206 |

### Carteira e Claves (módulo 5)
| Task | Conteúdo | Depende de |
|---|---|---|
| TASK-220 | Carteira: disponível, comprometido, devolvido, últimas movimentações | TASK-202 |
| TASK-221 | Lista de pacotes ativos com desconto progressivo | TASK-202, TASK-230 |
| TASK-222 | Checkout Pix — QR e copia e cola | TASK-221, TASK-261 |
| TASK-223 | Checkout cartão tokenizado | TASK-221, TASK-262 |
| TASK-224 | Estados de pagamento e crédito por webhook | TASK-263 |
| TASK-225 | Extrato com filtro por tipo | TASK-202 |

### Pacotes de Claves — admin (módulo 21)
| Task | Conteúdo | Depende de |
|---|---|---|
| TASK-230 | Lista com preço por Clave e status | TASK-202, TASK-140 |
| TASK-231 | Criar e editar com recálculo valor ↔ desconto | TASK-230 |
| TASK-232 | Ativar, desativar e excluir com log | TASK-230, TASK-103 |

### Fila e avaliação (módulos 13 e 14)
| Task | Conteúdo | Depende de |
|---|---|---|
| TASK-240 | Fila com prazo, status e ordenação por urgência | TASK-206 |
| TASK-241 | Filtros por status e gênero | TASK-240 |
| TASK-242 | Detalhe do item com serviços e contexto | TASK-240 |
| TASK-243 | Player com escuta medida e trava de envio | TASK-005, TASK-203 · ⚠️ bloqueio |
| TASK-244 | Notas objetivas com justificativa e resumo por grupo | TASK-243 |
| TASK-245 | Nota subjetiva e feedback obrigatório | TASK-244 |
| TASK-246 | Compartilhamento e "não vou compartilhar" | TASK-245, TASK-122 |
| TASK-247 | Remuneração por classe com composição do valor | TASK-204 |
| TASK-248 | Concluir e liberar crédito | TASK-205 |
| TASK-249 | Salvar e sair em todas as etapas | TASK-243 |

### Integrações e jobs
| Task | Conteúdo | Depende de |
|---|---|---|
| TASK-260 | Spotify e YouTube — metadados por link | TASK-000 |
| TASK-261 | Asaas — cobrança Pix | TASK-202 · ⚠️ bloqueio |
| TASK-262 | Asaas — cobrança com cartão tokenizado | TASK-261 |
| TASK-263 | Asaas — webhook idempotente por `id_evento_provedor` | TASK-202 |
| TASK-264 | Asaas — modelo de repasse definido (transferência, subcontas ou split diferido) | ⚠️ bloqueio |
| TASK-265 | Asaas — subconta do curador e webhook de KYC | TASK-264, TASK-137 |
| TASK-266 | Job `avisar_prazo_72h` | TASK-206, TASK-106 |
| TASK-267 | Job `devolver_claves_sem_resposta` | TASK-206 |

**Gate da R2:** os **16 cenários do [Guia de Testes da Release 2](R2/guia-de-testes-r2.md)** passam em E2E · compra de Claves credita uma única vez sob webhook duplicado · avaliação concluída gera ganho com o percentual correto por classe e prazo · devolução de 7 dias volta ao extrato e tira a faixa da fila · nenhum número de negócio fora de `configuracao`.

---

## R3 — Descoberta e curadoria · 14h

**Objetivo:** o artista escolhe curadores de verdade e acompanha o envio; o curador vê a própria performance; o admin governa classes e moderação.

| Task | Conteúdo |
|---|---|
| TASK-301 | Migrations `0011+` — `metrica_curador`, `ciclo_curador`, `dossie_ouro`, `decisao_classe`, `denuncia`, `penalidade`, `bloqueio` |
| TASK-310 | Seleção de curadores: busca, filtros com matching de gênero, card com classe e ranking |
| TASK-311 | Carrinho de seleção, total em Claves × saldo e confirmação — **substitui o placeholder TASK-215** |
| TASK-312 | Detalhe do curador |
| TASK-320 | Status de envio com barras por curador |
| TASK-330 | Métricas de performance com os 4 componentes e pesos |
| TASK-331 | Progressão Prata → Ouro com checklist e disparo automático do dossiê |
| TASK-332 | Job `recalcular_metricas_curador` |
| TASK-340 | Gestão de usuários: listagem, detalhe, bloqueio e exclusão |
| TASK-341 | Aprovação de Prata com ações em lote |
| TASK-342 | Dossiê Ouro, decisão e rebaixamento — sempre logados |
| TASK-350 | Moderação: logs, denúncias com julgamento, bloqueio manual |

⚠️ Bloqueios de R3: pesos do ranking (tabela × diagrama), critérios definitivos de classe, definição de "ciclo", tipos e gravidade de penalidade.

---

## R4 — Dashboards e relatórios · 14h

| Task | Conteúdo |
|---|---|
| TASK-401 | Migrations — `relatorio_ia`, `avaliacao_curador`, `material_materia`, `saque` |
| TASK-410 | Dashboard do artista |
| TASK-411 | Relatório geral do artista (IA) com filtro de período e PDF |
| TASK-420 | Catálogo, detalhe da música e relatório da música (IA) — mínimo de metade dos curadores |
| TASK-421 | Análise do curador e avaliação sigilosa do curador |
| TASK-422 | Envio de material para matéria |
| TASK-430 | Financeiro do curador: extrato por curadoria e solicitação de saque |
| TASK-440 | Dashboard admin com KPIs e atalhos |

⚠️ Bloqueios de R4: modelo/API de LLM, critério quantitativo de "histórico suficiente", conteúdo e seções do relatório.

---

## R5 — Vitrine pública e fechamento · 14,75h

| Task | Conteúdo |
|---|---|
| TASK-501 | Migrations — `estorno`, `fechamento_caixa`, `destaque_home`, `banner_midia` |
| TASK-510 | Centrais de notificação do artista e do curador + preferências |
| TASK-520 | Financeiro da plataforma: rateio, relatórios, fechamento de caixa |
| TASK-521 | Estornos |
| TASK-522 | Payouts em lote |
| TASK-530 | Homepage pública: hero, compartilhados, destaques, ranking, CTA |
| TASK-531 | Detalhe do artista compartilhado e banner dos 100 curadores |

⚠️ Bloqueios de R5: critérios de elegibilidade e motivos de estorno; critérios de aceite da homepage (derivados, a validar); **"Gestão da Homepage & Mídia" não tem módulo nem horas alocadas** — se virar tela, exige recarga de horas.

---

## Transversais — em todas as releases

- Testes unitários de remuneração por classe, saldo derivado do ledger e schemas Zod.
- Testes de RLS tabela por tabela.
- Empty states revisados em toda lista.
- Códigos de erro tipados, traduzidos na View.
- Acessibilidade: foco, contraste, `aria-sort`, alvo de toque.
- Job `expurgar_contas_excluidas` (LGPD, 30 dias).
- Auditoria periódica: nenhum número de negócio hardcoded.
- Conferência de que todo evento de cada release grava em `notificacao`.
- Interface em pt-BR, es e en.
