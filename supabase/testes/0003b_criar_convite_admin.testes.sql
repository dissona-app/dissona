-- ============================================================================
-- Testes das migrations 0003b e 0003c · emissão de convite da equipe
--
-- Roda concatenado a `_ajuda.sql`. Ver o cabeçalho daquele arquivo.
--
-- A asserção que dá sentido a esta migration é a última: o token emitido aqui
-- é aceito por `aceitar_convite_admin` (0003). As duas funções calculam o mesmo
-- `sha256` do mesmo jeito, e essa é a única razão de a emissão ter saído do
-- TypeScript — duas implementações do hash não falham em teste, falham em
-- produção como "convite inválido" para todo mundo.
--
-- O token em claro não é persistido em lugar nenhum. Para poder afirmar isso, a
-- suíte o guarda numa tabela temporária: é o teste que precisa dele, não o
-- produto.
--
-- As asserções de caixa do e-mail ("NOVO@" reenviando sobre "novo@") são a
-- evidência da `0003c`: foi este arquivo que encontrou o `citext` comparado
-- como `text` dentro de função com `search_path` vazio. Ver o cabeçalho da
-- `0003c`.
-- ============================================================================

-- --------------------------------------------------------------- fixtures ---

insert into membro_admin (perfil_id, papel_admin)
select id, 'administrador' from ator where papel = 'admin';

-- `suporte` só lê `gestao` no seed da `0003` — não gere equipe. É contra ele
-- que se prova que a terceira camada de autorização não é decorativa.
insert into membro_admin (perfil_id, papel_admin)
select id, 'suporte' from ator where papel = 'curador';

-- A pessoa convidada. Ela já tem conta no Auth quando abre o link: o convite do
-- Supabase cria a conta e confirma o e-mail antes de a nossa RPC de aceite
-- rodar.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
values (
  '00000000-0000-0000-0000-000000000000',
  '88888888-8888-8888-8888-888888888888',
  'authenticated', 'authenticated',
  'novo@dissona.com.br',
  extensions.crypt('senha-de-teste-1', extensions.gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"nome_completo":"Teste convidado","aceite_termos":"true"}'::jsonb
);

create temporary table convite_emitido (
  rotulo text primary key,
  convite_id uuid,
  token text,
  expira_em timestamptz
) on commit drop;

grant select, insert on convite_emitido to authenticated;

-- ============================== quem nao gere equipe nao convida ============

reset role;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar_sqlstate(
  'select 1 from criar_convite_admin(''alguem@dissona.com.br'', ''moderador'')',
  'DS020',
  'conta sem papel admin nao emite convite de administrador'
);

reset role;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar_sqlstate(
  'select 1 from criar_convite_admin(''alguem@dissona.com.br'', ''moderador'')',
  'DS020',
  'membro suporte nao gere equipe, e a RPC nega mesmo com a policy desligada'
);

-- ============================================= o administrador convida ======

reset role;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar_sqlstate(
  'select 1 from criar_convite_admin(''sem-arroba'', ''suporte'')',
  'DS021',
  'e-mail sem @ e recusado'
);

select pg_temp.afirmar_sqlstate(
  'select 1 from criar_convite_admin(''   '', ''suporte'')',
  'DS021',
  'e-mail em branco e recusado'
);

select pg_temp.afirmar_sqlstate(
  'select 1 from criar_convite_admin(''x@y.z'', ''suporte'', 0)',
  'DS021',
  'validade nao positiva e recusada'
);

insert into convite_emitido (rotulo, convite_id, token, expira_em)
select 'primeiro', convite_id, token, expira_em
from criar_convite_admin('novo@dissona.com.br', 'moderador');

select pg_temp.afirmar(
  (select length(token) = 64 from convite_emitido where rotulo = 'primeiro'),
  'o token sao 32 bytes aleatorios em hex'
);

select pg_temp.afirmar(
  (select expira_em > now() + interval '6 days'
      and expira_em < now() + interval '8 days'
     from convite_emitido where rotulo = 'primeiro'),
  'a validade padrao e de 7 dias'
);

