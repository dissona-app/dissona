-- ============================================================================
-- Testes da migration 0003 · admin, permissões e auditoria
--
-- Roda concatenado a `_ajuda.sql`. Ver o cabeçalho daquele arquivo.
-- ============================================================================

-- ------------------------------------------------------------- fixtures ----

insert into membro_admin (perfil_id, papel_admin, cargo)
select id, 'administrador', 'Direcao' from ator where papel = 'admin';

-- Token em claro só existe aqui, no teste; a tabela guarda o hash.
create temporary table token (nome text primary key, claro text) on commit drop;
insert into token values
  ('valido',   'token-de-teste-valido'),
  ('expirado', 'token-de-teste-expirado'),
  ('de_outro', 'token-de-teste-de-outro-email');

insert into convite_admin (email, papel_admin, token_hash, expira_em, convidado_por)
select
  't_vizinho@teste.dissona.local',
  'moderador',
  pg_catalog.encode(extensions.digest(t.claro, 'sha256'), 'hex'),
  now() + interval '7 days',
  (select id from ator where papel = 'admin')
from token t where t.nome = 'valido';

insert into convite_admin (email, papel_admin, token_hash, expira_em, convidado_por)
select
  'nao_existe@teste.dissona.local',
  'suporte',
  pg_catalog.encode(extensions.digest(t.claro, 'sha256'), 'hex'),
  now() + interval '7 days',
  (select id from ator where papel = 'admin')
from token t where t.nome = 'de_outro';

insert into convite_admin (email, papel_admin, token_hash, expira_em, convidado_por)
select
  't_curador@teste.dissona.local',
  'financeiro',
  pg_catalog.encode(extensions.digest(t.claro, 'sha256'), 'hex'),
  now() - interval '1 hour',
  (select id from ator where papel = 'admin')
from token t where t.nome = 'expirado';

-- ------------------------------------------------------------- seed e checks

select pg_temp.afirmar(
  (select count(*) from permissao_admin) = 24,
  'a matriz tem 4 papeis x 6 modulos'
);

