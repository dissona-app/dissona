# Arquitetura técnica — Dissona

Documento de arquitetura e padrões de projeto. Define a stack, a estrutura de pastas, as camadas, as convenções de código e as integrações externas.

← [PRD](PRD.md) · [Modelo de dados](data-model.md) · [Plano de implementação](implementation-plan.md) · [Design System](design-system.md)

---

## 1. Visão geral

A Dissona é uma plataforma web de marketplace bilateral que conecta artistas independentes a curadores profissionais para avaliação estruturada e paga de músicas. São **quatro ambientes** sobre uma base única de autenticação e dados:

| Ambiente | Acesso | Conteúdo |
|---|---|---|
| **Público** | sem login | Homepage, artistas compartilhados, ranking, CTA de cadastro (R5) |
| **Artista** | papel `artista` | Dashboard, envio, seleção de curadores, carteira, catálogo, relatórios |
| **Curador** | papel `curador` | Cadastro profissional, fila, avaliação, financeiro, métricas |
| **Admin** | papel `admin` | Gestão, financeiro, moderação, pacotes, equipe |

Papéis são **acumuláveis** na mesma conta (artista + curador). O admin é papel à parte, criado apenas por convite.

### 1.1 Decisões estruturantes

| Decisão | Escolha | Por quê |
|---|---|---|
| Aplicação | **Monolito modular** em Next.js (App Router), em **dois apps** — `apps/web` (público, artista, curador) e `apps/admin` (painel) — sobre um pacote comum, `packages/nucleo` | 74h de escopo na V1; separar frontend/backend dobraria a superfície de deploy e de contrato sem ganho. O admin é app próprio por decisão do cliente (2026-10-06): deploy, domínio e sessão separados do produto |
| Autorização | **RLS no PostgreSQL**, não só no código | Marketplace com dinheiro e dados de terceiros; a regra precisa valer também para acesso direto ao banco |
| Dinheiro | **Inteiros em centavos** (`bigint`), nunca ponto flutuante | Rateio de 50%, percentuais por classe e descontos progressivos não toleram erro de arredondamento |
| Saldo de Claves | **Ledger append-only** + view derivada | Estorno, devolução por SLA e conciliação exigem histórico; saldo denormalizado diverge |
| Números de negócio | **Tabela `configuracao`**, nunca hardcoded | Thresholds de classe, pisos/tetos e prazos estão marcados como configuráveis, e vários seguem pendentes |
| Notificações | Gravação desde a **R1**, telas na **R5** | Ver [PRD § Como usar este documento](PRD.md) |

---

## 2. Stack

### 2.1 Aplicação

| Camada | Escolha | Versão |
|---|---|---|
| Runtime | Node.js | 24 LTS |
| Framework | Next.js — App Router, Server Components, Turbopack | 16.3+ |
| Linguagem | TypeScript — `strict: true` | 5+ |
| Gerenciador | pnpm | 11+ |
| Estilo | CSS Modules + custom properties do [Design System](design-system.md) | — |
| Estado de servidor | TanStack Query | 5+ |
| Formulários | React Hook Form + Zod | — |
| Validação | **Zod** — schema único compartilhado cliente/servidor | — |
| Áudio | Web Audio API + `<audio>` — medição de escuta própria | — |
| Testes | Vitest (unitário) · Playwright (E2E) | — |

> **Versões resolvidas na R0:** Next 16.3.4 · React 19.2.8 · TypeScript 5.9 · pnpm 11.5.2 · Vitest 5.

> **Node 24.** O Node 20 saiu de suporte em abril de 2026. A versão fica travada em três lugares que precisam concordar: `.nvmrc`, `engines.node` no `package.json` e o `NODE_VERSION` dos builds no Cloudflare (o runtime dos Workers é o `workerd`, com `nodejs_compat`).

> **Sem Tailwind.** Os tokens do Design System foram extraídos dos protótipos da R2 como valores literais; CSS Modules + custom properties preservam esses valores sem uma camada de tradução no meio.

### 2.2 Plataforma de dados