-- "Reenviar convite" (27.2) substitui o pendente. O e-mail é `citext`, então a
-- caixa diferente é o mesmo endereço — e o índice único parcial só admite um
-- pendente por endereço.
insert into convite_emitido (rotulo, convite_id, token, expira_em)
select 'reenviado', convite_id, token, expira_em
from criar_convite_admin('NOVO@dissona.com.br', 'financeiro');

select pg_temp.afirmar(
  (select count(*) from convite_admin
    where email = 'novo@dissona.com.br' and aceito_em is null) = 1,
  'reenviar deixa um pendente so, ignorando a caixa do e-mail'
);

select pg_temp.afirmar(
  (select e.token <> p.token
     from convite_emitido e, convite_emitido p
    where e.rotulo = 'reenviado' and p.rotulo = 'primeiro'),
  'reenviar rotaciona o token — o link antigo pode ter ido para a caixa errada'
);

-- =========================================== o token nao e persistido ======

reset role;
set local request.jwt.claims = '{}';

select pg_temp.afirmar(
  (select c.token_hash = pg_catalog.encode(extensions.digest(e.token, 'sha256'), 'hex')
     from convite_admin c
     join convite_emitido e on e.convite_id = c.id
    where e.rotulo = 'reenviado'),
  'o banco guarda o sha256 do token, e o aceite recalcula o mesmo hash'
);

select pg_temp.afirmar(
  not exists (
    select 1 from convite_admin c
      join convite_emitido e on e.rotulo = 'reenviado'
     where c.token_hash = e.token
  ),
  'o token em claro nao aparece em convite_admin'
);

-- ================================ o aceite fecha o ciclo (0003 + 0003b) ====

reset role;
set local request.jwt.claims = '{"sub":"88888888-8888-8888-8888-888888888888","role":"authenticated"}';
set local role authenticated;

-- Antes do aceite a pessoa não é da equipe, e não vê nada de `convite_admin` —
-- inclusive o convite dela. O `token_hash` não é legível por quem não gere
-- equipe (0003), e o aceite compara o hash por dentro.
select pg_temp.afirmar_invisivel(
  'select 1 from convite_admin',
  'o convidado nao le convite_admin — nem o convite dele'
);

do $$
declare
  v_membro uuid;
  v_token text := (select token from convite_emitido where rotulo = 'reenviado');
begin
  v_membro := aceitar_convite_admin(v_token);

  perform pg_temp.afirmar(v_membro is not null, 'o aceite devolve o id do membro');

  perform pg_temp.afirmar(
    (select papel_admin from membro_admin where id = v_membro) = 'financeiro',
    'o papel do membro e o do convite reenviado, e nao o do primeiro'
  );
end $$;

select pg_temp.afirmar(
  (select count(*) from papel_usuario
    where perfil_id = '88888888-8888-8888-8888-888888888888'
      and papel = 'admin' and ativo) = 1,
  'o aceite concede o papel admin — o unico caminho para ele'
);

select pg_temp.afirmar(
  e_admin(),
  'a sessao do convidado ja e reconhecida como admin'
);

-- Uso único: o token vale uma vez.
select pg_temp.afirmar_sqlstate(
  format('select aceitar_convite_admin(%L)',
         (select token from convite_emitido where rotulo = 'reenviado')),
  'DS021',
  'o token do convite vale uma unica vez'
);

-- O papel do convite manda de verdade: `financeiro` não gere equipe.
select pg_temp.afirmar_sqlstate(
  'select 1 from criar_convite_admin(''outro@dissona.com.br'', ''suporte'')',
  'DS020',
  'membro financeiro nao convida — o papel do convite vale na hora'
);

-- ==================================================== sem sessao (anon) ====

reset role;
set local request.jwt.claims = '{"role":"anon"}';
set local role anon;

select pg_temp.afirmar_bloqueado(
  'select 1 from criar_convite_admin(''x@dissona.com.br'', ''suporte'')',
  'anon nao executa criar_convite_admin'
);

-- ---------------------------------------------------------------------------

reset role;
select 'OK 0003b_criar_convite_admin' as resultado;

rollback;
