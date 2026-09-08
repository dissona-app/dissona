-- ============================================================================
-- Testes da migration 0001 · identidade e papéis
--
-- Roda concatenado a `_ajuda.sql`, que abre a transação e cria os atores.
-- Ver o cabeçalho daquele arquivo.
-- ============================================================================

-- ------------------------------------- o trigger de criação de perfil ------

select pg_temp.afirmar(
  (select count(*) from perfil) = 4,
  'o trigger em auth.users criou um perfil por conta'
);

select pg_temp.afirmar(
  (select nome_completo from perfil where id = (select id from ator where papel = 'artista'))
    = 'Teste artista',
  'nome_completo vem de raw_user_meta_data'
);

select pg_temp.afirmar(
  (select aceite_termos_em is not null from perfil
    where id = (select id from ator where papel = 'artista')),
  'aceite_termos = true grava aceite_termos_em (RF-003)'
);

-- ------------------------------------------------------- checks de perfil --

select pg_temp.afirmar_bloqueado(
  format('update perfil set idioma = %L where id = %L',
         'fr', (select id from ator where papel = 'artista')),
  'idioma fora de pt-BR/es/en e recusado'
);

select pg_temp.afirmar_bloqueado(
  format('update perfil set handle = %L where id = %L',
         'ab', (select id from ator where papel = 'artista')),
  'handle com menos de 3 caracteres e recusado'
);

select pg_temp.afirmar_bloqueado(
  format('update perfil set nome_completo = %L where id = %L',
         '   ', (select id from ator where papel = 'artista')),
  'nome_completo em branco e recusado'
);

-- `handle` é citext: dois handles que diferem só na caixa colidem.
update perfil set handle = 'aurora_menezes'
 where id = (select id from ator where papel = 'artista');

select pg_temp.afirmar_bloqueado(
  format('update perfil set handle = %L where id = %L',
         'Aurora_Menezes', (select id from ator where papel = 'vizinho')),
  'handle e citext: colide ignorando a caixa'
);

-- ------------------------------------------------- o trigger atualizado_em --

-- Não se testa "antes < depois": `now()` é o instante de início da transação
-- e é constante dentro dela, então nada avançaria aqui — e usar
-- `clock_timestamp()` no trigger seria pior, porque linhas escritas na mesma
-- transação passariam a ter `atualizado_em` diferente entre si.
--
-- O que importa provar é que o trigger **sobrescreve** o que vem do cliente:
-- ninguém falsifica `atualizado_em` por payload.
do $$
declare
  v_id uuid := (select id from ator where papel = 'curador');
begin
  update perfil
     set cidade = 'Recife',
         atualizado_em = '2020-01-01T00:00:00Z'
   where id = v_id;

  perform pg_temp.afirmar(
    (select atualizado_em from perfil where id = v_id) = now(),
    'o trigger sobrescreve atualizado_em, ignorando o valor enviado'
  );
end $$;

-- ========================================================= como o ARTISTA ==

reset role;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar(
  pg_temp.quantas('select 1 from perfil') = 1,
  'artista ve exatamente a propria linha de perfil'
);

select pg_temp.afirmar_invisivel(
  'select 1 from perfil where id = ''22222222-2222-2222-2222-222222222222''',
  'artista nao ve o perfil do vizinho'
);

select pg_temp.afirmar(
  pg_temp.quantas('select 1 from papel_usuario') = 1,
  'artista ve apenas os proprios papeis'
);

-- A fronteira que mais importa nesta migration: sem a cláusula
-- `papel <> 'admin'` nas policies, qualquer conta se tornaria admin.
select pg_temp.afirmar_bloqueado(
  'insert into papel_usuario (perfil_id, papel)
     values (''11111111-1111-1111-1111-111111111111'', ''admin'')',
  'artista NAO pode se conceder o papel admin'
);

-- Mas ativar o segundo papel legítimo tem de funcionar (regras §9.1).
insert into papel_usuario (perfil_id, papel)
values ('11111111-1111-1111-1111-111111111111', 'curador');

select pg_temp.afirmar(
  pg_temp.quantas('select 1 from papel_usuario') = 2,
  'artista ativa o papel de curador — papeis sao acumulaveis'
);

select pg_temp.afirmar_bloqueado(
  'insert into papel_usuario (perfil_id, papel)
     values (''22222222-2222-2222-2222-222222222222'', ''curador'')',
  'artista nao concede papel para outra conta'
);

-- Atenção ao helper: a policy de update do `perfil` filtra pelo `using`, então
-- a linha do vizinho não existe para o comando. Não há erro — há zero linhas
-- afetadas, que é uma negação igualmente válida e bem mais silenciosa.
select pg_temp.afirmar_sem_efeito(
  'update perfil set nome_exibicao = ''invadido''
    where id = ''22222222-2222-2222-2222-222222222222''',
  'artista nao atualiza o perfil do vizinho'
);

-- `perfil` não tem policy de insert: a linha só nasce pelo trigger.
select pg_temp.afirmar_bloqueado(
  'insert into perfil (id, nome_completo) values (gen_random_uuid(), ''forjado'')',
  'ninguem insere em perfil direto'
);

-- ========================================================= como o CURADOR ==

reset role;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar(
  pg_temp.quantas('select 1 from perfil') = 1,
  'curador ve exatamente a propria linha'
);

select pg_temp.afirmar(
  tem_papel('curador') and not tem_papel('artista'),
  'tem_papel responde pelo papel da sessao'
);

select pg_temp.afirmar(not e_admin(), 'curador nao e admin');

-- =========================================================== como o ADMIN ==

reset role;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar(e_admin(), 'e_admin reconhece o admin');

select pg_temp.afirmar(
  pg_temp.quantas('select 1 from perfil') = 4,
  'admin le todos os perfis'
);

select pg_temp.afirmar(
  pg_temp.quantas('select 1 from papel_usuario') >= 5,
  'admin le todos os papeis'
);

update perfil set situacao = 'bloqueada'
 where id = '22222222-2222-2222-2222-222222222222';

select pg_temp.afirmar(
  (select situacao from perfil where id = '22222222-2222-2222-2222-222222222222')
    = 'bloqueada',
  'admin bloqueia uma conta'
);

-- ==================================================== sem sessao (anon) ====

reset role;
set local request.jwt.claims = '{"role":"anon"}';
set local role anon;

select pg_temp.afirmar_invisivel('select 1 from perfil', 'anon nao le perfil');
select pg_temp.afirmar_invisivel('select 1 from papel_usuario', 'anon nao le papel_usuario');

-- ---------------------------------------------------------------------------

reset role;
select 'OK 0001_identidade' as resultado;

rollback;