select pg_temp.afirmar_bloqueado(
  'update permissao_admin set pode_escrever = true, pode_ler = false
    where papel_admin = ''suporte'' and modulo = ''gestao''',
  'escrever sem poder ler e um estado incoerente e e recusado'
);

-- Só um convite pendente por e-mail.
select pg_temp.afirmar_bloqueado(
  format('insert into convite_admin (email, papel_admin, token_hash, expira_em, convidado_por)
          values (%L, ''suporte'', ''outro-hash'', now() + interval ''1 day'', %L)',
         't_vizinho@teste.dissona.local', (select id from ator where papel = 'admin')),
  'nao existem dois convites pendentes para o mesmo e-mail'
);

-- ------------------------------------------------------- trigger de auditoria

select pg_temp.afirmar(
  -- Filtrado pelo ator do teste: o seed da suíte E2E também cria membros de
  -- equipe, e o log é append-only e commitado.
  (select count(*) from log_auditoria
    where tabela = 'membro_admin' and acao = 'insert'
      and registro_id in (select ma.id::text from membro_admin ma
                           where ma.perfil_id in (select id from ator))) = 1,
  'o insert em membro_admin foi auditado'
);

-- O `motivo` vem de `current_setting`, que é o contrato com a Server Action.
do $$
begin
  -- `set_config(..., true)` e o equivalente de `set local` dentro de plpgsql.
  perform set_config('dissona.motivo', 'bloqueio por denuncia procedente', true);
  update perfil set situacao = 'bloqueada'
   where id = (select id from ator where papel = 'vizinho');

  perform pg_temp.afirmar(
    (select motivo from log_auditoria
      where tabela = 'perfil' and acao = 'update'
      order by id desc limit 1) = 'bloqueio por denuncia procedente',
    'o trigger le o motivo de current_setting(dissona.motivo)'
  );
end $$;

-- Volta ao normal, senão o vizinho fica bloqueado para os testes seguintes.
update perfil set situacao = 'ativa' where id = (select id from ator where papel = 'vizinho');

-- Nenhum segredo entra no rastro: o log é legível por toda a equipe.
insert into perfil_curador (perfil_id, chave_pix, chave_pix_tipo, asaas_carteira_id)
select id, 'curador@pix.test', 'email', 'wallet_secreta_123'
from ator where papel = 'curador';

select pg_temp.afirmar(
  (select not (depois ? 'chave_pix') and not (depois ? 'asaas_carteira_id')
     from log_auditoria
    where tabela = 'perfil_curador' order by id desc limit 1),
  'chave_pix e asaas_carteira_id sao removidos do rastro'
);

select pg_temp.afirmar(
  (select depois ->> 'classe' from log_auditoria
    where tabela = 'perfil_curador' order by id desc limit 1) = 'bronze',
  'o resto da linha continua no rastro'
);

-- ============================================== tem_permissao, papel a papel

-- O mesmo ator troca de papel administrativo; cada troca é auditada, o que
-- também exercita o trigger em `membro_admin`.
reset role;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar(
  tem_permissao('equipe', true) and tem_permissao('configuracao', true)
  and tem_permissao('gestao', true) and tem_permissao('financeiro', true),
  'administrador escreve em tudo'
);

reset role;
update membro_admin set papel_admin = 'moderador'
 where perfil_id = '44444444-4444-4444-4444-444444444444';
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar(
  tem_permissao('moderacao', true) and tem_permissao('gestao')
  and not tem_permissao('gestao', true)
  and not tem_permissao('financeiro') and not tem_permissao('equipe'),
  'moderador escreve em moderacao, le gestao e nao alcanca financeiro nem equipe'
);

reset role;
update membro_admin set papel_admin = 'financeiro'
 where perfil_id = '44444444-4444-4444-4444-444444444444';
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar(
  tem_permissao('financeiro', true) and tem_permissao('pacotes', true)
  and not tem_permissao('gestao') and not tem_permissao('moderacao')
  and not tem_permissao('configuracao'),
  'financeiro escreve em financeiro e pacotes, e nada mais'
);

reset role;
update membro_admin set papel_admin = 'suporte'
 where perfil_id = '44444444-4444-4444-4444-444444444444';
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar(
  tem_permissao('gestao') and not tem_permissao('gestao', true)
  and not tem_permissao('moderacao') and not tem_permissao('financeiro'),
  'suporte apenas le gestao'
);

-- Suporte não gere equipe: é a regra de tela "Só o Administrador gere equipe".
select pg_temp.afirmar_bloqueado(
  'insert into convite_admin (email, papel_admin, token_hash, expira_em, convidado_por)
     values (''novo@teste.dissona.local'', ''suporte'', ''hash'', now() + interval ''1 day'',
             ''44444444-4444-4444-4444-444444444444'')',
  'suporte nao convida membro'
);

select pg_temp.afirmar_invisivel(
  'select 1 from convite_admin',
  'suporte nao le convites — o token_hash e restrito a quem gere equipe'
);

-- Mas ler o rastro é de toda a equipe.
select pg_temp.afirmar(
  pg_temp.quantas('select 1 from log_auditoria') > 0,
  'toda a equipe le o log de auditoria'
);

select pg_temp.afirmar_bloqueado(
  'insert into log_auditoria (tabela, acao) values (''perfil'', ''forjado'')',
  'ninguem escreve em log_auditoria direto — nao existe policy de insert'
);

-- Devolve o ator ao papel de administrador para o resto do arquivo.
reset role;
update membro_admin set papel_admin = 'administrador'
 where perfil_id = '44444444-4444-4444-4444-444444444444';

-- ==================================== quem nao e admin nao alcanca nada ====

reset role;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar(
  not tem_permissao('gestao') and not tem_permissao('equipe', true),
  'artista nao tem permissao administrativa nenhuma'
);

select pg_temp.afirmar_invisivel('select 1 from log_auditoria', 'artista nao le o rastro');
select pg_temp.afirmar_invisivel('select 1 from convite_admin', 'artista nao le convites');
select pg_temp.afirmar_invisivel('select 1 from permissao_admin', 'artista nao le a matriz');

-- ========================================== aceitar_convite_admin ==========

-- O convidado é o `vizinho`, que hoje só é artista.
reset role;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar(
  not e_admin(),
  'o convidado ainda nao e admin antes do aceite'
);

-- Token de um convite endereçado a outro e-mail: quem tem o link não basta.
do $$
begin
  begin
    perform aceitar_convite_admin('token-de-teste-de-outro-email');
    raise exception 'FALHOU: aceitou convite de outro e-mail' using errcode = 'TS001';
  exception
    when sqlstate 'DS020' then null;
  end;
end $$;

do $$
begin
  begin
    perform aceitar_convite_admin('token-que-nao-existe');
    raise exception 'FALHOU: aceitou token inexistente' using errcode = 'TS001';
  exception
    when sqlstate 'DS021' then null;
  end;
end $$;

-- O caminho feliz: o papel `admin`, que a policy de `papel_usuario` recusa,
-- entra por aqui e só por aqui.
select pg_temp.afirmar(
  aceitar_convite_admin('token-de-teste-valido') is not null,
  'o convidado aceita o convite'
);

select pg_temp.afirmar(
  e_admin() and tem_permissao('moderacao', true),
  'depois do aceite o convidado e admin com o papel do convite'
);

-- Uso único.
do $$
begin
  begin
    perform aceitar_convite_admin('token-de-teste-valido');
    raise exception 'FALHOU: o convite foi aceito duas vezes' using errcode = 'TS001';
  exception
    when sqlstate 'DS021' then null;
  end;
end $$;

-- ------------------------------------------------------- convite expirado --

reset role;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
set local role authenticated;

do $$
begin
  begin
    perform aceitar_convite_admin('token-de-teste-expirado');
    raise exception 'FALHOU: aceitou convite expirado' using errcode = 'TS001';
  exception
    when sqlstate 'DS021' then null;
  end;
end $$;

-- ==================================================== sem sessao (anon) ====

reset role;
set local request.jwt.claims = '{"role":"anon"}';
set local role anon;

select pg_temp.afirmar_invisivel('select 1 from membro_admin', 'anon nao le membro_admin');
select pg_temp.afirmar_invisivel('select 1 from log_auditoria', 'anon nao le log_auditoria');
select pg_temp.afirmar_invisivel('select 1 from permissao_admin', 'anon nao le a matriz');

-- ---------------------------------------------------------------------------

reset role;
select 'OK 0003_admin_auditoria' as resultado;

rollback;
