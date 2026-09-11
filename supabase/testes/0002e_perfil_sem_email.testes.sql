-- ============================================================================
-- Testes da migration 0002e · o perfil nasce sem e-mail
--
-- **Autocontido**, como a `0007b` e a `0010`: abre a própria transação e monta
-- os próprios atores. Não se concatena a `_ajuda.sql` por um motivo que é o
-- próprio assunto do arquivo — os atores de lá nascem **todos com e-mail**, e
-- o que está sob prova é justamente a conta que não tem nenhum.
--
-- **Também não testa RLS**, e por isso não troca de papel: o que está sob prova
-- é um trigger `security definer` que roda no insert em `auth.users`, e a
-- leitura de conferência é do próprio fixture. Rodar como `postgres` aqui não
-- produz o falso positivo que o README alerta — aquele alerta vale para
-- asserção de visibilidade, que não existe neste arquivo.
--
-- O que precisa ser verdade:
--
--   1. conta **sem e-mail** cria perfil em vez de derrubar o cadastro. Era o
--      que acontecia antes desta migration: `coalesce` resolvia para NULL, o
--      `not null` estourava dentro do trigger e nem a conta do Auth nascia;
--   2. a ordem dos degraus é a documentada — `nome_completo` (nossa chave)
--      vence `full_name`, que vence `name`, que vence `preferred_username`,
--      que vence o e-mail;
--   3. sem nenhum degrau, o literal entra e o check de não-vazio passa;
--   4. o caminho por e-mail não regrediu.
-- ============================================================================

begin;

-- ---------------------------------------------------------------- helper ---

-- Mesma `afirmar` de `_ajuda.sql`, repetida porque este arquivo não se
-- concatena a ele. É a única que este teste usa: não há negação a provar aqui.
create function pg_temp.afirmar(p_ok boolean, p_rotulo text) returns void
language plpgsql as $$
begin
  if p_ok is not true then
    raise exception 'FALHOU: %', p_rotulo using errcode = 'TS001';
  end if;
end $$;

-- --------------------------------------------------------------- fixtures ---

create temporary table ator_sc (caso text primary key, id uuid) on commit drop;

insert into ator_sc (caso, id) values
  ('name',        '0002e001-0000-0000-0000-000000000001'),
  ('full_name',   '0002e002-0000-0000-0000-000000000002'),
  ('preferido',   '0002e003-0000-0000-0000-000000000003'),
  ('anonimo',     '0002e004-0000-0000-0000-000000000004'),
  ('nossa_chave', '0002e005-0000-0000-0000-000000000005'),
  ('so_email',    '0002e006-0000-0000-0000-000000000006');

