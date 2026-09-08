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

| Migration | Data | Resultado | Advisors |
|---|---|---|---|
| `0000b_extensoes` | 2026-09-08 | sem asserções (só extensões) | limpo |
| `0001_identidade` | 2026-09-08 | `OK 0001_identidade` — 22 asserções | 3 findings, corrigidos na `0001b` |
| `0001b_privilegios_de_funcao` | 2026-09-08 | coberta pela suíte da `0001` | 2 WARN aceitos, ver abaixo |
| `0002_perfis` | 2026-09-08 | `OK 0002_perfis` — 27 asserções | 5 WARN aceitos (mesma classe) |
| `0003_admin_auditoria` | 2026-09-08 | `OK 0003_admin_auditoria` — 22 asserções | idem |
| `0004_configuracao` | 2026-09-08 | `OK 0004_configuracao` — 19 asserções | idem |
| `0005_notificacoes` | 2026-09-08 | `OK 0005_notificacoes` — 24 asserções | idem |

### WARN aceitos

`get_advisors(security)` aponta 7 findings da classe
`authenticated_security_definer_function_executable`. **Todos são intencionais**,
e nenhum é acessível por `anon`:

| Função | Por que `authenticated` precisa executá-la |
|---|---|
| `tem_papel(papel)` | helper de RLS, chamado de dentro das policies |
| `e_admin()` | idem |
| `tem_permissao(modulo, escrita)` | idem, e é a 3ª camada de autorização no serviço |
| `meu_perfil_artista_id()` | idem — evita comparar `perfil_artista_id` com `auth.uid()` |
| `meu_perfil_curador_id()` | idem |
| `ler_contexto_sessao()` | o middleware a chama com a sessão do usuário, a cada navegação |
| `aceitar_convite_admin(token)` | quem aceita o convite está autenticado, e é o único caminho para o papel `admin` |

O que **não** está nessa lista, e foi deliberadamente revogado de
`authenticated`: `registrar_notificacao`, `registrar_auditoria`,
`criar_perfil_para_novo_usuario`, `atualizar_atualizado_em`,
`proibir_remover_servico_feedback`, `proibir_autopromocao_de_classe` e
`proibir_reescrever_notificacao`. Nenhuma delas tem razão para estar na
superfície REST.

## Pegadinha que vale para toda função

`revoke execute on function f() from public` **não basta** no Supabase: os
*default privileges* concedem `execute` diretamente a `anon`, `authenticated` e
`service_role`, e revogar de PUBLIC deixa esses grants intactos. Toda função
nova precisa de `revoke ... from anon` (e de `authenticated`, quando não for
para uso do cliente) por nome de papel. Foi o que a `0001b` corrigiu.