| Serviço | Uso |
|---|---|
| **Supabase Postgres** | Banco relacional, RLS, funções e RPC |
| **Supabase Auth** | Sessão, e-mail/senha, OAuth Google e Facebook |
| **Supabase Storage** | Faixas, capas, avatares, materiais de matéria, exportações LGPD |
| **Supabase Edge Functions** | Webhooks do gateway, jobs agendados (`pg_cron` dispara, Edge executa) e **um caminho de requisição**: o `userinfo` do provider do SoundCloud, que não podia viver no Next — ver §2.3 |
| **Supabase CLI** | Migrations versionadas em `supabase/migrations/`, geração de tipos |

**Um projeto Supabase, em desenvolvimento.** `dissona` · ref `fhqcibjzmowcjkdrqyvi` · região `us-west-2` · Postgres 17. Ele serve os previews e a produção dos Workers enquanto o produto não tem usuário real. Projetos dedicados de staging e produção entram antes do beta — ver [open-questions #25](open-questions.md#25-projetos-dedicados-de-staging-e-produção).

Nenhuma alteração de schema fora de migration versionada.

**Quem aplica DDL: o MCP do Supabase.** `apply_migration` é o caminho padrão para o projeto remoto, e `list_tables`, `list_migrations`, `get_advisors`, `execute_sql` e `generate_typescript_types` cobrem inspeção, diagnóstico e geração de tipos. Não é preciso `supabase login` para nada disso.

O **Supabase CLI** continua sendo o caminho da stack local (`supabase start`, `db reset`) e a alternativa quando não há MCP disponível.

**O arquivo `.sql` versionado é a fonte, não o registro do banco.** Toda migration é escrita primeiro em `supabase/migrations/`, e só então aplicada. O que é aplicado tem de ser byte a byte o que está no arquivo — incluindo nomes de policy e de constraint, que são identificadores. Divergir faz `supabase db reset` reconstruir um banco diferente do que está em produção, e o teste local deixa de valer como evidência.

### 2.3 Integrações externas

| Integração | Uso | Release | Situação |
|---|---|---|---|
| Google OAuth | Login social | R1 | provider nativo do Supabase Auth |
| Facebook OAuth | Login social | R1 | provider nativo do Supabase Auth |
| **SoundCloud OAuth** | Login social | R1 | **Custom OAuth provider** `custom:soundcloud` (`pkce_enabled`, `email_optional`). O `userinfo_url` aponta para a Edge Function **`soundcloud-userinfo`**, e não para `api.soundcloud.com/me`: o GoTrue exige `sub` e o `/me` deles não tem. Exige Artist Pro pago, e não devolve e-mail — colhido na confirmação do cadastro ([#9](open-questions.md#9-soundcloud-assinar-o-artist-pro-e-viver-sem-o-e-mail)) |
| E-mail transacional | Verificação, recuperação, avisos | R1 | ⚠️ provedor e domínio de envio a definir |
| **Asaas** | Cobrança Pix e cartão, split, subcontas, payouts | R2 | ⚠️ modelo de split a definir com o contador do cliente |
| Spotify Web API | Metadados de faixa por link | R2 | oEmbed / Web API |
| YouTube Data API | Metadados de faixa por link | R2 | — |
| Spotify — salvamentos de playlist | Nº de salvamentos no card do curador | R3 | ⚠️ sem a integração o dado não existe |
| LLM | Relatório da música e de evolução do artista | R4 | ⚠️ modelo/API a definir |

### 2.4 Numeração de migrations

Duas convenções precisam conviver, porque `apply_migration` do MCP grava a versão como **timestamp** (`20260904171821`), enquanto este projeto numera as migrations por release (`0001`–`0010`).

O nome do arquivo carrega as duas: **`<timestamp>_<NNNN>_<nome>.sql`**.

```
supabase/migrations/20260904171821_0000_storage.sql
                    └── versão ──┘ └─ release ─┘
```

A CLI deriva a versão do prefixo do arquivo. Se o prefixo não bater com o que está em `supabase_migrations`, a CLI reaplica uma migration que o MCP já aplicou. Por isso o fluxo é: escrever o `.sql`, aplicar pelo MCP, ler a versão gravada em `list_migrations` e **renomear o arquivo com essa versão**.

A faixa `0001`–`0010` está reservada por release ([modelo de dados §11](data-model.md)). Infraestrutura que não é schema de produto — buckets de Storage, por exemplo — usa `0000_`.

---

## 3. Estrutura de pastas

Monorepo pnpm (`pnpm-workspace.yaml`): dois apps Next.js e um pacote comum. Continua **sem backend separado** — cada app é o seu próprio backend, por Server Components e Server Actions.

```
dissona/
├── apps/
│   ├── web/                    # @dissona/web — dissona.com.br
│   │   └── src/
│   │       ├── app/
│   │       │   ├── (publico)/  # Homepage, termos, política — sem sessão
│   │       │   ├── (auth)/     # Login, cadastro, recuperação, verificação, seleção de perfil
│   │       │   ├── (app)/      # Ambiente autenticado — artista e curador
│   │       │   ├── (admin)/    # Admin antigo — sai na fase 2 (ver §3.2)
│   │       │   └── api/        # Route handlers: callback OAuth, confirmação, webhooks
│   │       ├── componentes/    # artista/, curador/, conta/, autenticacao/ do produto
│   │       ├── modulos/        # Server Actions (acoes.ts) e módulos só do produto
│   │       ├── lib/            # decisao-por-host, escuta, mascaras…
│   │       └── middleware.ts   # sessão + guarda de papel
│   └── admin/                  # @dissona/admin — admin.dissona.com.br
│       └── src/
│           ├── app/
│           │   ├── (acesso)/   # entrar, recuperar-senha, redefinir-senha, convite, onboarding, verificar-email
│           │   ├── (painel)/   # /, equipe, pacotes — com o Shell
│           │   └── api/auth/confirmar/
│           ├── acoes/          # Server Actions do painel
│           ├── lib/            # decisao.ts (guarda), rotas.ts (rotas limpas)
│           └── middleware.ts
├── packages/
│   └── nucleo/                 # @dissona/nucleo — tudo que os dois apps usam
│       ├── lib/                # supabase/ (tipos-bd.ts), guarda-rota, papeis, dinheiro, erros…
│       ├── modulos/            # servico, repositorio, consultas, esquemas, tipos — sem 'use server'
│       ├── componentes/        # base/ (Design System), shell/, autenticacao/, conta/, equipe/
│       ├── estilos/            # tokens.css, global.css, fontes.css + fontes/*.woff2
│       ├── marca/              # logotipos (importados pelo Marca.tsx)
│       ├── textos/
│       └── hooks/
├── supabase/
│   ├── migrations/             # 0001_*.sql ... numeradas por release
│   └── functions/              # Edge Functions
├── e2e/                        # Playwright — os dois apps (web :3100, admin :3101)
├── scripts/
└── docs/
```

Regras do monorepo:

- **Server actions só nos apps.** `'use server'`, `redirect` e `revalidatePath` dependem de rota, e rota é de app. O pacote tem serviço, repositório, consultas, esquemas, tipos e componentes; a action de cada app é fina e chama o mesmo serviço.
- **Import do pacote por nome**, também dentro dele: `@dissona/nucleo/lib/dinheiro`. O `@/*` de cada app aponta só para o próprio `src/`.
- **Um `.env.local`, na raiz.** O `postinstall` (`scripts/ligar-env.mjs`) liga `apps/*/.env.local` a ele, porque o Next só lê o da pasta do app.
- **Fontes e marca vêm do pacote**, por import (CSS `url()` relativo e `import` de PNG): nenhum app depende do `public/` para isso.

### 3.1 Anatomia de um módulo

```
src/modulos/avaliacao/
├── acoes.ts        # Server Actions — validam com Zod e chamam o serviço
├── consultas.ts    # Leituras server-side (Server Components)
├── servico.ts      # Regra de negócio; sem React, sem HTTP
├── repositorio.ts  # Único ponto que toca o Supabase neste domínio
├── esquemas.ts     # Schemas Zod compartilhados cliente/servidor
├── tipos.ts
└── __testes__/
```

**Regra de dependência:** `app/` → `modulos/*/acoes|consultas` → `servico` → `repositorio` → Supabase. Nenhuma camada pula a seguinte, e `servico` não importa nada de React.

### 3.2 Mapa de URLs

O sitemap do [PRD §6.1](PRD.md) nomeia telas, não caminhos. Os slugs abaixo foram definidos na R0 e estão centralizados na constante `ROTA` de `src/lib/guarda-rota.ts` — nenhum caminho literal espalhado pelo código.

| Route group | Caminho | Módulo |
|---|---|---|
| `(publico)` | `/` | 26 (R5) |
| `(publico)` | `/termos` · `/privacidade` | R0 |
| `(auth)` | `/artista/entrar` · `/curador/entrar` | 1 (uma tela por ambiente — não há `/entrar` neutro) |
| `(auth)` | `/cadastrar` · `/artista/cadastrar` · `/curador/cadastrar` | 1.1 (o do curador é o passo 1 do módulo 12) |
| `(auth)` | `/recuperar-senha` · `/redefinir-senha` · `/verificar-email` | 1.2 · 1.3 |
| `(auth)` | `/selecao-de-perfil` | 1.4 |
| `(app)` | `/artista` e subrotas | 2–10 |
| `(app)` | `/curador` e subrotas | 13–18 |
| `(app)` | `/curador/cadastro` | 12 |
| `(admin)` | `/admin/entrar` · `/admin/recuperar-senha` · `/admin/redefinir-senha` | 19 · 19.1 · 19.2 |
| `(admin)` | `/admin` e subrotas | 20–24 · 27 |

O login do admin fica **dentro** de `(admin)` e não exige sessão — é login próprio, sem social e sem autocadastro.

**O admin é um app próprio** (`apps/admin`), em `https://admin.dissona.com.br`, com rotas limpas reais: `/entrar`, `/recuperar-senha`, `/redefinir-senha`, `/convite`, `/onboarding`, `/verificar-email`, `/`, `/equipe`, `/pacotes`, `/pacotes/novo`, `/pacotes/<id>`. Os caminhos `ROTA.ADMIN*` do pacote continuam **internos** (`/admin/equipe`) — é sobre eles que a matriz de acesso (`decidirAcesso`) raciocina; o painel traduz na entrada e na saída ([`apps/admin/src/lib/decisao.ts`](../apps/admin/src/lib/decisao.ts), [`rotas.ts`](../apps/admin/src/lib/rotas.ts)).

- **Sessões separadas.** O cookie do Supabase é por host: entrar no site não abre o painel, e vice-versa. Por isso o painel tem o próprio `/api/auth/confirmar` (recuperação de senha e troca de e-mail voltam para ele) e serve o onboarding e a verificação de e-mail do admin.
- **Termos e Privacidade** moram no site; o painel redireciona (`NEXT_PUBLIC_URL_SITE`).
- **O site manda o `/admin` antigo ao painel** quando `ADMIN_EM_SUBDOMINIO=true` (308 para `NEXT_PUBLIC_URL_ADMIN` + caminho limpo). Em desenvolvimento o painel é `http://admin.localhost:3001` — o `admin.` separa os cookies, que não distinguem porta.
- **Fase 2** (depois do painel validado em produção): sai do web o `(admin)` antigo, com `rotas-admin`, `decisao-por-host`, `BaseDoAdmin` e os ramos de admin do shell; os módulos só do admin (`equipe`, `admin`, `pacote/esquemas`, `componentes/equipe`) descem do pacote para `apps/admin`.

---

## 4. Camadas e responsabilidades

| Camada | Faz | Não faz |
|---|---|---|
| **Route/Page** | Compõe a UI, dispara Server Actions | Regra de negócio, query direta |
| **Server Action** | Valida entrada (Zod), autoriza, chama o serviço, revalida cache | Cálculo de negócio |
| **Serviço** | Regra de negócio pura e testável | Acesso direto ao Supabase |
| **Repositório** | Query e mutação; mapeia linha → tipo de domínio | Decisão de negócio |
| **RPC / função SQL** | Operações que precisam ser **atômicas** | Formatação, apresentação |

### 4.1 O que obrigatoriamente é RPC

Operações multi-tabela em que uma escrita parcial deixa o sistema inconsistente:

- `confirmar_selecao_curadores` — debita Claves, cria `envio` e `servico_envio`, agenda o prazo, notifica.
- `enviar_avaliacao` — valida escuta e obrigatórios, grava avaliação e notas, calcula a remuneração, cria `ganho_curador`, fecha o `envio`, notifica.
- `devolver_claves_sem_resposta` — devolve o crédito, tira a faixa da fila, lança no extrato, notifica.

---

## 5. Autenticação e autorização

### 5.1 Sessão

Supabase Auth com cookies. O `src/middleware.ts` renova a sessão e aplica a guarda por route group:

| Route group | Exige |
|---|---|
| `(publico)` | nada |
| `(auth)` | nada; redireciona quem já tem sessão |
| `(app)/artista` | sessão + papel `artista` ativo |
| `(app)/curador` | sessão + papel `curador` ativo **e** cadastro do módulo 12 concluído |
| `(admin)` | sessão + papel `admin` ativo |

Sem papel definido → `(auth)/selecao-de-perfil`. Papel `curador` sem cadastro concluído → wizard do módulo 12.

### 5.2 Camadas de autorização

**As três são obrigatórias:**

1. **RLS** no banco — a fronteira real. Toda tabela com `enable row level security` e policies explícitas.
2. **Guarda de rota** no middleware — evita renderizar tela que o usuário não pode ver.
3. **Checagem no serviço** — antes de qualquer mutação sensível.

Helpers SQL: `auth.uid()`, `tem_papel(papel)`, `e_admin()`, `tem_permissao(modulo)`.

> A **matriz de permissões por papel do admin** (Administrador · Moderador · Financeiro · Suporte) segue pendente — ver [open-questions](open-questions.md). A tabela `permissao_admin` existe desde a R1; o conteúdo depende da definição do cliente.

### 5.3 Política de segurança

| Regra | Valor | Origem |
|---|---|---|
| Senha | ≥8 caracteres, ao menos 1 número | protótipo R2 |
| Token de redefinição | 60 minutos, uso único | protótipo R2 |
| Link de verificação de e-mail | 24 horas | protótipo R2 |
| Erro de login | mensagem genérica, não revela o campo | board |
| Recuperação | resposta neutra, não confirma a existência da conta | board + protótipo |
| Troca de e-mail/senha | exige reautenticação e **encerra as demais sessões** | protótipo R2 |
| Admin | sessão com expiração + log de acessos; 2FA sugerido | board |

---

## 6. Storage

| Bucket | Conteúdo | Acesso |
|---|---|---|
| `faixas` | WAV/MP3 até 50 MB | privado — URL assinada apenas para curador com `envio` ativo daquela faixa |
| `capas` | Capa da música | público |
| `avatares` | Foto de perfil | público |
| `materiais` | Arquivos para matéria (Word, PDF, JPG, PNG) — R4 | privado — artista dono e curador destinatário |
| `exportacoes` | `.zip` de exportação LGPD | privado — dono, com expiração |

Os buckets e suas policies nascem em `supabase/migrations/20260904171821_0000_storage.sql`, fora da numeração `0001`–`0010` reservada por release. Todo objeto vive sob a pasta do dono (`<uid>/<resto>`), e as policies comparam `storage.foldername(name)[1]` com `auth.uid()` — isolamento por usuário sem depender de tabela do produto, que é o que permite existir já na R0. As policies que dependem de `envio` — curador com envio ativo daquela faixa — só podem ser escritas na R2, quando a tabela existir; até lá ficam como comentário no próprio arquivo.

⚠️ **Pendência:** armazenar o arquivo **sempre** ou **só quando a faixa não está no streaming**? Impacta o custo de storage e o campo `faixa.arquivo_caminho`.

---

## 7. Processamento assíncrono

Sem Redis nem broker externo na V1. `pg_cron` agenda.

**Quem executa depende de onde o efeito está.** `pg_cron` chama SQL direto
quando todo o efeito do job vive dentro do banco; `pg_net` → Edge Function
apenas quando o job tem efeito **fora** dele. Os dois jobs de SLA são puramente
SQL: levá-los para uma Edge Function moveria a fronteira de transação do ledger
para fora do banco, que é exatamente o que a exigência de RPC atômica (§4.1)
evita.

| Job | Cron (UTC) | Executa | O que faz | Release |
|---|---|---|---|---|
| `avisar_prazo_72h` | `0 * * * *` | SQL direto | Notifica curadores com prazo a vencer, **uma vez por envio** (`envio.avisado_prazo_em`) | R2 |
| `devolver_claves_sem_resposta` | `15 * * * *` | SQL direto | Aplica a devolução automática de 7 dias | R2 |
| `expurgar_contas_excluidas` | `30 3 * * *` | **Edge Function** | Anonimiza a conta e apaga os objetos de Storage (LGPD) | R1 |
| `recalcular_metricas_curador` | diária | a definir | Ranking, calibração, % no prazo, % de compartilhamento | R3 |
| `gerar_relatorio_ia` | sob demanda | Edge Function | Relatório da música e do artista | R4 |

Os três primeiros estão agendados na migration `0011`. O offset de 15 minutos
entre os dois jobs de SLA existe porque ambos varrem o mesmo índice de `envio`.

⚠️ **O expurgo anonimiza, não apaga.** `lancamento_clave` é append-only e
`pedido_clave` e `ganho_curador` têm retenção fiscal — apagar em cascata
destruiria a conciliação, e não apagar descumpre a política publicada em
`/privacidade`. A devolutiva já paga também sobrevive, por obrigação contratual
([regras §10](prd/01-regras-de-negocio.md)). É **decisão de jurídico**, e está
registrada no cabeçalho da `0011`, não decidida lá.

A parte que apaga objetos de Storage é a Edge Function `expurgar-contas`, que
ainda não existe; enquanto isso o job cumpre a obrigação legal (a anonimização)
e é o primeiro ponto do projeto que exige de fato a `SUPABASE_SERVICE_ROLE_KEY`.
Segredo do `pg_net` vem do Vault, nunca inline — `cron.job.command` é legível.

---

## 8. Convenções de código

- **Idioma:** domínio em **português** (`avaliacao`, `saldo_carteira`, `calcularRemuneracao`); termos de framework em inglês (`useState`, `middleware`).
- **Banco:** `snake_case` singular (`nota_criterio`, `pacote_clave`).
- **TypeScript:** `strict`, sem `any`. Tipos do banco gerados em `lib/supabase/tipos-bd.ts` — nunca escritos à mão.
- **Dinheiro:** sempre `bigint` em centavos. `lib/dinheiro.ts` é o único lugar que formata.
- **Claves:** `numeric(10,2)`; a conversão para reais só acontece em `lib/claves.ts`.
- **Erros:** códigos tipados em `lib/erros.ts`; a tradução para texto acontece **na View**, nunca no serviço.
- **Terminologia de interface:** usar **"Envios"**, nunca "Submissões" ([PRD §9](PRD.md)).
- **Datas:** `timestamptz`, UTC no banco, formatação por locale na View.

---

## 9. Ambientes e deploy

**Hospedagem: Cloudflare Workers**, pelo adaptador [OpenNext](https://opennext.js.org/cloudflare) (`@opennextjs/cloudflare`), desde 2026-10-06 — antes era a Vercel. Um Worker por app, os dois do repositório `dissona-app/dissona`, com deploy pelo **Workers Builds** (integração Git do Cloudflare):

| Worker | Root directory | Domínio | Build variables | Runtime (Variables and Secrets) |
|---|---|---|---|---|
| `dissona-web` | `apps/web` | **`https://dissona.com.br`** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_URL_ADMIN=https://admin.dissona.com.br`, `NODE_VERSION=24` | `SUPABASE_SERVICE_ROLE_KEY` (secret), `PAGAMENTO_SIMULADO`, `ASAAS_*` quando o Asaas ligar, e as duas `NEXT_PUBLIC_SUPABASE_*` |
| `dissona-admin` | `apps/admin` | **`https://admin.dissona.com.br`** | as duas `NEXT_PUBLIC_SUPABASE_*`, `NEXT_PUBLIC_URL_SITE=https://dissona.com.br`, `NODE_VERSION=24` | `SUPABASE_SERVICE_ROLE_KEY` (secret) e as duas `NEXT_PUBLIC_SUPABASE_*` |

- **Comandos do Workers Builds**: os padrões servem — `pnpm run build` (o `build` de cada app **é** o `opennextjs-cloudflare build`, que chama `next build` por `buildCommand` no `open-next.config.ts`) e `npx wrangler deploy` (que detecta o OpenNext). Branch não-produção: `pnpm exec opennextjs-cloudflare upload`. Localmente: `pnpm deploy:web` / `pnpm deploy:admin` (exige `wrangler login`).
- **O que está no código** (`apps/*/wrangler.jsonc`): nome do Worker, `nodejs_compat`, assets, **domínio próprio** (`routes` com `custom_domain`; o deploy liga o domínio sozinho. Fica **fora** do arquivo enquanto a zona `dissona.com.br` não estiver ativa na conta — senão todo deploy falha com *Can't infer zone* — e volta no mesmo commit em que a zona ativar; nunca pelo painel, que o deploy seguinte desfaz). Até lá, os Workers respondem em `*.workers.dev`, `ADMIN_EM_SUBDOMINIO=true` no web, *Smart Placement* e logs. `keep_vars: true` preserva o que foi definido no painel — sem ele, cada deploy apagaria essas variáveis.
- **DNS:** a zona `dissona.com.br` mora no Cloudflare (nameservers trocados no Registro.br). Os domínios dos Workers não precisam de registro manual.
- **Plano: Workers Paid.** O gratuito limita cada requisição a **10 ms de CPU**, e a renderização no servidor de uma página Next passa disso. Os Workers ficam em ~2,6 MiB (web) e ~2,1 MiB (admin) comprimidos.
- **Região:** *Smart Placement* põe o Worker perto do Supabase (`us-west-2`), porque o middleware faz um `getUser()` por requisição — rodar perto do visitante e longe do banco pagaria essa ida em toda navegação. Vale revisar junto da pendência [#25](open-questions.md).
- **Diferença de runtime que já mordeu:** o `fetch` dos Workers só aceita `redirect: 'follow' | 'manual'`. Com `'error'` a chamada lança (era o que calava a detecção de faixa por link). O E2E inteiro passa contra o runtime local (`opennextjs-cloudflare build` + `wrangler dev`, com `BASE_URL`/`BASE_URL_ADMIN`).
- **Segredos locais do runtime:** `apps/*/.dev.vars` (gitignored), no mesmo formato do `.env.local`.

⚠️ O **Site URL** do Supabase Auth precisa ser **`https://dissona.com.br`**, e com `https://`. Com `http://`, os links dos e-mails de verificação e recuperação saem inseguros, e a borda responde `308` para o `https` — o que pode fazer o redirect de OAuth não casar com a allow list.

⚠️ E as **Redirect URLs** têm de listar **toda** origem que o app usa, porque `origemDaRequisicao()` deriva o `redirectTo` do cabeçalho da requisição (ver [`lib/origem.ts`](../src/lib/origem.ts)):

| Origem | Entrada na allow list |
|---|---|
| Produção | `https://dissona.com.br/**` |
| Admin em produção | `https://admin.dissona.com.br/**` |
| Preview dos Workers | `https://*.workers.dev/**` |
| Local | `http://localhost:3000/**` · `http://admin.localhost:3001/**` |
| E2E local | `http://localhost:3100/**` · `http://admin.localhost:3101/**` |

O `/**` não é decoração: sem ele só a raiz casa, e os destinos reais são `/api/auth/callback`, `/api/auth/confirmar` e o convite da equipe — `admin.dissona.com.br/convite`.

Falhar nisso **não dá erro**. O GoTrue descarta em silêncio um `redirect_to` fora da lista e usa o Site URL no lugar — o `code` do OAuth chega na home e o login não acontece. Foi o que quebrou o login com Google e com Facebook em produção. A guarda de rota hoje encaminha um `?code=` que caia em `/` para o callback ([`lib/guarda-rota.ts`](../src/lib/guarda-rota.ts)), mas isso é rede de proteção, não substituto da configuração.

| Ambiente | App | Supabase | Gatilho |
|---|---|---|---|
| Local | `pnpm dev` | Supabase CLI local (`supabase start`) | — |
| Preview | versão do Worker (`*.workers.dev`) | projeto `dissona` | push em qualquer branch / PR |
| Produção | Workers `dissona-web` e `dissona-admin` | projeto `dissona` — **provisório** | merge em `main` |

**CI obrigatório:** `typecheck` → `lint` → `test` → `build`, no GitHub Actions, em todo PR e em `main`. O **E2E** roda depois, num job próprio que só dispara se a qualidade passou.

Hoje a suíte sobe os dois apps — o site na **porta 3100** e o painel em **`admin.localhost:3101`** —, e não nas portas de desenvolvimento: se outro projeto estiver servindo a porta padrão, reusar o que está lá faz a suíte testar o app errado. Definir `BASE_URL` (e `BASE_URL_ADMIN`) desliga o `webServer` do Playwright: é assim que a suíte roda contra um preview, contra o runtime local do Cloudflare ou contra produção.

Segredos no painel de cada Worker (Variables and Secrets): chaves Supabase, credenciais OAuth, chave e webhook do Asaas, provedor de e-mail, chaves Spotify e YouTube. Nada de segredo em arquivo versionado — `.env.local` e `.mcp.json` estão no `.gitignore`.

⚠️ **`NEXT_PUBLIC_*` é embutida no build, não lida em tempo de execução.** Acrescentar a variável no painel **não** conserta um deploy já construído sem ela: é preciso **redeployar**. Foi exatamente o que derrubou o primeiro deploy da R0 com `MIDDLEWARE_INVOCATION_FAILED` em todas as rotas.

O `middleware.ts` degrada em vez de cair quando não consegue renovar a sessão: rota pública continua servida, rota autenticada redireciona para o login, e o motivo vai para o log da função. Uma variável faltando não deve tirar `/termos` do ar.

⚠️ Enquanto Preview e Production compartilham o mesmo projeto Supabase, **um `supabase db reset --linked` apaga o banco dos dois**. Vale só nesta fase de desenvolvimento; some quando a pendência #25 for resolvida.

---

## 10. Definition of Done

Uma task só está concluída quando **todos** os itens passam:

- [ ] `pnpm typecheck` sem erros
- [ ] `pnpm lint` sem erros
- [ ] `pnpm test` — unitários passando; regra de negócio nova tem teste
- [ ] `pnpm build` bem-sucedido
- [ ] Migration aplicada em dev **e** com policy de RLS testada
- [ ] Estados de **loading**, **erro** e **vazio** implementados
- [ ] Acessibilidade: foco visível, contraste AA, alvo de toque, rótulo associado ([Design System §4](design-system.md))
- [ ] Nenhum número de negócio hardcoded — veio de `configuracao`
- [ ] Evento de notificação gravado, quando o módulo emite algum ([matriz](prd/06-matriz-notificacoes.md))
- [ ] Cenário correspondente do Guia de Testes R2 coberto por E2E, quando houver
