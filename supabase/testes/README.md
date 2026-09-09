# Suíte de RLS

Prova o item **"migration aplicada em dev *e* com policy de RLS testada"** da
[Definition of Done](../../docs/architecture.md#10-definition-of-done).

## Como rodar

Cada arquivo `00NN_*.testes.sql` é a **segunda metade** de uma transação que
[`_ajuda.sql`](_ajuda.sql) abre. A invocação é a concatenação dos dois, colada
inteira numa chamada de `execute_sql` do MCP:

```bash
cat supabase/testes/_ajuda.sql supabase/testes/0001_identidade.testes.sql
```

Duas exceções, que **não** se concatenam a `_ajuda.sql` porque montam os
próprios atores e abrem a própria transação: `0010_rpcs_sla.testes.sql` (precisa
de dois curadores) e `0007b_pacote_exclusao.testes.sql`.

E um arquivo que não é teste: [`dados-e2e.sql`](dados-e2e.sql) cria as contas e
o catálogo da suíte Playwright. Ele **commita**, ao contrário de todos os
outros — as contas têm de sobreviver para o navegador entrar com elas. Ver o
cabeçalho do arquivo para a senha, que não é versionada.

Saída esperada: uma única linha `OK <migration>`. Qualquer falha aborta a
transação e nomeia a asserção — `FALHOU: <rótulo>`.

## Por que a forma é essa

- **Uma transação só.** O `execute_sql` roda como `postgres`, que é `bypassrls`.
  Sem `set local role authenticated` todo teste de RLS passa vacuamente, e
  `set local` só existe dentro de transação.
- **`rollback` sempre, nunca `commit`.** Preview e Production compartilham o
  mesmo projeto Supabase ([#25](../../docs/open-questions.md)); um `commit`
  aqui poluiria o banco que serve a demo.
- **Helpers em `pg_temp`.** São de sessão e morrem no fim. Um schema `testes`
  exigiria migration — código de teste em produção.

## Os três modos de negação da RLS

A descoberta que moldou os helpers: a RLS nega de três formas, e confundi-las
faz um teste passar por engano.

| Situação | O que acontece | Helper |
|---|---|---|
| `select` numa linha fora do `using` | zero linhas | `afirmar_invisivel` |
| `update`/`delete` fora do `using`, **ou sem policy nenhuma** | zero linhas afetadas, **sem erro** | `afirmar_sem_efeito` |
| `insert` sem policy, ou `insert`/`update` violando o `with check` | `42501` | `afirmar_bloqueado` |

O segundo caso é o traiçoeiro, e vale também quando a tabela **não tem** policy
de `update`/`delete`: o comando não estoura, apenas não alcança linha nenhuma.
Um `insert` na mesma situação, por outro lado, estoura com `42501` — não há o
que filtrar. Com o helper errado, o teste passaria sem provar nada.

## Registro de execuções

Contra o projeto `fhqcibjzmowcjkdrqyvi`. A primeira rodada foi em 2026-09-08;
a segunda em 2026-09-09, depois de `dados-e2e.sql` popular o banco — e a
segunda encontrou coisas que a primeira não podia encontrar (ver
"Isolamento", abaixo).

| Migration | Resultado | Observação |
|---|---|---|
| `0000b_extensoes` | sem asserções | só extensões |
| `0001_identidade` | `OK` — 22 asserções | 3 findings, corrigidos na `0001b` |
| `0001b_privilegios_de_funcao` | coberta pela suíte da `0001` | — |
| `0002_perfis` | `OK` — 27 asserções | — |
| `0003_admin_auditoria` | `OK` — 22 asserções | passou de primeira |
| `0004_configuracao` | `OK` — 19 asserções | duas asserções minhas de aritmética estavam erradas; ver abaixo |
| `0005_notificacoes` | `OK` — 24 asserções | passou de primeira |
| `0006_faixa_envio` | `OK` — 26 asserções | expôs a recursão de policy (`0006b`) e o trigger cego (`0006c`) |
| `0007_claves` | `OK` — 34 asserções | cobre "credita uma única vez sob webhook duplicado" |
| `0007b_pacote_exclusao` | `OK` — 12 asserções | desativar ≠ excluir; exclusão irreversível |
| `0007c_codigo_de_erro_do_pacote` | coberta pela suíte da `0007b` | corrige a colisão de `DS030` |
| `0008_avaliacao` | coberta pela suíte da `0009` | seed dos 11 critérios conferido |
| `0009_remuneracao` | `OK` — 31 asserções | cobertura obrigatória (data-model §10) |
| `0010_rpcs_sla` | `OK` — 26 asserções | ciclo econômico completo; expôs o estado inválido corrigido na `0010b` |
| `0011_jobs` | 3 `cron.job` agendados | conferido em `cron.job` |

### O que os testes pegaram, e que a especificação não previa

1. **Recursão mútua de policy** (`42P17`). A policy de `faixa` consultava
   `envio`, e a de `envio` consultava `faixa`. RLS se aplica também às tabelas
   referenciadas de dentro de uma policy, então a leitura mais simples do fluxo
   da R2 — a fila do curador — abortava. Resolvido na `0006b` movendo o lado
   cruzado para funções `security definer`. **Regra que ficou:** policy que
   precisa de outra tabela protegida por RLS chama função `security definer`,
   nunca `exists` direto.

2. **Trigger de guarda cego.** `proibir_editar_faixa_em_curadoria` nasceu
   `security definer` **e** decidindo por `current_user <> 'authenticated'`. As
   duas coisas se anulam: dentro de uma função `definer` o `current_user` já é
   o dono, então a guarda nunca bloqueava — o artista reescrevia o título de
   uma faixa em curadoria. Corrigido na `0006c` (`security invoker`).

3. **Estado intermediário que o schema recusa.**
   `confirmar_selecao_curadores` inseria o `envio` com `total_claves = 0` para
   depois somar os serviços, e `check (total_claves > 0)` barrava. A correção
   não foi relaxar o check: foi apurar o subtotal antes de inserir (`0010b`).

4. **Aritmética da tabela de remuneração.** Duas asserções que eu havia escrito
   estavam erradas, e o teste as pegou: o piso do Ouro é 45, não 50 — os 50%
   são o **teto na avaliação**; e o vão uniforme de 12 pontos está entre
   `teto_base` e `teto_max`, não entre piso e `teto_base` (esse varia: 8, 3, 5).

5. **Colisão de `SQLSTATE`.** A `0007b` levantou `DS030` na guarda de exclusão
   de pacote. `DS030` já era o código de "catálogo ou `configuracao`
   ausente", usado por quatro funções. A colisão **não aparece em teste de
   banco nenhum** — o `sqlstate` que sobe é o mesmo, e o teste da `0007b`
   afirmava exatamente aquele código. Ela só apareceu ao escrever
   `src/lib/supabase/erros.ts`, o mapa `SQLSTATE → CodigoErro`: um só mapa não
   pode devolver `CONFIGURACAO_AUSENTE` e `PACOTE_EXCLUIDO` para a mesma
   entrada, e o usuário veria "configuração ausente" ao tentar reativar um
   pacote excluído. Corrigido na `0007c` (`DS014`). **Lição:** a tabela de
   códigos precisa morar num arquivo só; espalhada por módulo, a colisão não
   tem onde aparecer.

6. **`teto_max` é inalcançável.** Com os acréscimos do catálogo, o máximo real é
   46 / 51 / 58 contra tetos de 50 / 55 / 62 — sobram exatamente 4 pontos nas
   três classes. Ou falta um acréscimo de 4 pontos, ou os tetos são
   aspiracionais. **Pergunta aberta para o cliente**, e o teste fixa a folga
   para ela não mudar em silêncio.

### Isolamento: a suíte dependia de as tabelas estarem vazias

Descoberto em 2026-09-09, ao rodar a suíte pela primeira vez **depois** de
`dados-e2e.sql` popular o banco com o catálogo do protótipo e as três contas da
E2E. Seis asserções e cinco fixtures quebraram de uma vez, e nenhuma delas
estava errada sobre RLS — todas estavam erradas sobre o **escopo**:

- `count(*) from perfil = 4` passou a ver 7 (3 contas novas).
- `quantas('select 1 from pacote_clave') = 3` passou a ver 7 (4 pacotes novos).
- `count(*) from log_auditoria where tabela = 'membro_admin'` passou a ver os
  inserts do seed.
- `count(*) from notificacao where evento = 'nova_compra_claves' = 1` passou a
  ver 3, porque evento com destinatário `admin` **abre em leque** para toda a
  equipe ativa — e o seed criou dois membros a mais.
- Na `0010`, cinco `insert ... select ... from perfil_artista` **sem `where`**
  passaram a produzir duas linhas em vez de uma, e `avisar_prazo_72h()`
  devolveu 2 em lugar de 1 — uma falha cujo sintoma não aponta para a causa.

Toda contagem agora é filtrada (pelo prefixo `T ` nos nomes de fixture, ou por
`in (select id from ator)`), e todo `insert` de fixture é escopado ao ator do
teste. O projeto Supabase é compartilhado entre Preview, Production e E2E
([#25](../../docs/open-questions.md)); **"a tabela é minha" nunca foi verdade
— só ainda não tinha sido violada.**

Um teste de RLS que depende de a tabela estar vazia é um teste que funciona uma
vez.

### Advisors

Advisors de segurança no estado final (2026-09-09): **18 WARN e 1 INFO, todos
intencionais**. Nenhum finding envolve `anon`, e a `0007b`/`0007c` não
acrescentaram nenhum — `proibir_reviver_pacote` é `security invoker` de
propósito, e por isso **não** aparece na lista de definer abaixo.

O WARN a mais em relação à primeira rodada é `auth_leaked_password_protection`,
que é configuração do Auth e não de schema.

O INFO é `rls_enabled_no_policy` em `evento_provedor`, e é exatamente o
desenho: RLS habilitada com zero policies nega a todo papel, e só a RPC
`registrar_evento_provedor` escreve. É a expressão mais limpa da intenção.

Os 17 WARN são da classe `authenticated_security_definer_function_executable`,
e se dividem em dois grupos, ambos necessários:

- **Helpers de RLS**, chamados de dentro das policies: `tem_papel`, `e_admin`,
  `tem_permissao`, `meu_perfil_artista_id`, `meu_perfil_curador_id`,
  `sou_dono_da_faixa`, `sou_dono_do_envio`, `posso_ver_envio`,
  `posso_ver_avaliacao`, `avaliacao_em_rascunho_do_curador`,
  `curador_tem_envio_ativo_na_faixa`, `curador_tem_envio_ativo_no_caminho`.
- **RPCs que o cliente chama**: `ler_contexto_sessao` (middleware, a cada
  navegação), `aceitar_convite_admin`, `criar_pedido_clave`,
  `confirmar_selecao_curadores` e `enviar_avaliacao`.

O que **não** está nessa lista, e foi deliberadamente revogado até de
`authenticated`: `registrar_notificacao`, `registrar_evento_provedor`,
`confirmar_pedido_clave`, `devolver_claves_sem_resposta`, `avisar_prazo_72h`,
`expurgar_contas_excluidas`, `registrar_auditoria` e as sete funções de
trigger. Nenhuma delas tem razão para estar na superfície REST.

## Pegadinha que vale para toda função

`revoke execute on function f() from public` **não basta** no Supabase: os
*default privileges* concedem `execute` diretamente a `anon`, `authenticated` e
`service_role`, e revogar de PUBLIC deixa esses grants intactos. Toda função
nova precisa de `revoke ... from anon` (e de `authenticated`, quando não for
para uso do cliente) por nome de papel. Foi o que a `0001b` corrigiu.
