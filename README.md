# Dissona

Plataforma web de marketplace bilateral que conecta artistas independentes a curadores profissionais para **avaliação estruturada e paga** de músicas. O artista compra Claves (moeda interna), envia uma música e seleciona curadores; o curador avalia com notas objetivas por critério, nota subjetiva e feedback escrito, e é remunerado por qualidade e pontualidade.

> **Estado atual: R0 — fundação técnica, em andamento.** A especificação está completa em [`docs/`](docs/); o código está sendo criado agora. Enquanto a R0 não fecha, alguns comandos abaixo ainda não existem. Acompanhe pelo [BACKLOG](docs/BACKLOG.md).

---

## Stack

| Camada | Escolha |
|---|---|
| Runtime | Node.js 24 LTS · pnpm 11 |
| Framework | Next.js 16 — App Router, Server Components, Server Actions, Turbopack |
| Linguagem | TypeScript `strict` |
| Estilo | CSS Modules + custom properties (**sem Tailwind**) |
| Estado de servidor | TanStack Query 5 |
| Formulários e validação | React Hook Form + Zod (schema único cliente/servidor) |
| Banco, auth, storage, jobs | Supabase — Postgres 17, RLS, Auth, Storage, Edge Functions |
| Testes | Vitest 5 (unitário) · Playwright (E2E) |
| Hospedagem | Vercel — Production Branch `main`, funções em `pdx1` |

Arquitetura, camadas e convenções: [`docs/architecture.md`](docs/architecture.md).

---

## Pré-requisitos

- **Node 24** (a versão está em `.nvmrc`)
- **pnpm 11** — `corepack enable && corepack prepare pnpm@11 --activate`
- **Docker Desktop rodando** — necessário só para a stack Supabase local (`supabase start`)

---

## Começando

```bash
pnpm install

# copie e preencha as variáveis de ambiente
cp .env.example .env.local

# stack Supabase local (precisa do Docker)
pnpm supabase start
pnpm db:reset          # reconstrói o banco a partir de supabase/migrations/
pnpm db:tipos          # gera lib/supabase/tipos-bd.ts

pnpm dev               # http://localhost:3000
```

Sem Docker, dá para trabalhar direto contra o projeto Supabase remoto de desenvolvimento com `pnpm db:push`. Atenção: **`supabase db reset --linked` apaga o banco remoto**, que hoje é compartilhado entre Preview e Production ([#25](docs/open-questions.md#25-projetos-dedicados-de-staging-e-produção)).

---

## Scripts

| Comando | O que faz |
|---|---|
| `pnpm dev` | Servidor de desenvolvimento |
| `pnpm build` | Build de produção |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest |
| `pnpm e2e` | Playwright |
| `pnpm db:reset` | Reconstrói o banco local do zero |
| `pnpm db:push` | Aplica as migrations pendentes no projeto linkado |
| `pnpm db:tipos` | Regenera `lib/supabase/tipos-bd.ts` |

**Antes de considerar qualquer task pronta:** `pnpm typecheck && pnpm lint && pnpm test && pnpm build`. A lista completa está na [Definition of Done](docs/architecture.md#10-definition-of-done).

---

## Ambientes

| Ambiente | App | Supabase | Gatilho |
|---|---|---|---|
| Local | `pnpm dev` | Supabase CLI local | — |
| Preview | Vercel Preview | projeto `dissona` | push em branch / PR |
| Produção | Vercel Production | projeto `dissona` — provisório | merge em `main` |

Segredos ficam nas env vars da Vercel, por escopo. `.env.local` e `.mcp.json` estão no `.gitignore` — **nunca** comite nenhum dos dois.

---

## Documentação

| Documento | Papel |
|---|---|
| [PRD](docs/PRD.md) | O **quê** — 24 módulos, V1 completa, 5 releases |
| [prd/01–07](docs/prd/) | Regras de negócio e detalhamento por ambiente (artista, curador, admin, público) |
| [architecture](docs/architecture.md) | Stack, pastas, camadas, convenções, deploy, Definition of Done |
| [data-model](docs/data-model.md) | Schema físico, enums, RLS, RPCs, ordem das migrations |
| [requirements](docs/requirements.md) | Critérios de aceite (RF/RNF) |
| [implementation-plan](docs/implementation-plan.md) | O **em que ordem** — tasks e dependências |
| [BACKLOG](docs/BACKLOG.md) | O **escopo em execução** — checklist até a R2 |
| [design-system](docs/design-system.md) | Tokens, componentes, acessibilidade |
| [open-questions](docs/open-questions.md) | O que ainda não foi decidido, e o que trava qual release |
| [business-model](docs/business-model.md) | Problema, proposta de valor, receita, custos |

O escopo **em execução** vai até a R2. O PRD especifica a V1 inteira; nada de R3+ é construído adiantado.

Instruções para agentes de IA: [`AGENTS.md`](AGENTS.md).
