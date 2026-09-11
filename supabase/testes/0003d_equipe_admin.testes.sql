-- ============================================================================
-- Testes das migrations 0003d e 0003e · equipe, papéis e o motivo da auditoria
--
-- Roda concatenado a `_ajuda.sql`. Ver o cabeçalho daquele arquivo.
--
-- Quatro grupos, e cada um prova uma decisão da migration:
--
--  1. `ler_equipe_admin` é fechada por `tem_permissao('equipe')` — mesmo sendo
--     `security definer`, e apesar de ler `auth.users`. Sem esta asserção, a
--     função seria um vazamento de todos os e-mails da equipe para qualquer
--     conta autenticada.
--  2. A lista une membro e convite pendente, sem dobrar quem tem os dois.
--  3. Ninguém altera o próprio papel nem desativa a própria conta. Na tela isso
--     é um `select` desabilitado; aqui tem de ser exceção, senão o único
--     administrador se rebaixa e tranca a organização fora da gestão.
--  4. O **motivo** chega em `log_auditoria`. É a razão de as mutações serem
--     funções em vez de `update` do cliente, e sem esta asserção a migration
--     inteira perderia o propósito sem ninguém notar.
--
-- A asserção do grupo 6 sobre `atualizar_meu_cargo` é a evidência da `0003e`:
-- ela recebia `42883` em vez de `DS020`, porque a `0003d` chamava
-- `pg_catalog.nullif(...)` — e `NULLIF` é gramática, não função. A função nunca
-- teria funcionado para ninguém, e é este arquivo que descobriu.
-- ============================================================================

-- --------------------------------------------------------------- fixtures ---

insert into membro_admin (perfil_id, papel_admin, cargo)
select id, 'administrador', 'Head de operações' from ator where papel = 'admin';

-- O curador vira `suporte`: é contra ele que se prova que a terceira camada de
-- autorização não é decorativa. `suporte` só lê `gestao` no seed da `0003`.
insert into membro_admin (perfil_id, papel_admin, cargo)
select id, 'suporte', 'Suporte' from ator where papel = 'curador';

-- Um convite pendente para quem **não** é da equipe, e um para o endereço de
-- alguém que já é: o segundo não deve aparecer como linha própria.
insert into convite_admin (email, papel_admin, token_hash, expira_em, convidado_por)
select
  'pendente@dissona.com.br',
  'moderador',
  pg_catalog.encode(extensions.digest('token-pendente', 'sha256'), 'hex'),
  now() + interval '7 days',
  a.id
from ator a where a.papel = 'admin';

insert into convite_admin (email, papel_admin, token_hash, expira_em, convidado_por)
select
  't_curador@teste.dissona.local',
  'financeiro',
  pg_catalog.encode(extensions.digest('token-duplicado', 'sha256'), 'hex'),
  now() + interval '7 days',
  a.id
from ator a where a.papel = 'admin';

-- Um convite já vencido, para provar a situação `expirado`.
insert into convite_admin (email, papel_admin, token_hash, expira_em, convidado_por)
select
  'vencido@dissona.com.br',
  'suporte',
  pg_catalog.encode(extensions.digest('token-vencido', 'sha256'), 'hex'),
  now() - interval '1 hour',
  a.id
from ator a where a.papel = 'admin';

-- ================================= 1 · a leitura é fechada por permissão ====

reset role;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

-- `security definer` roda com a RLS desligada, então a função **tem** de
-- checar. Zero linhas, e não erro: a função filtra no `where`, o que é o
-- comportamento certo para uma listagem.
select pg_temp.afirmar_invisivel(
  'select 1 from ler_equipe_admin()',
  'conta sem papel admin nao ve a equipe'
);

reset role;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar_invisivel(
  'select 1 from ler_equipe_admin()',
  'membro suporte nao gere equipe, e por isso nao ve a lista'
);

-- ============================ 2 · a lista une membro e convite pendente =====

reset role;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
set local role authenticated;

