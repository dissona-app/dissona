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

pnpm dev               # http://localhost:3000
```

O app sobe sem banco local: as variáveis de `.env.local` apontam para o projeto Supabase de desenvolvimento.

### Banco

O caminho padrão é o **MCP do Supabase** — `apply_migration` para aplicar, `list_migrations` e `get_advisors` para conferir, `generate_typescript_types` para os tipos. Não exige Docker nem `supabase login`.

O fluxo de uma migration é sempre:

1. escrever o `.sql` em `supabase/migrations/` — o arquivo é a fonte;
2. aplicar pelo MCP;
3. ler a versão gravada e **renomear o arquivo com ela** (`<timestamp>_<NNNN>_<nome>.sql`).

O passo 3 não é opcional: a CLI deriva a versão do nome do arquivo, e um prefixo fora de sincronia faz reaplicar o que já foi aplicado. Ver [arquitetura §2.4](docs/architecture.md).

Para a stack local, com Docker rodando:

```bash
pnpm supabase start
pnpm db:reset          # reconstrói o banco a partir de supabase/migrations/
pnpm db:tipos          # regenera lib/supabase/tipos-bd.ts
```

⚠️ **`supabase db reset --linked` apaga o banco remoto**, que hoje é compartilhado entre Preview e Production ([#25](docs/open-questions.md#25-projetos-dedicados-de-staging-e-produção)).

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
| `pnpm e2e` | Playwright — sobe o app na porta 3100 |
| `pnpm e2e:navegadores` | Instala o Chromium do Playwright (uma vez) |
| `pnpm db:reset` | Reconstrói o banco local do zero |
| `pnpm db:push` | Aplica as migrations pendentes no projeto linkado |
| `pnpm db:tipos` | Regenera `lib/supabase/tipos-bd.ts` |

**Antes de considerar qualquer task pronta:** `pnpm typecheck && pnpm lint && pnpm test && pnpm build`. A lista completa está na [Definition of Done](docs/architecture.md#10-definition-of-done).

---

## Testes end-to-end

Os 16 cenários do [Guia de Testes da R2](docs/R2/guia-de-testes-r2.md) são o
gate da release. A suíte roda contra o projeto Supabase real — não há mock de
banco — e por isso precisa de contas de teste que existam de verdade.

**Uma vez, para preparar o banco:**

1. Escolha uma senha e ponha em `.env.local` como `E2E_SENHA=...`. O arquivo
   está no `.gitignore`; a senha **não** é versionada, porque seria a
   credencial de uma conta com papel `admin` num projeto que também serve
   produção.
2. Rode [`supabase/testes/dados-e2e.sql`](supabase/testes/dados-e2e.sql) com a
   mesma senha, como o cabeçalho do arquivo explica. Ele cria três contas no
   namespace `@e2e.dissona.local` e o catálogo de pacotes do protótipo. É
   idempotente: rodar de novo só troca as senhas.

**Depois:** `pnpm e2e`, que faz o build e sobe o app na porta 3100. Para iterar
sem rebuildar a cada vez, deixe um `pnpm start --port 3100` rodando e use
`BASE_URL=http://localhost:3100 pnpm e2e`.

O Playwright lê `E2E_SENHA` de `.env.local` por
[`e2e/setup/ambiente.ts`](e2e/setup/ambiente.ts) — o Next carrega esse arquivo
só para o servidor que ele sobe, e o processo do Playwright é outro. No CI a
variável vem do secret do job, e o carregador nunca sobrescreve o que já está
no ambiente.

**Limpeza:** o que a suíte cria durante a execução leva o prefixo `e2e_` no
nome; o rodapé de `dados-e2e.sql` traz o comando de varredura. Não use
`db reset`: o projeto é compartilhado entre Preview, Production e a suíte
([open-questions #25](docs/open-questions.md)).

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
