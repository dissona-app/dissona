-- ============================================================================
-- Testes da migration 0002 · perfis de artista e curador
--
-- Roda concatenado a `_ajuda.sql`. Ver o cabeçalho daquele arquivo.
-- ============================================================================

-- ------------------------------------------------------------- fixtures ----

-- Como `postgres` (bypassrls). A classe e a situação entram por INSERT, nunca
-- por UPDATE: o trigger `perfil_curador_classe_so_pelo_admin` recusaria o
-- update, porque `e_admin()` é falso quando não há sessão.
insert into perfil_artista (perfil_id, bio, generos)
select id, 'Cancoes de camara com eletronica caseira.', array['MPB', 'Eletronico']
from ator where papel = 'artista';

insert into perfil_artista (perfil_id) select id from ator where papel = 'vizinho';

insert into perfil_curador (perfil_id, classe, situacao, cadastro_concluido_em, passo_cadastro)
select id, 'prata', 'prata_aprovado', now(), 8
from ator where papel = 'curador';

-- Um segundo curador, ainda em rascunho: é contra ele que se prova que curador
-- não aprovado não aparece para o artista.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
values (
  '00000000-0000-0000-0000-000000000000',
  '55555555-5555-5555-5555-555555555555',
  'authenticated', 'authenticated',
  't_curador_rascunho@teste.dissona.local',
  extensions.crypt('senha-de-teste-1', extensions.gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"nome_completo":"Teste curador rascunho","aceite_termos":"true"}'::jsonb
);

insert into papel_usuario (perfil_id, papel)
values ('55555555-5555-5555-5555-555555555555', 'curador');

insert into perfil_curador (perfil_id, classe, situacao)
values ('55555555-5555-5555-5555-555555555555', 'bronze', 'rascunho');

insert into servico_curador (perfil_curador_id, tipo, preco_claves)
select pc.id, 'feedback', 2.00
from perfil_curador pc
join ator a on a.id = pc.perfil_id
where a.papel = 'curador';

insert into midia_curador (perfil_curador_id, tipo, nome, url, ativo)
select pc.id, 'playlist', 'Radar Caseiro', 'https://open.spotify.com/playlist/x', true
from perfil_curador pc join ator a on a.id = pc.perfil_id where a.papel = 'curador';

insert into midia_curador (perfil_curador_id, tipo, nome, url, ativo)
select pc.id, 'blog', 'Blog antigo', 'https://exemplo.test/blog', false
from perfil_curador pc join ator a on a.id = pc.perfil_id where a.papel = 'curador';

-- --------------------------------------------------- checks e coluna gerada

select pg_temp.afirmar_bloqueado(
  format('update perfil_artista set bio = %L where perfil_id = %L',
         repeat('x', 281), (select id from ator where papel = 'artista')),
  'bio de artista acima de 280 caracteres e recusada'
);

select pg_temp.afirmar_bloqueado(
  format('update perfil_artista set generos = array[%L,%L,%L,%L] where perfil_id = %L',
         'a', 'b', 'c', 'd', (select id from ator where papel = 'artista')),
  'mais de 3 generos e recusado'
);

select pg_temp.afirmar_bloqueado(
  format('update perfil_curador set passo_cadastro = 9 where perfil_id = %L',
         (select id from ator where papel = 'curador')),
  'passo_cadastro fora de 1..8 e recusado'
);

select pg_temp.afirmar_bloqueado(
  format('update perfil_curador set tempo_atuacao = %L where perfil_id = %L',
         '20 anos', (select id from ator where papel = 'curador')),
  'tempo_atuacao fora da lista e recusado'
);

select pg_temp.afirmar_bloqueado(
  format('update servico_curador set preco_claves = 0 where perfil_curador_id = %L',
         (select pc.id from perfil_curador pc join ator a on a.id = pc.perfil_id
           where a.papel = 'curador')),
  'preco de servico tem de ser positivo'
);

-- `verificavel` é coluna gerada: acompanha `url` e não aceita valor.
insert into credencial_curador (perfil_curador_id, tipo, descricao, url)
select pc.id, 'veiculo', 'Coluna semanal na Revista X', 'https://exemplo.test/coluna'
from perfil_curador pc join ator a on a.id = pc.perfil_id where a.papel = 'curador';