-- Sem `email`, sem `encrypted_password` e sem `email_confirmed_at`: é a forma
-- exata de uma conta criada por provedor social que não devolve endereço.
-- `provider` é `custom:soundcloud`, como o GoTrue grava.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
values
  ('00000000-0000-0000-0000-000000000000',
   '0002e001-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
   null, null, null, now(), now(),
   '{"provider":"custom:soundcloud","providers":["custom:soundcloud"]}'::jsonb,
   '{"sub":"soundcloud:users:1","name":"Rafael Souza"}'::jsonb),

  ('00000000-0000-0000-0000-000000000000',
   '0002e002-0000-0000-0000-000000000002', 'authenticated', 'authenticated',
   null, null, null, now(), now(),
   '{"provider":"custom:soundcloud","providers":["custom:soundcloud"]}'::jsonb,
   '{"sub":"soundcloud:users:2","name":"perde","full_name":"Marina Alves"}'::jsonb),

  ('00000000-0000-0000-0000-000000000000',
   '0002e003-0000-0000-0000-000000000003', 'authenticated', 'authenticated',
   null, null, null, now(), now(),
   '{"provider":"custom:soundcloud","providers":["custom:soundcloud"]}'::jsonb,
   '{"sub":"soundcloud:users:3","preferred_username":"dj_marina","full_name":"   "}'::jsonb),

  ('00000000-0000-0000-0000-000000000000',
   '0002e004-0000-0000-0000-000000000004', 'authenticated', 'authenticated',
   null, null, null, now(), now(),
   '{"provider":"custom:soundcloud","providers":["custom:soundcloud"]}'::jsonb,
   '{"sub":"soundcloud:users:4"}'::jsonb),

  ('00000000-0000-0000-0000-000000000000',
   '0002e005-0000-0000-0000-000000000005', 'authenticated', 'authenticated',
   null, null, null, now(), now(),
   '{"provider":"custom:soundcloud","providers":["custom:soundcloud"]}'::jsonb,
   '{"sub":"soundcloud:users:5","nome_completo":"Nome Nosso","full_name":"perde","aceite_termos":"true"}'::jsonb),

  ('00000000-0000-0000-0000-000000000000',
   '0002e006-0000-0000-0000-000000000006', 'authenticated', 'authenticated',
   't_0002e_so_email@teste.dissona.local',
   extensions.crypt('senha-de-teste-1', extensions.gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{}'::jsonb);

-- ================================================ conta sem e-mail existe ==

select pg_temp.afirmar(
  (select count(*) from perfil p join ator_sc a on a.id = p.id) = 6,
  'as seis contas do fixture criaram perfil (o trigger nao derrubou nenhuma)'
);

-- ============================================== a ordem dos degraus vale ==

select pg_temp.afirmar(
  (select nome_completo from perfil where id = (select id from ator_sc where caso = 'name'))
    = 'Rafael Souza',
  'sem e-mail, `name` vira o nome do perfil'
);

select pg_temp.afirmar(
  (select nome_completo from perfil where id = (select id from ator_sc where caso = 'full_name'))
    = 'Marina Alves',
  '`full_name` vence `name`'
);

select pg_temp.afirmar(
  (select nome_completo from perfil where id = (select id from ator_sc where caso = 'preferido'))
    = 'dj_marina',
  '`preferred_username` entra quando os anteriores sao brancos — o `nullif(btrim(...))` faz o trabalho'
);

select pg_temp.afirmar(
  (select nome_completo from perfil where id = (select id from ator_sc where caso = 'nossa_chave'))
    = 'Nome Nosso',
  '`nome_completo` continua vencendo tudo — o cadastro por e-mail nao regrediu'
);

select pg_temp.afirmar(
  (select nome_completo from perfil where id = (select id from ator_sc where caso = 'so_email'))
    = 't_0002e_so_email@teste.dissona.local',
  'sem nenhuma chave de nome, o e-mail ainda e o degrau anterior ao literal'
);

-- =================================== sem degrau nenhum, o literal salva ==

select pg_temp.afirmar(
  (select nome_completo from perfil where id = (select id from ator_sc where caso = 'anonimo'))
    = 'Conta sem nome',
  'conta sem e-mail e sem nome nenhum recebe o literal, em vez de estourar'
);

select pg_temp.afirmar(
  (select char_length(btrim(nome_completo)) > 0
     from perfil p join ator_sc a on a.id = p.id
    order by nome_completo limit 1) is true,
  'nenhum perfil do fixture viola `perfil_nome_completo_nao_vazio`'
);

-- ==================================================== o aceite sobrevive ==

select pg_temp.afirmar(
  (select aceite_termos_em is not null
     from perfil where id = (select id from ator_sc where caso = 'nossa_chave')),
  '`aceite_termos: "true"` continua gravando `aceite_termos_em`'
);

select pg_temp.afirmar(
  (select aceite_termos_em is null
     from perfil where id = (select id from ator_sc where caso = 'name')),
  'conta social nasce sem aceite — e a guarda de rota a leva a /cadastrar/confirmar'
);

-- ---------------------------------------------------------------------------

select 'OK 0002e_perfil_sem_email' as resultado;

rollback;
