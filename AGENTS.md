# AGENTS.md — Instruções para o agente de IA

Este arquivo é **curto de propósito**. A especificação vive em [`docs/`](docs/) e é a fonte única; aqui ficam só o contexto do produto, os ponteiros e as proibições.

---

## Contexto do produto

**Dissona** é uma plataforma web marketplace que conecta artistas musicais independentes a curadores profissionais para avaliação estruturada e paga de músicas. O artista submete uma música (link ou mp3), compra Claves (moeda interna), seleciona curadores e recebe feedback metódico com notas objetivas, nota subjetiva e texto escrito. A IA sintetiza os feedbacks em relatórios por música e por artista ao longo do tempo. O curador é remunerado por qualidade e pontualidade (classes Bronze/Prata/Ouro, com escalonamento de pagamento conforme prazo de 72h e itens opcionais preenchidos). O admin gerencia usuários, classes, finanças (rateio 50% plataforma/curador), moderação e payouts. A homepage pública exibe artistas compartilhados, destaques e ranking de curadores, com CTA para cadastro. O produto prioriza confiança bilateral: o artista recebe crítica confiável guiada por método; o curador recebe pagamento claro e reconhecimento (ranking, calibração, selo de classe).

---

## Onde está cada coisa

| Preciso de… | Vá para |
|---|---|
| **Stack, pastas, camadas, convenções, deploy** | [`docs/architecture.md`](docs/architecture.md) |
| **O quê** — 24 módulos, 5 releases, personas, fluxos | [`docs/PRD.md`](docs/PRD.md) + [`docs/prd/`](docs/prd/) |
| **Escopo em execução** — checklist até a R2 | [`docs/BACKLOG.md`](docs/BACKLOG.md) |
| **Em que ordem** — tasks e dependências | [`docs/implementation-plan.md`](docs/implementation-plan.md) |
| **Schema físico, RLS, RPCs, ordem das migrations** | [`docs/data-model.md`](docs/data-model.md) |
| **Critérios de aceite** (RF/RNF, Given/When/Then) | [`docs/requirements.md`](docs/requirements.md) |
| **Tokens, componentes, acessibilidade** | [`docs/design-system.md`](docs/design-system.md) |
| **Regras de negócio transversais** (Claves, classes, remuneração, SLA) | [`docs/prd/01-regras-de-negocio.md`](docs/prd/01-regras-de-negocio.md) |
| **Matriz de notificações** — é o seed de `evento_notificacao` | [`docs/prd/06-matriz-notificacoes.md`](docs/prd/06-matriz-notificacoes.md) |
| **O que ainda não foi decidido** — e o que trava qual release | [`docs/open-questions.md`](docs/open-questions.md) |
| **Perguntas prontas para enviar ao cliente** | [`docs/R2/perguntas-ao-cliente.md`](docs/R2/perguntas-ao-cliente.md) |
| **Como ler o protótipo** — ele é markup, não imagem | `pnpm prototipo`, e [`scripts/extrair-prototipo.mjs`](scripts/extrair-prototipo.mjs) |
| **Imagens e ícones do protótipo** — logotipo e favicon, embutidos no manifest de assets | `pnpm prototipo:imagens`, e [`scripts/extrair-imagens-prototipo.mjs`](scripts/extrair-imagens-prototipo.mjs) |
| **A fonte (Inter)** — os 7 woff2 e as regras `@font-face`, também embutidos | `pnpm prototipo:fontes`, e [`scripts/extrair-fontes-prototipo.mjs`](scripts/extrair-fontes-prototipo.mjs) |
| **Paridade visual com o protótipo** — abre as duas telas e compara a tipografia | [`e2e/prototipo/`](e2e/prototipo/) e [`e2e/apoio/prototipo.ts`](e2e/apoio/prototipo.ts) |
| **Evidência de RLS por migration** | [`supabase/testes/README.md`](supabase/testes/README.md) |
| **Qual teste prova qual critério de aceite** | [`docs/R2/matriz-rf-e2e.md`](docs/R2/matriz-rf-e2e.md) — gerada, nunca editada à mão (`pnpm rastreabilidade`) |

**Precedência de fontes:** protótipo da R2 > board de discovery > derivação. Quando divergirem, siga o protótipo e registre a divergência em [`docs/prd/07-pendencias-e-divergencias.md`](docs/prd/07-pendencias-e-divergencias.md).

---

## Como rodar

Pré-requisitos, scripts e o fluxo de banco estão no [`README.md`](README.md). Resumo: Node 24, pnpm 11, `pnpm install`, `pnpm dev`.

---

## Proibições

Estas já estão implícitas na arquitetura, mas ficam explícitas porque são os erros mais fáceis de cometer:

- **Sem Tailwind.** CSS Modules + custom properties. Os tokens do Design System foram extraídos dos protótipos como valores literais e não devem passar por uma camada de tradução.
- **Sem backend separado.** Monolito modular em Next.js — Server Components e Server Actions. Não crie `apps/api`, Express ou Fastify.
- **Monorepo de dois apps e um pacote, e só isso.** `apps/web` (público, artista, curador), `apps/admin` (painel, `painel.dissona.com.br`) e `packages/nucleo` (código comum). Não crie outro app nem outro pacote sem decisão de produto. **Server actions só nos apps** — o pacote não tem `'use server'`, `redirect` nem `revalidatePath`. Ver [arquitetura §3](docs/architecture.md).
- **Sem Prisma, Drizzle ou qualquer ORM.** Migrations em SQL versionado pelo Supabase CLI; tipos gerados em `packages/nucleo/lib/supabase/tipos-bd.ts`, **nunca escritos à mão**.
- **Sem S3, sem Redis, sem broker.** Supabase Storage; `pg_cron` agenda e Edge Functions executam.
- **Sem `any`.** TypeScript `strict`.
- **Sem número de negócio hardcoded.** Thresholds, prazos, pisos e tetos vêm da tabela `configuracao`.
- **Sem float para dinheiro.** `bigint` em centavos; só `lib/dinheiro.ts` formata.
- **Sem `insert` direto** em `lancamento_clave`, `ganho_curador` ou `notificacao` — só por RPC `security definer` e por `registrar_notificacao()`.
- **Sem DDL fora de migration versionada.** Escreva o `.sql` em `supabase/migrations/` **primeiro**, aplique pelo MCP (`apply_migration`) e renomeie o arquivo com a versão que `list_migrations` devolver. O que é aplicado tem de ser byte a byte o que está no arquivo, nomes de policy incluídos — ver [arquitetura §2.4](docs/architecture.md).
- **Sem criar tabela de release futura.** A numeração `0001`–`0010` está amarrada à release; nada de R3+ antecipado.
- **Sem "Submissões"** na interface — o termo é **"Envios"**.
- **Sem recriar imagem ou ícone.** O protótipo embute os assets — logotipo, favicon — e traz os ícones como SVG inline no markup. Extraia (`pnpm prototipo:imagens`) ou copie o `<path>`; não redesenhe em CSS nem deduza a arte.
- **Sem spec de e2e sem tag de RF.** Todo teste novo nasce com `{ tag: ['@RF-0NN'] }`, e a tag é do requisito que ele **prova** — não do módulo em que esbarra, nem no `describe` inteiro por conveniência. É o que alimenta [`docs/R2/matriz-rf-e2e.md`](docs/R2/matriz-rf-e2e.md), e o CI recusa RF de R1/R2 sem prova. Requisito que não deve ter e2e vira exceção com motivo escrito em `scripts/matriz-rastreabilidade.mjs`.
- **Sem formulário sem superfície de erro geral.** Toda tela com `useActionState` mostra alguma coisa quando a ação falha e nenhum campo foi pintado — `erroGeralDe()` em [`src/textos/erros.ts`](src/textos/erros.ts) é o atalho. `falha(codigo, campo)` grava `campo` e `falhaDeCampos()` grava `campos`; quem lê só um dos dois engole o outro, e o resultado é um botão que não faz nada. **Falha sem mensagem é bug, não detalhe** — e lint não alcança isso, só a revisão.
- **Sem chave de serviço no navegador.** `SUPABASE_SERVICE_ROLE_KEY` vive só no processo do Node da suíte, via [`e2e/apoio/banco.ts`](e2e/apoio/banco.ts) — nunca em `page.evaluate`, `addInitScript` ou `fill()`. E toda mutação dali recebe **id**, jamais predicado aberto: o banco também serve produção.

## Convenções que importam

- **Idioma:** domínio em **português** (`avaliacao`, `saldo_carteira`, `calcularRemuneracao`); termos de framework em inglês (`useState`, `middleware`). Banco em `snake_case` singular.
- **Camadas:** `app/` → `modulos/*/acoes|consultas` → `servico` → `repositorio` → Supabase. Nenhuma camada pula a seguinte, e `servico` não importa nada de React.
- **Erros:** códigos tipados em `lib/erros.ts`; a tradução para texto acontece **na View**, nunca no serviço.
- **Live region por tom:** `Aviso` dá `role="alert"` a `erro` e `alerta`, e `role="status"` a `info` e `sucesso`. No E2E, sucesso se localiza por `getByRole('status')` — `getByRole('alert')` só acha erro.
- **Autorização em três camadas, todas obrigatórias:** RLS no banco, guarda de rota no middleware, checagem no serviço.
- **Admin é app próprio (`apps/admin`):** rotas limpas reais (`/equipe`, `/pacotes`). `ROTA.ADMIN*` do pacote é o caminho **interno**, usado pela guarda (`decidirAcesso`); no painel, `rota()`/`ROTA_PAINEL` (`apps/admin/src/lib/rotas.ts`) dão o endereço real, e o shell compartilhado traduz pelo `ProvedorDeBaseDoAdmin` com base `''`. No E2E, `noAdmin()`/`telaDoAdmin()` de `e2e/apoio/admin.ts`. Ver [arquitetura §3.2](docs/architecture.md).

---

## Definition of Done

Uma task só está concluída quando **todos** os itens de [`architecture.md §10`](docs/architecture.md#10-definition-of-done) passam. Em resumo: `typecheck`, `lint`, `test` e `build` limpos; migration aplicada com policy de RLS testada; estados de loading, erro e vazio; acessibilidade AA; nenhum número de negócio hardcoded; evento de notificação gravado quando o módulo emite algum; e o cenário correspondente do Guia de Testes R2 coberto por E2E, quando houver.

Não marque uma task como pronta sem rodar os comandos. Se algo falhar, diga o que falhou.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