insert into credencial_curador (perfil_curador_id, tipo, descricao)
select pc.id, 'premio', 'Mencao honrosa sem link'
from perfil_curador pc join ator a on a.id = pc.perfil_id where a.papel = 'curador';

select pg_temp.afirmar(
  (select count(*) from credencial_curador where verificavel) = 1
  and (select count(*) from credencial_curador where not verificavel) = 1,
  'verificavel e gerada a partir de url'
);

select pg_temp.afirmar_bloqueado(
  'update credencial_curador set verificavel = true where not verificavel',
  'verificavel nao aceita escrita direta'
);

-- O `feedback` é obrigatório e nunca sai (trigger, DS012).
do $$
declare
  v_pc uuid := (select pc.id from perfil_curador pc join ator a on a.id = pc.perfil_id
                 where a.papel = 'curador');
begin
  begin
    delete from servico_curador where perfil_curador_id = v_pc and tipo = 'feedback';
    raise exception 'FALHOU: o servico feedback foi removido' using errcode = 'TS001';
  exception
    when sqlstate 'DS012' then null;
  end;
end $$;

-- ========================================================= como o ARTISTA ==

reset role;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar(
  pg_temp.quantas('select 1 from perfil_artista') = 1,
  'artista ve apenas o proprio perfil_artista'
);

select pg_temp.afirmar(
  meu_perfil_artista_id() = (select pa.id from perfil_artista pa
                              where pa.perfil_id = '11111111-1111-1111-1111-111111111111'),
  'meu_perfil_artista_id devolve a PK do dono'
);

select pg_temp.afirmar(
  meu_perfil_curador_id() is null,
  'meu_perfil_curador_id e nulo para quem nao e curador'
);

-- A regra que interessa: curador aprovado aparece, curador em rascunho não.
select pg_temp.afirmar(
  pg_temp.quantas('select 1 from perfil_curador') = 1,
  'artista ve so o curador aprovado, nao o em rascunho'
);

select pg_temp.afirmar_invisivel(
  'select 1 from perfil_curador where situacao = ''rascunho''',
  'curador em rascunho e invisivel para o artista'
);

-- Mídia e serviço ativos são visíveis (o artista precisa deles para escolher e
-- para saber o preço); os inativos, não.
select pg_temp.afirmar(
  pg_temp.quantas('select 1 from midia_curador') = 1,
  'artista ve so a midia ativa'
);

select pg_temp.afirmar(
  pg_temp.quantas('select 1 from servico_curador') = 1,
  'artista ve o servico ativo do curador'
);

select pg_temp.afirmar_invisivel(
  'select 1 from credencial_curador',
  'artista nao ve credencial de curador'
);

select pg_temp.afirmar_sem_efeito(
  format('update perfil_artista set bio = ''invadido'' where perfil_id = %L',
         '22222222-2222-2222-2222-222222222222'),
  'artista nao altera o perfil_artista do vizinho'
);

select pg_temp.afirmar_bloqueado(
  'insert into perfil_artista (perfil_id) values (''22222222-2222-2222-2222-222222222222'')',
  'artista nao cria perfil_artista para outra conta'
);

-- ========================================================= como o CURADOR ==

reset role;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar(
  meu_perfil_curador_id() is not null,
  'meu_perfil_curador_id devolve a PK do dono'
);

select pg_temp.afirmar(
  pg_temp.quantas('select 1 from credencial_curador') = 2,
  'curador ve as proprias credenciais'
);

select pg_temp.afirmar(
  pg_temp.quantas('select 1 from midia_curador') = 2,
  'curador ve as proprias midias, inclusive a inativa'
);

-- A trava que impede o curador de definir a propria remuneração.
do $$
begin
  begin
    update perfil_curador set classe = 'ouro'
     where perfil_id = '33333333-3333-3333-3333-333333333333';
    raise exception 'FALHOU: o curador se promoveu a ouro' using errcode = 'TS001';
  exception
    when sqlstate 'DS020' then null;
  end;
end $$;

