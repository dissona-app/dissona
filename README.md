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
| Hospedagem | Cloudflare Workers via OpenNext — um Worker por app, deploy pelo Workers Builds a partir de `main` |

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

# copie e preencha as variáveis de ambiente — um arquivo só, na raiz;
# o postinstall liga apps/*/.env.local a ele
cp .env.example .env.local && pnpm install

pnpm dev               # site (apps/web)    — http://localhost:3000
pnpm dev:admin         # painel (apps/admin) — http://admin.localhost:3001
```

O app sobe sem banco local: as variáveis de `.env.local` apontam para o projeto Supabase de desenvolvimento.

O repositório é um monorepo pnpm: **`apps/web`** (público, artista e curador), **`apps/admin`** (o painel administrativo, `painel.dissona.com.br` em produção) e **`packages/nucleo`** (o código que os dois usam). O painel roda em `admin.localhost`, e não em `localhost`, porque cookie não distingue porta: o `admin.` mantém as sessões dos dois apps separadas, como em produção. O navegador resolve `*.localhost` sozinho. Ver [arquitetura §3](docs/architecture.md).

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
pnpm db:tipos          # regenera packages/nucleo/lib/supabase/tipos-bd.ts
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
| `pnpm db:tipos` | Regenera `packages/nucleo/lib/supabase/tipos-bd.ts` |

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
2. Garanta que `SUPABASE_SERVICE_ROLE_KEY` está em `.env.local`. A suíte
   precisa dela para montar o estado que nenhuma tela monta: adiantar o relógio
   de um envio e chamar as RPCs de SLA, que a migration `0010` **revoga de
   `authenticated`** justamente para que um curador não dispare a devolução da
   própria fila. A chave vive só no processo do Playwright e nunca chega ao
   navegador — a regra está no cabeçalho de
   [`e2e/apoio/banco.ts`](e2e/apoio/banco.ts).
3. Rode [`supabase/testes/dados-e2e.sql`](supabase/testes/dados-e2e.sql) com a
   mesma senha, como o cabeçalho do arquivo explica. Ele cria as contas no
   namespace `@e2e.dissona.local`, o catálogo de pacotes do protótipo e a
   carteira encenada do artista. É idempotente: rodar de novo troca as senhas.

**Antes de cada execução:** `pnpm e2e:semear`. Sete cenários **consomem** a
faixa deles — concluir uma avaliação e devolver por SLA são estados terminais,
e é assim que tem de ser, senão o teste não provaria nada. O script repõe o que
foi consumido, é idempotente e **não pede senha nenhuma**: ele lê o `.env.local`
e entra como a própria persona, chamando a mesma RPC que a tela chama. Sem esse
passo, a falha é sempre a mesma — *"a fila precisa listar …"*.

**Depois:** `pnpm e2e`, que faz o build e sobe o app na porta 3100. Para iterar
sem rebuildar a cada vez, deixe um `pnpm start --port 3100` rodando e use
`BASE_URL=http://localhost:3100 pnpm e2e`.

Resumindo o ciclo do dia a dia:

```sh
pnpm e2e:semear && pnpm e2e
```

### Contra produção

Há um só projeto Supabase e dois Workers (`dissona-web` para `apps/web`,
`dissona-admin` para `apps/admin`) enquanto o produto está em
desenvolvimento, então apontar a suíte para produção não arrisca dado de
ninguém — e prova o que o servidor local **não** prova:

```sh
BASE_URL=https://dissona.com.br BASE_URL_ADMIN=https://painel.dissona.com.br pnpm e2e
```

O áudio da faixa (RF-036) e o anexo de credencial do curador sobem do
navegador **direto ao Storage**, com a Server Action recebendo só o caminho —
`b5-enviar-por-arquivo` e `e3-credenciais-e-bio` são os cenários que o exercitam,
com 6 MB cada. A decisão vem da Vercel (teto de ~4,5 MB de corpo), e continua
certa no Cloudflare: o arquivo não atravessa o Worker.

### Contra o runtime do Cloudflare, local

Prova o que o Node não prova — o `workerd`, com as diferenças de `fetch` e de
streams. Os segredos do runtime vêm de `apps/*/.dev.vars` (gitignored, formato
do `.env.local`):

```sh
(cd apps/web && NEXT_PUBLIC_URL_ADMIN=http://admin.localhost:8788 pnpm build && pnpm exec wrangler dev --port 8787)
(cd apps/admin && NEXT_PUBLIC_URL_SITE=http://localhost:8787 pnpm build && pnpm exec wrangler dev --port 8788 --inspector-port 9230)
BASE_URL=http://localhost:8787 BASE_URL_ADMIN=http://admin.localhost:8788 pnpm e2e
```

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
| Preview | versão do Worker (`*.workers.dev`) | projeto `dissona` | push em branch / PR |
| Produção | Workers `dissona-web` e `dissona-admin` | projeto `dissona` — provisório | merge em `main` |

Segredos ficam no painel de cada Worker (Variables and Secrets). Deploy e domínios: [arquitetura §9](docs/architecture.md). `.env.local` e `.mcp.json` estão no `.gitignore` — **nunca** comite nenhum dos dois.

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
