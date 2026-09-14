# Backlog de desenvolvimento — Dissona

**Escopo em execução: até a Release 2.** O [PRD](PRD.md) especifica a V1 inteira (24 módulos, 5 releases); este backlog é o que está sendo construído. Nada de R3+ é feito adiantado.

Derivado do [PRD](PRD.md) e dos documentos de ambiente, do [modelo de dados](data-model.md), dos [requisitos](requirements.md), da [arquitetura](architecture.md) e do [plano de implementação](implementation-plan.md). O número entre parênteses é o módulo/tela do PRD.

← [PRD](PRD.md) · [Perguntas em aberto](open-questions.md) · [Design System](design-system.md)

---

## Bloqueios — resolver antes de codar o módulo afetado

Detalhamento e perguntas objetivas em [open-questions](open-questions.md).

### Travam a R2

- [x] **Escuta mínima: 60%** — resolvido pelo protótipo do curador, a tela que aplica o gate. O que muda é a copy do artista, que promete 100%
- [x] **11º critério** — o grupo Produção tem **dois** itens, Mixagem e Arranjo. O board perdeu dois, não um
- [x] **Quais 5 são obrigatórios** — afinação, ritmo, melodia, personalidade, conexão. Não é um por grupo
- [x] **Tabela de pacotes** — Ensaio, Repertório, Turnê e Catálogo (inativo), do protótipo do Admin
- [ ] **Base de cálculo da remuneração** — respondida pelo protótipo (incide sobre o **bruto**), mas com **outra semântica**: os três números por classe são (piso, teto na avaliação, teto com compartilhamento). Um Bronze no prazo sem opcionais recebe **30%**, não 38% ([#5](open-questions.md#5-base-de-cálculo-da-remuneração-por-classe)). Implementado e coberto por teste; **confirmar com o cliente antes da tela 14.4**
- [ ] **Modelo de split com o Asaas**, junto do contador do cliente ([#6](open-questions.md#6-modelo-de-split-no-asaas))
- [ ] **Armazenamento do mp3: sempre ou só fora do streaming** ([#7](open-questions.md#7-armazenamento-do-arquivo-de-áudio)) · default provisional `true` em `configuracao`, porque um iframe de streaming não expõe posição de reprodução e o gate de escuta ficaria inverificável
- [ ] **Acréscimo de compartilhamento fica retido?** — o protótipo se contradiz internamente ([#8](open-questions.md#8-liberação-do-crédito-versus-compartilhamento)). Adotado o cálculo (libera na hora), com a decisão gravada no `jsonb` do ganho
- [ ] **`teto_max` é inalcançável** — com os acréscimos do catálogo o máximo real é 46/51/58 contra tetos de 50/55/62; sobram 4 pontos nas três classes ([#5b](open-questions.md#5b-teto_max-é-inalcançável))
- [ ] **LGPD × retenção fiscal no expurgo** — o job anonimiza em vez de apagar, porque o ledger é append-only. **Decisão de jurídico** ([#27](open-questions.md#27-lgpd-versus-retenção-fiscal-no-expurgo))

### Travam a R1

- [ ] **SoundCloud: o Artist Pro pago e o e-mail que a API não dá** — a disponibilidade foi confirmada em 2026-09-10 (keys self-serve desde 18/05/2026, e o Supabase agora tem custom OAuth provider). O que trava é a assinatura e a decisão de onde colher o e-mail ([#9](open-questions.md#9-soundcloud-assinar-o-artist-pro-e-viver-sem-o-e-mail))
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
- [x] Repositório conectado à Vercel — há deploy em `https://dissona.vercel.app`
- [ ] ⚠️ **Publicar `main`.** Em 2026-09-08 produção devolvia **500 em `/` e `/termos`**, e a causa não é código: o commit `5065f1a`, que fez o middleware degradar em vez de cair, **nunca foi publicado**. O branch local está à frente de `origin/main`, e o deploy roda um build anterior ao conserto. `NEXT_PUBLIC_*` é embutida no build, então acrescentar env var não conserta um deploy já feito — é preciso republicar
- [ ] Configurar as env vars da Vercel nos escopos Production e Preview — conferir depois do push, porque o 500 mascara o diagnóstico. Agora inclui `SUPABASE_SERVICE_ROLE_KEY`
- [ ] ⚠️ Cadastrar as Redirect URLs de Preview e produção no Supabase Auth — **necessário antes da verificação de e-mail** (fatia de autenticação): sem elas o link do e-mail sai quebrado. **Já quebrou o login social em produção**: em 2026-09-14 o app mandava `redirect_to=https://dissona.com.br/api/auth/callback`, que não estava na lista, e o Auth devolvia o `code` para o Site URL (`https://dissona.vercel.app/?code=…`) sem erro nenhum. Site URL passa a ser `https://dissona.com.br`, e a lista precisa de `https://dissona.com.br/**`, `https://dissona.vercel.app/**`, o curinga de Preview e `http://localhost:3000/**` — ver [architecture.md §9](architecture.md#9-ambientes-e-deploy)
- [ ] **Configuração do Auth no dashboard**, que a fatia de autenticação depende e não é versionável: confirmação de e-mail ligada, templates reescritos para `{{ .TokenHash }}` apontando para `/api/auth/confirmar`, credenciais de Google e Facebook, e proteção contra senha vazada (o único achado acionável do `get_advisors`)
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
- [x] Migration `0001c` — `perfil.onboarding_visto_em`, `ultimo_ambiente` e `senha_alterada_em`, mais o trigger que fecha um furo real: a policy de update liberava a **linha** do dono e RLS não filtra coluna, então uma conta `bloqueada` se reativava sozinha
- [x] Migration `0002b` — `ler_contexto_sessao` passa a devolver `situacao`, `situacao_curador`, `onboarding_visto` e `ultimo_ambiente`, ainda numa ida só
- [x] Migration `0002c` — os seis tipos de credencial do protótipo (a `0002` tinha quatro, e três caixas do wizard não tinham onde entrar), `anexo_caminho`, e a RPC `concluir_cadastro_curador`: sem ela a classificação de 12.4 era **impossível**, porque o trigger de autopromoção recusa a escrita do próprio curador e `security definer` não contorna
- [x] Migrations `0003b` e `0003c` — `criar_convite_admin`, e `citext` comparado com `operator(extensions.=)`: com `search_path` vazio o `=` de `citext` fica invisível e o Postgres compara como `text`, em silêncio. Era bug latente em `aceitar_convite_admin` desde a `0003`
- [x] `servicoNotificacao` no código, canal in-app — grava por `registrar_notificacao` pela service role, e **não lança**: um aviso interno não gravado não é razão para o cadastro de alguém falhar. O **envio** de e-mail depende do provedor ([#10](open-questions.md#10-provedor-de-e-mail-transacional)); a linha já nasce com `email` em `canais` e `enviada_email_em` nulo, esperando o consumidor

### Autenticação (1 / 11)
- [x] Tela de login com e-mail e senha (1) — fiel ao protótipo do artista, com os três provedores sociais visíveis e desabilitados
- [x] Login administrativo próprio (19), **fora do shell do painel** — a divisão de `(admin)` em `(acesso)` e `(painel)` fecha o bug que a R0 deixou anotado
- [x] Conta autenticada sem papel `admin` não entra na área administrativa: a sessão é desfeita e o banner é "Conta sem acesso administrativo"
- [x] Login social com Google — provider nativo, `/api/auth/callback` e a confirmação de aceite
- [x] Login social com Facebook — mesmo caminho
- [x] Login social com SoundCloud — **custom OAuth provider** do Supabase, e não um fluxo OAuth2 escrito à mão. Três peças: a Edge Function `soundcloud-userinfo`, que traduz o `/me` porque o GoTrue **exige `sub`** e o `attribute_mapping` não alcança o `urn`; a migration `0002e`, sem a qual conta sem e-mail derruba o cadastro dentro do trigger; e o e-mail colhido em `/cadastrar/confirmar`, que a API deles não entrega. Falta só criar o provider no dashboard e ligar `SOUNDCLOUD_LIGADO`
- [x] **O e-mail que o SoundCloud não dá** — a tela de confirmação ganhou um segundo modo: com Google e Facebook o endereço é conferido, com SoundCloud é pedido e gravado por `updateUser`. Fica pendente de confirmação, e a conta **navega assim mesmo** — a decisão está na [#9](open-questions.md#9-soundcloud-assinar-o-artist-pro-e-viver-sem-o-e-mail). O aviso é a própria `/verificar-email`, que deixou de expulsar quem tem sessão, mais a marca no menu da conta
- [x] **O aceite de termos que o social não colhe** — um provider nativo não permite "confirmar antes de criar": a conta nasce no callback e ninguém aceitou nada. `/cadastrar/confirmar` colhe o aceite depois, e a `0002d` põe `aceite_termos` no contexto de sessão para que a guarda devolva a pessoa para lá enquanto ele faltar. Sem isso ficaria conta ativa sem o aceite que a LGPD exige (RF-010)
- [x] **Conta bloqueada não navega** — o banner existia na copy desde a R0 e nada o disparava. Agora a ação de login desfaz a sessão, e o middleware ejeta quem foi bloqueado **durante** a navegação, com o motivo na URL
- [x] **Conta desativada reativa ao entrar** — os 30 dias de reversão da LGPD só valem se o acesso reverter, e a guarda de rota deixa `desativada` navegar por isso
- [x] Camada de serviço em `modulos/autenticacao` — a convenção `acoes → servico → repositorio` estava quebrada: as duas ações de login chamavam o repositório direto, com a regra duplicada
- [x] Tela de cadastro com aceite de Termos e LGPD (1.1) — medidor de força (§2.2.9), `Checkbox` no Design System, e todos os erros de campo de uma vez
- [x] Fluxo de verificação de e-mail com link de 24h — `/verificar-email` com reenvio e `/api/auth/confirmar` trocando `token_hash` por sessão
- [x] Tela de recuperação de senha com resposta neutra (1.2) — a resposta é idêntica para e-mail cadastrado e não cadastrado, inclusive no estado da tela; só o estouro de limite se distingue, e ele fala do servidor, não da conta
- [x] Tela de redefinição de senha com token de 60min e uso único (1.3) — três estados numa rota. A autorização é um **marcador de recuperação**, e não a sessão: o link cria sessão, e aceitar qualquer sessão faria desta tela um desvio da reautenticação que a troca em Conta exige
- [x] Tela de seleção de perfil artista/curador (1.4) — **derivada**: não existe em protótipo nenhum, e a anotação do arquivo do Curador confirma. Card selecionável (§2.4.2) na moldura de autenticação
- [x] Roteamento pós-login por papel e por primeiro acesso — inclusive o último ambiente usado (RF-008), que antes era prioridade fixa e mandava um curador-e-artista sempre para o lado errado
- [x] Onboarding do artista em 4 passos (1.5) — conteúdo literal do protótipo, micro-notas incluídas
- [x] Onboarding do curador em 4 passos (1.5) — **derivado**: o PRD dá só os quatro títulos, e os textos foram escritos a partir do que aquelas telas de fato fazem (72h, gate de 60%, escala por classe)
- [x] Onboarding do admin em versão enxuta (1.5) — **derivado**, sobre a navegação real do painel
- [x] Reabrir o onboarding — no **menu da conta**, e não no de ajuda: é onde o protótipo o põe, e "Sair" num menu de ajuda seria um alvo perigoso num lugar inesperado. O menu da conta entrou aqui porque `sair` existia desde a R0 sem nenhuma UI que o chamasse
- [x] Reautenticação para troca de e-mail e de senha — **já estava entregue**; o item seguia aberto por deriva do backlog. `conferirSenhaAtual` porteia as duas trocas em `modulos/conta/servico.ts`, e o `ModalDeCredencial` traz o overline "Reautenticação" nos dois modos. A diferença entre elas é deliberada e está documentada no serviço: a troca de senha encerra as outras sessões, a de e-mail não — ali nada mudou ainda, e o endereço só passa a valer quando o link chegar à caixa nova
- [x] Encerramento das demais sessões ao trocar credencial — **depois** da troca, e não antes: derrubar sessões e falhar na troca seria o pior dos dois mundos
- [x] Notificação de novo cadastro concluído → admin — disparada quando a conta passa a **servir**, e não quando a linha nasce: com verificação exigida, avisar no `signUp` encheria a caixa do admin de contas que nunca confirmaram

- [x] Migration `0003d` — `ler_equipe_admin` (o e-mail dos integrantes vive em `auth.users`, que o PostgREST não expõe, e a lista une duas tabelas), as três mutações da equipe como funções (é o único jeito de o `motivo` da auditoria existir), e `atualizar_meu_cargo`, que toca **uma** coluna porque a RLS não restringe coluna
- [x] Migration `0003e` — `NULLIF` é gramática, não função: `pg_catalog.nullif(...)` não existe, e `atualizar_meu_cargo` falhava com `42883` para todo mundo. Encontrado pela suíte da `0003d`, na asserção que esperava `DS020` e recebeu outro código

### Cadastro do curador (12)
- [x] Wizard de cadastro com 8 passos, progresso e retomada por `passo_cadastro` — uma rota por passo, e não estado local: o progresso é persistido, o wizard é retomável dias depois e o "Editar" da revisão precisa de endereço. Fica em `(app)/(cadastro)`, fora do shell do curador, pela mesma razão que a R0 dividiu `(admin)`
- [x] Identificação com herança de nome e e-mail da conta (12) — em leitura, e sem campo de senha: a variante do protótipo com senha é para quem chega sem sessão, e no produto o wizard exige o papel `curador`
- [x] Modalidades de compartilhamento com validação de link (12.1) — linhas dinâmicas, com a regra de link do protótipo (aceita `site.com/x`, recusa espaço)
- [x] Serviços e preços em Claves, com Feedback obrigatório (12.2) — o preço do opcional desmarcado é **preservado**, não apagado: `readOnly` em vez de `disabled`, porque campo desabilitado não vai no `FormData`
- [x] Perfil profissional e credenciais (12.3) — as seis do protótipo, com anexo para formação e a dica de classe ao vivo
- [x] Classificação automática Bronze / candidato a Prata, com thresholds vindos de `configuracao` (12.4) — pela RPC `concluir_cadastro_curador`, que é o **único** caminho possível: o trigger de autopromoção recusa a escrita do próprio curador
- [x] Tela final Bronze aprovado, com curso de curadoria (12.5) — os três módulos do protótipo; "Começar o curso" fica desabilitado, porque o conteúdo é de outra release
- [x] Tela final Prata em análise, com disparo ao admin (12.5) — o disparo sai de dentro da RPC, na mesma transação da classificação, e o "Entendi" sai da sessão de verdade: sem acesso ao painel, não há tela seguinte
- [x] Alteração de cadastro e gestão de mídias, sem alterar a classe (12.6) — rota própria em `/curador/meu-cadastro`, e não `/curador/cadastro`: aquela é a **retomada** do wizard e manda quem já concluiu para a classificação, o que faria "Meu cadastro" na sidebar abrir a tela de parabéns do Bronze. A regra de que alterar mídia não altera a classe é sustentada em três camadas — o serviço não chama a RPC, o repositório não escreve as colunas, e o trigger recusaria se escrevesse

### Conta e configurações (7 / 17)
As telas de Conta são **uma** (`TelaDeConta`) servindo os dois ambientes: o protótipo escreve os mesmos três cards de segurança, palavra por palavra, nos dois arquivos. Duplicá-las daria duas versões do fluxo mais sensível do produto — troca de senha e exclusão de conta — e a chance de corrigir uma e esquecer a outra. A aba viaja em `?aba=`, e não em estado local: é o que dá endereço à Segurança (a própria copy diz "gere outro em Configurações › Segurança"), faz a tela funcionar sem JavaScript e permite ler as sessões só para quem abriu aquela aba.

- [x] Perfil do artista com bio 280, até 3 gêneros e links validados (7.1) — o perfil vive em **duas** tabelas (`perfil` para nome/handle/cidade, `perfil_artista` para bio/gêneros/links) e a tela é uma só. Não virou RPC: a lista de escritas atômicas ([arquitetura §4.1](architecture.md)) é a das que deixam dinheiro ou estado inconsistente pela metade, e aqui a metade é um nome salvo sem a bio. A regra de link saiu de `modulos/curador` para [`lib/link.ts`](../src/lib/link.ts), e o `Chips` saiu de `componentes/curador` para o Design System, com a prop `maximo` que o `check` de 3 gêneros exige. Os dois catálogos de gênero divergem entre os protótipos — ver [07-pendências](prd/07-pendencias-e-divergencias.md)
- [x] Dados da conta do artista, com o bloco de cobrança declarado como pendente (7.2) — o card aparece com o aviso em vez de escondido: a forma da tela não muda a cada entrega
- [x] Troca de e-mail com confirmação no novo endereço (7.2) — reautentica com a senha atual e **não** encerra sessões, ao contrário da troca de senha: aqui nada mudou ainda, e o e-mail só passa a valer quando o link chegar à caixa nova
- [x] Ativação do papel de curador pelo artista (7.2) — leva ao wizard do módulo 12, com Bronze aprovado na hora; a frase "depende de aprovação da curadoria" é honrada pelo caminho Prata, e a divergência está registrada em [07-pendências](prd/07-pendencias-e-divergencias.md) — [#12](open-questions.md#12-ativação-do-2º-papel-exige-aprovação)
- [x] Preferências do artista: notificações e idioma, com eventos críticos não desativáveis (7.3) — salva a cada toque, sem botão ("Salvo automaticamente" é do protótipo), com estado otimista que volta atrás se a ação falhar. A **ausência** de linha em `preferencia_notificacao` é o padrão, não "desligado": tratá-la como desligado silenciaria todo aviso de quem nunca abriu a tela, e ninguém reclamaria. O evento crítico aparece travado e com etiqueta — a trava real é do servidor, que lê a criticidade do catálogo e recusa o desligamento
- [x] Segurança do artista com painel de sessões ativas (7.4) — a sessão atual não tem "Encerrar": isso é "Sair", que já está no menu do header, e a RPC recusaria a própria sessão de qualquer forma. "há 3 dias" é formatado no cliente, porque depende do relógio de quem lê
- [x] Fluxo de exclusão de conta em 2 passos, com exportação LGPD em `.zip` (7.4) — a exportação é **oferta**, não pedágio: "Continuar" está sempre ativo, porque obrigar a baixar os dados para poder sair seria cobrar pela saída
- [x] Perfil do curador com credenciais e classe somente leitura (17.1) — **aba** de Conta, e não rota própria como no artista: o protótipo do curador não tem item de perfil na sidebar, e o do artista tem. Ficou **inteira em leitura**, com link para 12.6, porque 12.6 já edita bio, gêneros, mídias e serviços — um segundo formulário para o mesmo dado é o que `TelaDeConta` evita para senha e exclusão. `ehAbaDeConta` passou a receber o ambiente, senão `/artista/conta?aba=perfil` renderizaria uma aba inexistente sem erro. Ver [07-pendências](prd/07-pendencias-e-divergencias.md)
- [x] Dados da conta do curador, com o bloco de recebimento declarado como pendente (17.2)
- [x] Preferências do curador (17.3) — o mesmo `PainelDePreferencias`, com a nota de idioma do protótipo do curador. Os cinco eventos que servem artista **e** curador têm uma linha só de preferência por conta: desligar num ambiente desliga no outro, que é o certo — a conta é uma, e `destinatario` é `papel[]` justamente por isso
- [x] Segurança do curador (17.4) — a mesma tela do artista; `/curador/conta` fica **fora** dos desvios do painel, senão uma conta só de curador em `prata_em_analise` não teria porta nenhuma para o direito de exclusão da LGPD

### Admin (19 / 27)
- [ ] Login admin restrito, sem social e sem autocadastro (19)
- [x] Recuperação de senha admin com cooldown (19.1) — o contador é um instante, não um decremento em efeito; o servidor já recusa com 429 e o cooldown só evita que a pessoa descubra clicando
- [x] Redefinição de senha admin (19.2) — mesmo componente e mesma ação da 1.3, com os retornos apontando para o login administrativo
A tela 27 é a única do produto onde **toda escrita passa por RPC**, e não por `update` do cliente. A razão é o `motivo` da auditoria: `registrar_auditoria` o lê de `current_setting('dissona.motivo')`, e `set local` só vale dentro de uma transação — pelo PostgREST cada `update` é a sua própria transação, sem onde marcá-la. Ver o cabeçalho da [`0003d`](../supabase/migrations/20260910175458_0003d_equipe_admin.sql).

- [x] Dados pessoais do membro admin, com reautenticação (27.1) — o e-mail e a senha reusam o `ModalDeCredencial` e as ações de `modulos/conta`: o protótipo escreve os textos idênticos nos três ambientes, e um segundo caminho de troca de senha só para o admin seria um segundo lugar para esquecer o `signOut({ scope: 'others' })`. O cargo vai por RPC de uma coluna, porque a policy de `membro_admin` exige permissão de equipe e quem é `suporte` não a tem
- [x] Listagem da equipe com status e ações (27.2) — a lista é a **união** de `membro_admin` com `convite_admin` pendente, feita em SQL: quem foi convidado e ainda não aceitou não tem linha de membro, e é ele que aparece como "Convite pendente". Ninguém altera o próprio papel nem desativa a própria conta — na tela é um controle ausente, no banco é `DS020`, porque o único administrador que se rebaixasse trancaria a organização fora da gestão
- [x] Convite de membro por e-mail com papel (27.3) — o nosso convite é emitido **antes** da conta no Auth: se o e-mail falhar, existe uma linha pendente que o "Reenviar" resolve; na ordem inversa haveria conta criada sem convite nenhum. Reenviar **rotaciona** o token, porque o link antigo pode ter ido para a caixa errada
- [x] Aceite de convite e definição de senha — `/admin/convite` é indiferente à sessão de propósito: `exigirSessao` monta o `?proximo=` a partir do *pathname*, e redirecionar traria a pessoa de volta **sem o token**. O aceite vem antes da senha — um token ruim, que é a falha comum, não deixa nada mudado
- [x] Papéis e permissões por módulo (27.4) — a matriz inteira em uma transação, com `administrador` imutável e `equipe` exclusiva dele. A célula é um `<select>` de três níveis, e não a caixa do protótipo: uma caixa não expressa `pode_ler` **e** `pode_escrever`, e as duas saídas eram congelar a escrita no seed para sempre ou dar escrita a quem só tinha leitura. Ver §B.3 das [divergências](prd/07-pendencias-e-divergencias.md) — a matriz definitiva segue sendo [#11](open-questions.md#11-matriz-de-permissões-do-admin)

### Gate da R1
Os cinco itens estão **implementados e provados no banco**; o que falta em cada
um é a verificação de ponta a ponta pela interface. Ela depende de configuração
que não é versionável — Redirect URLs, templates de e-mail e credenciais de
Google e Facebook no dashboard do Supabase (ver "Pendências manuais" abaixo) —,
então ficam marcados como pendentes até a passada manual.

- [ ] Conta criada por e-mail e por social, com papel escolhido e roteado — código completo; falta a passada manual, que é a única forma de provar as Redirect URLs e os templates
- [ ] Curador Bronze liberado na hora; Prata em análise com admin notificado — provado na suíte da `0002c`; falta ver pela tela
- [ ] Admin convida membro, que aceita e entra — provado na suíte da `0003b` (ciclo emissão→aceite) e da `0003d`; falta o e-mail chegar de verdade
- [x] Toda ação sensível grava em `log_auditoria` — **com o motivo**, que era o que faltava: o contrato antigo (`set local` na Server Action) é inexequível pelo PostgREST, e a `0003d` o substituiu por funções. Duas asserções provam que o motivo e o ator chegam
- [x] Todo evento da R1 grava em `notificacao` — os 11 eventos de auth semeados na `0005`, com o teste de deriva em `modulos/notificacao/__testes__/eventos.test.ts` para código e seed não divergirem

### Pendências manuais, no dashboard do Supabase
Nada disto é versionável (`config.toml` só tem `project_id`), e nada disto o
código pode contornar:

- [ ] *Confirm email* ligado; **Site URL `https://dissona.com.br`** e Redirect URLs de local, Preview e produção — inclui `/admin/convite`, que é onde o `inviteUserByEmail` devolve a pessoa. É o item que derrubou o login com Google e Facebook; a lista exata está em [architecture.md §9](architecture.md#9-ambientes-e-deploy)
- [ ] Templates de e-mail reescritos para `{{ .TokenHash }}` apontando para `/api/auth/confirmar` — sem isso o link do Supabase não fecha sessão no fluxo SSR/PKCE
- [x] Providers Google e Facebook com credenciais — feito no dashboard; o redirect registrado nos consoles do Google e da Meta é o do **Supabase** (`https://<ref>.supabase.co/auth/v1/callback`), nunca o nosso `/api/auth/callback`, que é para onde o Auth devolve depois
- [ ] **Custom provider `custom:soundcloud`** — Auth → Providers → New Provider → *Manual configuration*, com `client_id` `oXgbfsAkK3HZ96jVO0mXCbZ6spU3P93A`, o segredo da tela do SoundCloud, authorize `https://secure.soundcloud.com/authorize`, token `https://secure.soundcloud.com/oauth/token` e **userinfo apontando para a nossa Edge Function**, `https://fhqcibjzmowcjkdrqyvi.supabase.co/functions/v1/soundcloud-userinfo` — nunca para `api.soundcloud.com/me`, que não devolve `sub`. Se `email_optional` não estiver no formulário, fechar com um `PUT` parcial em `/auth/v1/admin/custom-providers/custom:soundcloud` mandando só `{"email_optional": true}`; sem ele o login falha com "Error getting user email from external provider"
- [x] ~~`SOUNDCLOUD_LIGADO` na Vercel~~ — não é preciso: o botão vem ligado, e a variável virou chave de emergência (`=false` desliga). O provider é do projeto Supabase, que Preview e Production compartilham
- [ ] **Rotacionar o segredo do SoundCloud antes do lançamento** — ele apareceu num screenshot durante a implementação. Risco é abuso da nossa cota de API, não de conta: o `authorization_code` só volta para o redirect URI registrado
- [ ] `SUPABASE_SERVICE_ROLE_KEY` no `.env.local` e nos escopos da Vercel
- [ ] *Leaked password protection* ligada — o advisor a aponta, e é uma chave no dashboard
- [ ] Provedor de e-mail real ([#10](open-questions.md)) — enquanto for o SMTP embutido (~2 e-mails/hora), o convite da equipe mostra o link na tela para copiar, e esse paliativo sai junto

---

## R2 — Núcleo do produto · 14,5h

### Banco — migrations `0006` a `0010`
- [x] Migration `0006` — `faixa`, `envio`, `servico_envio`, mais a policy do bucket `faixas` que a R0 deixou pendente (corrigida: o rascunho comparava uma coluna que não existe). `0006b` quebra a recursão mútua de policy e `0006c` conserta um trigger de guarda que nascera cego
- [x] Migration `0007` — `pacote_clave`, `pedido_clave`, `evento_provedor`, `lancamento_clave`, view `saldo_carteira` (com `security_invoker`), e as RPCs `criar_pedido_clave`, `registrar_evento_provedor` e `confirmar_pedido_clave`
- [x] Migrations `0007b` e `0007c` — `pacote_clave.excluido_em`: portar a tela 21 mostrou que "desativar" e "excluir" são ações **diferentes** no protótipo, e a `0007` as havia colapsado numa só. A `0007c` corrige a colisão de `SQLSTATE` que a `0007b` introduziu (`DS030` já era "configuração ausente")
- [x] Migration `0008` — `criterio` (**seed com os 11 do protótipo**), `avaliacao`, `nota_criterio`, `compartilhamento`, views `nota_avaliacao` e `nota_artista`. Resolve [#2](open-questions.md#2-11º-critério-de-avaliação) e [#3](open-questions.md#3-quais-5-dos-11-critérios-são-obrigatórios)
- [x] Função `calcular_remuneracao` — algoritmo do protótipo, 31 asserções. Resolve [#5](open-questions.md#5-base-de-cálculo-da-remuneração-por-classe) (percentual sobre o **bruto**), mas com semântica diferente da tabela do board — ver o cabeçalho da `0009`
- [x] Migration `0009` — `ganho_curador` (com `base_centavos`, para o `check` do rateio existir) e RPC `enviar_avaliacao`
- [x] Migration `0010` — RPCs `confirmar_selecao_curadores`, `devolver_claves_sem_resposta` e `avisar_prazo_72h`; índices da fila na `0006`. `0010b` corrige um estado intermediário que o `check` recusava
- [x] Migration `0007d` — `recusar_pedido_clave`, o único estado de `situacao_pedido` que a `0007` deixou sem função. Mesmo contrato de `confirmar_pedido_clave`: `security definer`, revogada até de `authenticated`, chamada pelo webhook. **Não** regride pedido aprovado — reentrega fora de ordem é normal, e desfazer crédito é estorno, que tem outro estado e exige lançamento

### Envio de música (3)
- [ ] Passo 1 — colar link com autodetecção de metadados (3) — os campos de link existem e são validados; a **autodetecção** (Spotify/YouTube) é fatia própria e depende de credenciais
- [x] Passo 1 — upload de WAV/MP3 até 50 MB, com validação no servidor (3) — validado por **MIME**, não por extensão (há teste com `.exe` renomeado), e contra `configuracao`, nunca contra um 50 embutido. O caminho gravado vem de `data.path` do Storage: a policy do curador compara `storage.objects.name` com `faixa.arquivo_caminho` por igualdade exata, e divergir ali não dá erro — só faz o player ficar mudo
- [x] Detalhes quando o link não retorna dados (3.1) — bloco **inline** no passo 1, como no protótipo, e não tela separada
- [x] Detalhes do arquivo enviado (3.2) — título, capa, estilo, "já foi lançada?" e data, com o rótulo da data mudando conforme a resposta
- [x] Passo 2 — gênero e campo obrigatório "O que o curador precisa saber?" — obrigatório por RF-038; o protótipo o chama de opcional, e a divergência está registrada
- [x] Passo 3 — revisão do envio, com o aviso sobre saldo e seleção — o progresso é **derivado** dos campos preenchidos, não uma coluna: `podeAbrir` impede pular para a revisão sem contexto
- [x] Tela de confirmação do envio — **"Seu envio chegou"**, nunca "Sua submissão": é a única divergência em que o protótipo não vence, e o E2E de B7 fixa isso afirmando que a palavra não aparece na tela
- [x] **Placeholder da Seleção de curadores** criando os `envio` — lista curadores **reais** de `curador_publico`, porque a RPC recusa quem não está aprovado (`DS011`) ou não tem `feedback` ativo (`DS012`). É aqui que as Claves saem

### Carteira e Claves (5)
- [x] Carteira com saldo disponível, comprometido e devolvido (5) — ⚠️ `disponivel` da view **já exclui** o comprometido (o consumo é debitado na confirmação da seleção); `comprometido` é recorte de exibição e nunca se subtrai um do outro. "Adquiridas" e "Usadas" são somadas do ledger no serviço, porque a view não as tem; "Devolvidas" vem da view, para não haver duas fontes do mesmo número
- [x] Últimas movimentações na carteira (5) — as três mais recentes, com "Ver tudo" para o extrato
- [x] Lista de pacotes ativos com desconto progressivo e preço por Clave (5.1) — rota própria em `/artista/pacotes`, e não uma aba da Carteira como no protótipo: "Comprar Claves" é destino de três CTAs (Carteira, estado vazio e o bloqueio por saldo), e um `caView` não tem endereço. Os números saem de `paraLista`, a **mesma** função da tela 21 — vitrine e admin não podem discordar do mesmo pacote. Sem o selo "Mais escolhido" do protótipo: ele é fixo no mock (`p[0] === 60`), e não há de onde tirar a estatística
- [x] Checkout com Pix — **meio selecionável e pedido gravado com `meio = 'pix'`**; o QR e o copia e cola ficam **declarados como pendentes**, porque `pix_payload`/`pix_qr` nascem no provedor. Botão desabilitado com o motivo visível, como o bloco de cobrança em 7.2
- [x] Checkout com cartão tokenizado, sem persistir dados do cartão (5.2) — os quatro campos do cartão **não têm `name`**, então não entram no `FormData` e não atravessam a rede: não chegam à Server Action, não aparecem em log e não existem para ninguém gravar. É o mesmo mecanismo do `CampoNota`. Quando o Asaas entrar, quem ganha `name` é o **token** que o SDK devolve no navegador
- [x] Estados de pagamento: processando, aprovado e recusado (5.2) — e a recusa **grava**: a `0007d` acrescentou `recusar_pedido_clave`, porque o enum previa `recusado` desde a `0001` e ninguém podia escrevê-lo. Sem ela, um pagamento negado ficaria em `criado` dentro de `pedido_clave_pendentes_idx`, que é a fila de conciliação
- [x] **Provedor de pagamento atrás de uma porta** (`modulos/claves/pagamento.ts`) — o Asaas segue bloqueado por [#6](open-questions.md#6-modelo-de-split-no-asaas), que é decisão de contador, e a única implementação é o **simulador que o próprio protótipo desenha** (o seletor "Simular resultado · Aprovado / Recusado"). ⚠️ Enquanto `PAGAMENTO_SIMULADO` não for `false`, a compra credita sem cobrança; com `false` a ação falha com `pagamento_indisponivel` em vez de creditar de graça. O que falta para o provedor real é **um arquivo**: nenhuma tela, ação ou RPC muda
- [x] Extrato de Claves com filtro por tipo e estado vazio por filtro (5.3) — o filtro viaja em `?tipo=`, como a aba de Conta: dá endereço ao recorte e funciona sem JavaScript. O saldo acumulado é calculado sobre o histórico **completo**, nunca sobre a lista filtrada — senão a coluna "Saldo" mostraria números que nunca existiram na conta, e há teste fixando isso
- [x] Bloqueio por saldo insuficiente com alerta e CTA de compra — o alerta já existia na seleção de curadores; o que faltava era **para onde mandar a pessoa**. O CTA só aparece em `SALDO_INSUFICIENTE`: dos cinco erros daquela tela, é o único que não se resolve mudando a seleção

### Pacotes de Claves — admin (21)
- [x] Lista de pacotes com preço por Clave e status (21) — **A1 verde**
- [x] Criar e editar pacote com recálculo valor ↔ desconto e economia do artista (21.1) — **A2 verde**, com as validações que o protótipo não tem (ele coage em silêncio)
- [x] Ativar e desativar pacote, refletindo na Carteira do artista — **A3 verde**
- [x] Excluir pacote com confirmação, mantendo compras já feitas, com registro em log — exclusão **lógica** (`0007b`), que é o que preserva a FK de `pedido_clave`

### Fila de avaliações (13)
- [x] Fila com prazo de 72h, status e ordenação por urgência (13) — a leitura vem da view `fila_do_curador` (`0006d`), e não de um embed: o nome do artista mora em `perfil`, que é privado, e o inner join devolvia fila **vazia sem erro**
- [x] Ordenação por Música, Prazo e Status com `aria-sort` (13) — ordenação no **serviço**, não no SQL: "Status" é derivado do relógio (atrasada = prazo vencido) e "Música" ordena por **artista** com `localeCompare` pt-BR, que o `order by` faria por colação de banco. O recorte viaja na URL, então o `aria-sort` descreve algo real
- [x] Filtros por status e gênero, com estado vazio por recorte (13) — o resumo conta a fila **inteira**, e não o recorte
- [x] Detalhe do item com serviços contratados, total e contexto do artista (13.1) — os serviços vêm de `servico_envio`, com o preço **congelado** na seleção, e não de `servico_curador`, que o curador pode ter mudado depois
- [x] "Iniciar avaliação" movendo o envio para `avaliando` (13.1) — uma das três transições que o cliente pode escrever; `pronto` e `devolvido` são das RPCs por trigger. A falha é mostrada porque é real: o envio pode ter saído da fila noutra aba ou pelo job de 7 dias

### Avaliação (14)
- [x] Player com medição de escuta e trava de envio (14) — o mínimo vem de `configuracao.escuta_minima_percentual`, que o protótipo fixou em 60% ([#1](open-questions.md#1-escuta-mínima-60-ou-100-da-faixa) resolvida). A medição é do cliente e a **fronteira é a RPC**: `enviar_avaliacao` recusa com `DS001`. Persistida a cada 5 pontos, no máximo uma vez por 10 s, porque o `<Player>` publica quatro vezes por segundo
- [x] Notas objetivas por critério, 0–5 com uma casa decimal (14) — **C3 verde**. O `CampoNota` é um range sem `name`, e o valor viaja num campo escondido: com o `name` no range, um critério nunca tocado enviaria `0`, e nota 0,0 é uma avaliação
- [x] Justificativa por critério com contador de 250 caracteres (14) — um campo **por critério**, e não o `<textarea>` que troca de assunto do protótipo; ver [07-pendências](prd/07-pendencias-e-divergencias.md). O contador conta o **piso do acréscimo**, não um teto, e por isso não usa o `limite` do `AreaTexto`
- [x] Resumo das notas objetivas com média e contagem por grupo (14.1) — de `mediaObjetiva` e `mediasPorGrupo`, puras e testadas
- [x] Nota subjetiva com slider de 0,0 a 5,0 (14.1) — **C4 verde**. O rótulo do campo difere do título do painel de propósito: `Painel` expõe `aria-label`, e nomes iguais colidem
- [x] Feedback escrito obrigatório com contador de 150 caracteres (14.1) — obrigatório é **não ser vazio** (`DS003`); os 150 caracteres são do **acréscimo**. Confundi-los transformaria um bônus em barreira. `required` no HTML barra o "Avançar"; "Salvar e sair" o contorna, porque rascunho incompleto é estado legítimo
- [x] Escolha de compartilhamento e opção "Não vou compartilhar desta vez" (14.2) — **C5 verde**. Escolha **exclusiva**, e não a multiescolha do protótipo: o banco guarda uma modalidade e o acréscimo é o mesmo em qualquer caso
- [x] Outras formas de divulgação, com especificação obrigatória (14.3) — a etapa é pulada quando a modalidade não é `outros`, e escolher `outros` sem descrição **não grava nada**: gravar violaria `compartilhamento_outros_exige_descricao`, e inventar uma descrição seria dado falso
- [x] Resumo da remuneração por classe com composição do valor (14.4) — **C6 verde**. A previsão vem de `calcular_remuneracao`, a **mesma** função que `enviar_avaliacao` usa para gravar. Concluída, a tela passa a mostrar `ganho_curador`, que congelou classe, prazo e percentuais — uma nova previsão leria a `configuracao` de hoje
- [x] Concluir avaliação e liberar crédito, em transação única (14.4) — a ação manda o que está **gravado**, não o que a tela tem em mão. Provado de ponta a ponta: Bronze no prazo, piso 30% + 3% do feedback = 33% de R$ 20,00 → R$ 6,60, com `valor + comissão = base`
- [x] Salvar e sair em todas as etapas, com retomada pelo `passo_atual` — "Voltar" é **link**, e não submit: voltar não grava, e como submit precisaria burlar a validação do passo

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
- [x] Job `avisar_prazo_72h` — aviso antes de vencer, evento crítico, uma vez por envio (`envio.avisado_prazo_em`)
- [x] Job `devolver_claves_sem_resposta` — devolve a Clave, tira a faixa da fila, lança no extrato e notifica
- [x] Garantir que crédito devolvido **não** entra como ganho do curador — asserção explícita na suíte da `0010`
- [x] Estados do envio `Recebeu → Ouviu → Avaliando → Pronto` gravados. `Pronto` e `Devolvido` são reservados às RPCs por trigger

### Gate da R2
- [ ] Os **16 cenários do [Guia de Testes da Release 2](R2/guia-de-testes-r2.md)** passam em E2E — **15 de 16** (A1–A3, B1–B3, B5–B7, C1–C6); falta **B4** (detecção por link), preso às credenciais de Spotify e YouTube. ⚠️ Dos cinco testes de B2, os **três de leitura** passam; os dois que confirmam ou recusam o pagamento exigem `SUPABASE_SERVICE_ROLE_KEY` no ambiente — as RPCs são revogadas de `authenticated` de propósito, e a variável é o item pendente de R0 logo acima. A cadeia de banco (criar → recusar → confirmar → confirmar de novo → recusar depois de aprovado) está provada por sonda no projeto, com rollback
- [x] Compra de Claves credita uma única vez sob webhook duplicado — em três camadas: o índice único de uma compra por pedido (`0007`), o `return null` de `confirmar_pedido_clave` quando o pedido já está aprovado, e o `if (eventoNovo)` da ação, que só confirma quando `registrar_evento_provedor` diz que o evento é novo. O checkout simulado percorre esse caminho de propósito — um caminho que só o webhook exercita é um caminho que ninguém testa
- [x] Avaliação concluída gera ganho com o percentual correto por classe e prazo — provado nos dois níveis: a RPC direto na suíte da `0009`, e o fio tela → ação → RPC em C6. Bronze no prazo com o feedback longo: piso 30% + 3% = 33% de R$ 20,00 → R$ 6,60
- [ ] Devolução de 7 dias aparece no extrato e remove a faixa da fila
- [x] `repasse + comissão = valor da transação` — garantido por `check` em `ganho_curador`, e não por convenção

---

## Transversais — qualidade e conformidade

### Testes
- [x] Cálculo de remuneração por classe coberto na suíte SQL da `0009` (piso, acréscimos, teto, penalidade, arredondamento e invariante do rateio)
- [x] Saldo derivado de `lancamento_clave` coberto nas suítes da `0007` e `0010`
- [x] Testes unitários dos schemas Zod — os da avaliação; o que eles fixam não é "o Zod funciona", são as decisões que o esquema carrega: vazio é `null` e não 0, rascunho incompleto passa, e `nao_compartilhou` não leva link
- [x] Testes de RLS tabela por tabela — 231 asserções em [`supabase/testes/`](../supabase/testes/)
- [x] Teste de idempotência do webhook de pagamento — na suíte da `0007`
- [ ] E2E dos 16 cenários do Guia de Testes da Release 2 — 14 verdes; a carteira de `e2e_artista` é semeada pelas **RPCs reais** (compra, seleção e devolução por SLA), nunca por `insert` no ledger, que é append-only. ⚠️ C6 **consome** um envio por execução, e [`dados-e2e.sql`](../supabase/testes/dados-e2e.sql) o repõe: o seed tem de rodar antes de cada rodada, e o CI ainda não o roda

### Interface
- [ ] Revisão de empty states em todas as listas — no beta tudo começa sem dados
- [ ] Códigos de erro tipados, com tradução na camada de View
- [ ] Revisão de acessibilidade: anel de foco, contraste AA, `aria-sort`, alvo de toque, foco preso em modal com ESC e clique-fora
- [ ] Suporte a pt-BR, es e en na interface

### Conformidade e governança
- [x] Job `expurgar_contas_excluidas` (LGPD, 30 dias) — **anonimiza** em vez de apagar, porque o ledger é append-only e há retenção fiscal. Decisão de jurídico a confirmar; ver o cabeçalho da `0011`
- [ ] Auditoria de thresholds: nenhum número de negócio hardcoded — tudo vem de `configuracao`
- [ ] Conferir que todo evento de R1 e R2 grava em `notificacao` (a central de leitura chega na R5)
- [ ] Usar **"Envios"**, nunca "Submissões", na interface do admin