do $$
begin
  begin
    -- valor diferente do fixture de propósito: `is distinct from` não dispara
    -- quando a coluna é reescrita com o mesmo valor.
    update perfil_curador set situacao = 'bronze_aprovado'
     where perfil_id = '33333333-3333-3333-3333-333333333333';
    raise exception 'FALHOU: o curador mudou a propria situacao' using errcode = 'TS001';
  exception
    when sqlstate 'DS020' then null;
  end;
end $$;

-- Mas editar o que é dele de fato tem de funcionar (12.6).
update perfil_curador set bio = 'Jornalista de musica desde 2014', passo_cadastro = 8
 where perfil_id = '33333333-3333-3333-3333-333333333333';

select pg_temp.afirmar(
  (select bio from perfil_curador where perfil_id = '33333333-3333-3333-3333-333333333333')
    = 'Jornalista de musica desde 2014',
  'curador edita a propria bio'
);

-- Alterar mídia não altera a classe (regras §2).
insert into midia_curador (perfil_curador_id, tipo, nome, url)
values (meu_perfil_curador_id(), 'instagram', 'Perfil', 'https://instagram.test/x');

select pg_temp.afirmar(
  (select classe from perfil_curador where perfil_id = '33333333-3333-3333-3333-333333333333')
    = 'prata',
  'acrescentar midia nao altera a classe'
);

select pg_temp.afirmar_bloqueado(
  format('insert into credencial_curador (perfil_curador_id, tipo, descricao)
          values (%L, ''premio'', ''forjada'')',
         (select pc.id from perfil_curador pc
           where pc.perfil_id = '55555555-5555-5555-5555-555555555555')),
  'curador nao cria credencial para outro curador'
);

-- Serviço duplicado por tipo é barrado pelo índice único.
select pg_temp.afirmar_bloqueado(
  'insert into servico_curador (perfil_curador_id, tipo, preco_claves)
     values (meu_perfil_curador_id(), ''feedback'', 3.00)',
  'nao existem dois servicos do mesmo tipo para o mesmo curador'
);

-- --------------------------------------------------- ler_contexto_sessao ---

select pg_temp.afirmar(
  (select papeis from ler_contexto_sessao()) @> array['curador']::papel[],
  'ler_contexto_sessao devolve o papel do curador'
);

select pg_temp.afirmar(
  (select cadastro_curador_concluido from ler_contexto_sessao()),
  'ler_contexto_sessao reconhece o cadastro concluido'
);

reset role;
set local request.jwt.claims = '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar(
  not (select cadastro_curador_concluido from ler_contexto_sessao()),
  'ler_contexto_sessao aponta cadastro pendente para o curador em rascunho'
);

reset role;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar(
  (select papeis from ler_contexto_sessao()) = array['artista']::papel[]
  and not (select cadastro_curador_concluido from ler_contexto_sessao()),
  'ler_contexto_sessao para quem so e artista'
);

-- =========================================================== como o ADMIN ==

reset role;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar(
  pg_temp.quantas('select 1 from perfil_curador') = 2,
  'admin ve todos os curadores, inclusive o em rascunho'
);

select pg_temp.afirmar(
  pg_temp.quantas('select 1 from credencial_curador') = 2,
  'admin le as credenciais para a amostragem antifraude (20.3)'
);

-- É o admin, e só ele, que decide classe (20.3 / 20.4).
update perfil_curador
   set classe = 'ouro', situacao = 'prata_aprovado', classificado_em = now()
 where perfil_id = '33333333-3333-3333-3333-333333333333';

select pg_temp.afirmar(
  (select classe from perfil_curador where perfil_id = '33333333-3333-3333-3333-333333333333')
    = 'ouro',
  'admin promove a classe do curador'
);

-- ==================================================== sem sessao (anon) ====

reset role;
set local request.jwt.claims = '{"role":"anon"}';
set local role anon;

select pg_temp.afirmar_invisivel('select 1 from perfil_curador', 'anon nao le perfil_curador');
select pg_temp.afirmar_invisivel('select 1 from servico_curador', 'anon nao le servico_curador');
select pg_temp.afirmar_invisivel('select 1 from midia_curador', 'anon nao le midia_curador');

-- ---------------------------------------------------------------------------

reset role;
select 'OK 0002_perfis' as resultado;

rollback;