-- Contagem **relativa** ao fixture, e não absoluta: o projeto de Preview e
-- Production é o mesmo (open-questions #25) e já tem os membros do E2E
-- semeados em `dados-e2e.sql`. Um `count(*) = 4` passaria hoje e quebraria na
-- próxima persona que alguém acrescentasse — o que é pior que não testar, porque
-- a falha não aponta para o defeito.
select pg_temp.afirmar(
  pg_temp.quantas(
    'select 1 from ler_equipe_admin()
      where email in (
        ''t_admin@teste.dissona.local'',
        ''t_curador@teste.dissona.local'',
        ''pendente@dissona.com.br'',
        ''vencido@dissona.com.br''
      )'
  ) = 4,
  'os dois integrantes e os dois convites do fixture aparecem (o terceiro convite e de quem ja e da equipe)'
);

select pg_temp.afirmar(
  (select count(*) = 1
     from ler_equipe_admin()
    where email = 't_curador@teste.dissona.local'),
  'quem ja e da equipe aparece UMA vez, mesmo com convite pendente no mesmo e-mail'
);

select pg_temp.afirmar(
  (select membro_id is not null and convite_id is null and situacao = 'ativo'
     from ler_equipe_admin()
    where email = 't_curador@teste.dissona.local'),
  'e aparece como integrante, nao como convite'
);

select pg_temp.afirmar(
  (select situacao = 'pendente' and expira_em > now() and nome is null
     from ler_equipe_admin() where email = 'pendente@dissona.com.br'),
  'convite dentro da validade e pendente, e nao tem nome — ninguem aceitou ainda'
);

select pg_temp.afirmar(
  (select situacao = 'expirado'
     from ler_equipe_admin() where email = 'vencido@dissona.com.br'),
  'convite fora da validade e expirado, e nao pendente'
);

-- O e-mail vem de `auth.users`, que é a única razão de a função ser
-- `security definer`. Sem isto, a tela 27.2 seria uma lista sem endereços.
select pg_temp.afirmar(
  (select email = 't_admin@teste.dissona.local' and nome = 'Teste admin'
     from ler_equipe_admin() where sou_eu),
  'a minha linha traz o e-mail de auth.users e o nome de perfil'
);

select pg_temp.afirmar(
  pg_temp.quantas('select 1 from ler_equipe_admin() where sou_eu') = 1,
  'exatamente uma linha e a minha'
);

-- ================== 3 · ninguem mexe na propria linha administrativa ========

select pg_temp.afirmar_sqlstate(
  format(
    'select alterar_papel_do_membro(%L, ''suporte'', ''teste'')',
    (select id from membro_admin where perfil_id = (select id from ator where papel = 'admin'))
  ),
  'DS020',
  'o administrador nao rebaixa o proprio papel'
);

select pg_temp.afirmar_sqlstate(
  format(
    'select alterar_acesso_do_membro(%L, false, ''teste'')',
    (select id from membro_admin where perfil_id = (select id from ator where papel = 'admin'))
  ),
  'DS020',
  'o administrador nao desativa a propria conta'
);

select pg_temp.afirmar_sqlstate(
  'select alterar_papel_do_membro(''00000000-0000-0000-0000-0000000000ff'', ''suporte'', ''teste'')',
  'DS021',
  'integrante inexistente e recusado, e nao ignorado em silencio'
);

-- ============================== 4 · o motivo chega na auditoria =============

create temporary table alvo (membro_id uuid) on commit drop;
grant select on alvo to authenticated;

insert into alvo (membro_id)
select id from membro_admin where perfil_id = (select id from ator where papel = 'curador');

select alterar_papel_do_membro(
  (select membro_id from alvo),
  'financeiro',
  'realocado para o time financeiro'
);

select pg_temp.afirmar(
  (select papel_admin = 'financeiro' from membro_admin where id = (select membro_id from alvo)),
  'o papel mudou'
);

-- Esta é a asserção que justifica a migration. `registrar_auditoria()` lê
-- `current_setting('dissona.motivo')`, que só existe dentro da transação do
-- pedido — e pelo PostgREST cada `update` é a sua própria transação, sem onde
-- marcá-la. Se o motivo chegou, a função é o caminho certo.
select pg_temp.afirmar(
  (select motivo = 'realocado para o time financeiro'
     from log_auditoria
    where tabela = 'membro_admin'
      and registro_id = (select membro_id::text from alvo)
      -- Minúsculo: `registrar_auditoria` grava `lower(tg_op)`.
      and acao = 'update'
    order by id desc limit 1),
  'o motivo passado a RPC chega em log_auditoria'
);

select pg_temp.afirmar(
  (select ator_id = (select id from ator where papel = 'admin')
     from log_auditoria
    where tabela = 'membro_admin'
      and registro_id = (select membro_id::text from alvo)
    order by id desc limit 1),
  'e o ator registrado e quem chamou, nao o dono da funcao'
);

select alterar_acesso_do_membro(
  (select membro_id from alvo),
  false,
  'desligamento'
);

select pg_temp.afirmar(
  (select not ativo from membro_admin where id = (select membro_id from alvo)),
  'a desativacao passou'
);

-- =========================== 4b · a matriz de permissoes (27.4) ============

select pg_temp.afirmar_sqlstate(
  'select definir_permissoes_admin(''[{"papel":"administrador","modulo":"gestao","pode_ler":false,"pode_escrever":false}]''::jsonb, ''teste'')',
  'DS020',
  'o administrador mantem acesso total, e a RPC recusa mexer nele'
);

select pg_temp.afirmar_sqlstate(
  'select definir_permissoes_admin(''[{"papel":"moderador","modulo":"equipe","pode_ler":true,"pode_escrever":false}]''::jsonb, ''teste'')',
  'DS020',
  'gerir equipe e papeis e exclusivo do administrador'
);

select pg_temp.afirmar_sqlstate(
  'select definir_permissoes_admin(''[{"papel":"moderador","modulo":"inexistente","pode_ler":true,"pode_escrever":false}]''::jsonb, ''teste'')',
  'DS021',
  'modulo inexistente e recusado, e nao ignorado'
);

select pg_temp.afirmar_sqlstate(
  'select definir_permissoes_admin(''{"papel":"moderador"}''::jsonb, ''teste'')',
  'DS021',
  'a matriz tem de ser uma lista'
);

-- Desligar `equipe` de quem nunca a teve é permitido: é o estado que a tela
-- desenha travado em falso, e recusá-lo faria o Salvar da matriz falhar sempre.
select pg_temp.afirmar(
  definir_permissoes_admin(
    '[{"papel":"moderador","modulo":"equipe","pode_ler":false,"pode_escrever":false}]'::jsonb,
    'teste'
  ) = 1,
  'desligar equipe de quem nao a tem passa — e o que a tela envia em toda gravacao'
);

select pg_temp.afirmar(
  definir_permissoes_admin(
    '[{"papel":"suporte","modulo":"moderacao","pode_ler":false,"pode_escrever":true}]'::jsonb,
    'suporte passa a moderar'
  ) = 1,
  'a matriz grava'
);

-- `escrever` implica `ler`, normalizado pela RPC: o `check
-- permissao_admin_escrever_exige_ler` recusaria `pode_escrever` sozinho, e a
-- tela não tem de conhecer essa regra.
select pg_temp.afirmar(
  (select pode_ler and pode_escrever
     from permissao_admin where papel_admin = 'suporte' and modulo = 'moderacao'),
  'escrever implica ler — a RPC normaliza em vez de estourar o check'
);

select pg_temp.afirmar(
  (select motivo = 'suporte passa a moderar'
     from log_auditoria
    where tabela = 'permissao_admin' and acao = 'update'
    order by id desc limit 1),
  'a alteracao da matriz tambem grava o motivo'
);

-- ============================ 5 · quem nao gere equipe nao escreve =========

reset role;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar_sqlstate(
  format('select alterar_papel_do_membro(%L, ''suporte'', ''teste'')',
         (select membro_id from alvo)),
  'DS020',
  'conta sem papel admin nao altera papel de ninguem'
);

select pg_temp.afirmar_sqlstate(
  format('select alterar_acesso_do_membro(%L, true, ''teste'')',
         (select membro_id from alvo)),
  'DS020',
  'conta sem papel admin nao reativa ninguem'
);

select pg_temp.afirmar_sqlstate(
  'select definir_permissoes_admin(''[]''::jsonb, ''teste'')',
  'DS020',
  'conta sem papel admin nao mexe na matriz'
);

-- ================================ 6 · o proprio cargo (27.1) ===============

select pg_temp.afirmar_sqlstate(
  'select atualizar_meu_cargo(''Diretor'')',
  'DS020',
  'conta fora da equipe administrativa nao tem cargo para atualizar'
);

reset role;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
set local role authenticated;

-- O ponto desta função: `suporte` **não** gere equipe, e a policy de update de
-- `membro_admin` exige `tem_permissao('equipe', true)`. Sem ela, quem é suporte
-- não conseguiria salvar o próprio cargo na tela 27.1.
select atualizar_meu_cargo('Atendimento sênior');

select pg_temp.afirmar(
  (select cargo = 'Atendimento sênior'
     from membro_admin where perfil_id = (select id from ator where papel = 'curador')),
  'o integrante salva o proprio cargo mesmo sem permissao de equipe'
);

select atualizar_meu_cargo('   ');

select pg_temp.afirmar(
  (select cargo is null
     from membro_admin where perfil_id = (select id from ator where papel = 'curador')),
  'cargo em branco vira nulo, e nao string vazia'
);

-- E a função toca **uma** coluna: o papel dela continua sendo o que era.
select pg_temp.afirmar(
  (select papel_admin = 'financeiro'
     from membro_admin where perfil_id = (select id from ator where papel = 'curador')),
  'atualizar_meu_cargo nao mexe em papel_admin'
);

-- ==================================================== sem sessao (anon) ====

reset role;
set local request.jwt.claims = '{"role":"anon"}';
set local role anon;

select pg_temp.afirmar_bloqueado(
  'select 1 from ler_equipe_admin()',
  'anon nao executa ler_equipe_admin'
);

select pg_temp.afirmar_bloqueado(
  'select atualizar_meu_cargo(''x'')',
  'anon nao executa atualizar_meu_cargo'
);

select pg_temp.afirmar_bloqueado(
  'select definir_permissoes_admin(''[]''::jsonb, ''x'')',
  'anon nao executa definir_permissoes_admin'
);

-- ---------------------------------------------------------------------------

reset role;
select 'OK 0003d_equipe_admin (+0003e)' as resultado;

rollback;
