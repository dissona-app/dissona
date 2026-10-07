-- ============================================================================
-- Testes da migration 0001e · `encerrar_sessoes_da_conta`
--
-- Autocontido: duas contas, três sessões de A (uma é a atual) e uma de B.
-- O que se prova:
--
--  1. o lote encerra as sessões de A que vieram no array;
--  2. a sessão atual de A sobrevive, mesmo vindo no array;
--  3. a sessão de B sobrevive, mesmo vindo no array — id alheio não é apagado;
--  4. sem autenticação, a função recusa (DS020).
--
-- `set local role authenticated` é obrigatório: `postgres` é `bypassrls`.
-- Termina em `rollback`: o projeto serve a demo.
-- ============================================================================

begin;

create function pg_temp.afirmar(p_ok boolean, p_rotulo text) returns void
language plpgsql as $$
begin
  if p_ok is not true then
    raise exception 'FALHOU: %', p_rotulo using errcode = 'TS001';
  end if;
end $$;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated',
  't_' || u.rotulo || '@teste.dissona.local',
  extensions.crypt('s', extensions.gen_salt('bf')),
  now(), now(), now(), '{"provider":"email"}'::jsonb,
  jsonb_build_object('nome_completo', 'Teste ' || u.rotulo, 'aceite_termos', 'true')
from (values
  ('aaaaaaaa-0001-4000-8000-00000000000a'::uuid, 'sessoes_a'),
  ('bbbbbbbb-0001-4000-8000-00000000000b'::uuid, 'sessoes_b')
) as u (id, rotulo);

insert into auth.sessions (id, user_id, created_at, updated_at) values
  ('a0000000-0000-4000-8000-000000000001', 'aaaaaaaa-0001-4000-8000-00000000000a', now(), now()),
  ('a0000000-0000-4000-8000-000000000002', 'aaaaaaaa-0001-4000-8000-00000000000a', now(), now()),
  ('a0000000-0000-4000-8000-000000000003', 'aaaaaaaa-0001-4000-8000-00000000000a', now(), now()),
  ('b0000000-0000-4000-8000-000000000001', 'bbbbbbbb-0001-4000-8000-00000000000b', now(), now());

-- ================================================ 4 · sem autenticação ==

set local role authenticated;
select set_config('request.jwt.claims', '{}', true);

do $$
begin
  perform public.encerrar_sessoes_da_conta(array['a0000000-0000-4000-8000-000000000002'::uuid]);
  raise exception 'FALHOU: sem autenticação a função deveria recusar' using errcode = 'TS001';
exception
  when sqlstate 'DS020' then null;
end $$;

-- ========================================== 1, 2 e 3 · o lote de A ==

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'aaaaaaaa-0001-4000-8000-00000000000a',
    'role', 'authenticated',
    'session_id', 'a0000000-0000-4000-8000-000000000001'
  )::text,
  true
);

select pg_temp.afirmar(
  public.encerrar_sessoes_da_conta(array[
    'a0000000-0000-4000-8000-000000000001'::uuid, -- a atual
    'a0000000-0000-4000-8000-000000000002'::uuid,
    'a0000000-0000-4000-8000-000000000003'::uuid,
    'b0000000-0000-4000-8000-000000000001'::uuid  -- de outra conta
  ]) = 2,
  'encerra só as duas outras sessões de A'
);

reset role;

select pg_temp.afirmar(
  exists (select 1 from auth.sessions where id = 'a0000000-0000-4000-8000-000000000001'),
  'a sessão atual de A sobrevive'
);
select pg_temp.afirmar(
  not exists (select 1 from auth.sessions where id in (
    'a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003')),
  'as outras sessões de A foram encerradas'
);
select pg_temp.afirmar(
  exists (select 1 from auth.sessions where id = 'b0000000-0000-4000-8000-000000000001'),
  'a sessão de B sobrevive'
);

rollback;
