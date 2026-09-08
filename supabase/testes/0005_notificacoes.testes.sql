-- ============================================================================
-- Testes da migration 0005 · notificações
--
-- Roda concatenado a `_ajuda.sql`. Ver o cabeçalho daquele arquivo.
-- ============================================================================

insert into membro_admin (perfil_id, papel_admin)
select id, 'administrador' from ator where papel = 'admin';

-- ---------------------------------------------------------------- o catálogo

select pg_temp.afirmar(
  (select count(*) from evento_notificacao) = 42,
  'o catalogo tem 42 eventos, de todas as releases'
);

-- As contagens conferem com a matriz: 14 artista, 19 curador, 13 admin
-- (12 do board mais o log interno de alteracao de pacote).
select pg_temp.afirmar(
  (select count(*) from evento_notificacao where 'artista' = any(destinatario)) = 14
  and (select count(*) from evento_notificacao where 'curador' = any(destinatario)) = 19
  and (select count(*) from evento_notificacao where 'admin' = any(destinatario)) = 13,
  'as contagens por papel conferem com a matriz'
);

-- Os oito criticos da matriz: devolucao e estorno (artista); prazo 72h,
-- penalidade, rebaixamento, Prata, payout (curador); bloqueio (ambos).
select pg_temp.afirmar(
  (select count(*) from evento_notificacao where critico) = 8,
  'oito eventos sao criticos'
);

select pg_temp.afirmar(
  (select critico from evento_notificacao where chave = 'claves_devolvidas')
  and (select critico from evento_notificacao where chave = 'prazo_72h_proximo')
  and (select critico from evento_notificacao where chave = 'conta_bloqueada'),
  'devolucao de Clave, prazo de 72h e bloqueio sao criticos'
);

-- Nao existe evento de "novo cadastro admin": conta de admin nasce por convite.
select pg_temp.afirmar(
  not exists (select 1 from evento_notificacao where chave like '%cadastro%admin%'),
  'nao existe notificacao de novo cadastro admin'
);

-- Todo destino aponta para um caminho conhecido do produto.
select pg_temp.afirmar(
  not exists (
    select 1 from evento_notificacao
     where rota_destino not like '/%'
  ),
  'todo rota_destino e um caminho absoluto'
);

-- =================================================== registrar_notificacao ==

-- Evento fora do catalogo e bug de codigo, e falha alto.
do $$
begin
  begin
    perform registrar_notificacao(
      (select id from ator where papel = 'artista'), 'evento_que_nao_existe');
    raise exception 'FALHOU: aceitou evento fora do catalogo' using errcode = 'TS001';
  exception
    when sqlstate 'DS030' then null;
  end;
end $$;

-- Caminho padrao: sem preferencia, valem os canais do catalogo.
do $$
declare
  v_artista uuid := (select id from ator where papel = 'artista');
  v_id uuid;
begin
  v_id := registrar_notificacao(v_artista, 'compra_claves_confirmada',
                                '{"claves": 30}'::jsonb);

  perform pg_temp.afirmar(v_id is not null, 'registrar_notificacao devolve o id');

  perform pg_temp.afirmar(
    (select titulo from notificacao where id = v_id) = 'Compra de Claves confirmada',
    'o titulo vem do catalogo, nao do chamador'
  );

  perform pg_temp.afirmar(
    (select canais from notificacao where id = v_id) = '{in_app,email}'::canal_notificacao[],
    'sem preferencia, os canais sao os do catalogo'
  );

  perform pg_temp.afirmar(
    (select contexto -> 'claves' from notificacao where id = v_id) = '30'::jsonb,
    'o contexto e gravado como veio'
  );

  perform pg_temp.afirmar(
    (select rota from notificacao where id = v_id) = '/artista/carteira',
    'a rota cai no rota_destino do catalogo'
  );

  perform pg_temp.afirmar(
    (select enviada_email_em is null from notificacao where id = v_id),
    'o e-mail fica pendente: registrar_notificacao nao dispara HTTP'
  );
end $$;

-- `p_rota` sobrescreve, que e como um deep link com id chega.
do $$
declare
  v_id uuid := registrar_notificacao(
    (select id from ator where papel = 'artista'),
    'feedback_concluido', '{}'::jsonb, '/artista/envios/abc-123');
begin
  perform pg_temp.afirmar(
    (select rota from notificacao where id = v_id) = '/artista/envios/abc-123',
    'p_rota sobrescreve o destino padrao'
  );
end $$;

-- A preferencia filtra os canais de um evento nao critico.
insert into preferencia_notificacao (perfil_id, evento, in_app, email)
select id, 'compra_claves_confirmada', true, false from ator where papel = 'artista';

do $$
declare
  v_id uuid := registrar_notificacao(
    (select id from ator where papel = 'artista'), 'compra_claves_confirmada');
begin
  perform pg_temp.afirmar(
    (select canais from notificacao where id = v_id) = '{in_app}'::canal_notificacao[],
    'a preferencia remove o canal de e-mail'
  );
end $$;

-- Todos os canais desligados num evento nao critico: nada a registrar.
update preferencia_notificacao set in_app = false, email = false
 where evento = 'compra_claves_confirmada';

select pg_temp.afirmar(
  registrar_notificacao((select id from ator where papel = 'artista'),
                        'compra_claves_confirmada') is null,
  'com todos os canais desligados a funcao devolve nulo, sem gravar'
);

-- Mas um evento **critico** ignora a preferencia. E a regra que protege o
-- artista de perder o aviso de devolucao de Clave.
insert into preferencia_notificacao (perfil_id, evento, in_app, email)
select id, 'claves_devolvidas', false, false from ator where papel = 'artista';

do $$
declare
  v_id uuid := registrar_notificacao(
    (select id from ator where papel = 'artista'), 'claves_devolvidas');
begin
  perform pg_temp.afirmar(v_id is not null, 'evento critico grava mesmo com tudo desligado');
  perform pg_temp.afirmar(
    (select canais from notificacao where id = v_id) = '{in_app,email}'::canal_notificacao[],
    'evento critico usa os canais do catalogo, ignorando a preferencia'
  );
end $$;

-- Uma notificacao para o vizinho, para provar o isolamento adiante.
select registrar_notificacao((select id from ator where papel = 'vizinho'),
                             'feedback_concluido');

-- ========================================================= como o ARTISTA ==

reset role;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar(
  pg_temp.quantas('select 1 from notificacao') = 4,
  'artista ve so as proprias notificacoes'
);

select pg_temp.afirmar_invisivel(
  'select 1 from notificacao where perfil_id = ''22222222-2222-2222-2222-222222222222''',
  'artista nao ve a notificacao do vizinho'
);

select pg_temp.afirmar(
  pg_temp.quantas('select 1 from evento_notificacao') = 42,
  'o catalogo e legivel por qualquer autenticado — a tela de preferencias precisa dele'
);

select pg_temp.afirmar_bloqueado(
  'insert into evento_notificacao (chave, titulo, destinatario, canais_padrao, rota_destino, modulo_origem)
     values (''forjado'', ''x'', ''{artista}'', ''{in_app}'', ''/'', ''0'')',
  'ninguem acrescenta evento ao catalogo — evento novo e migration'
);

select pg_temp.afirmar_bloqueado(
  'insert into notificacao (perfil_id, evento, titulo, canais)
     values (''11111111-1111-1111-1111-111111111111'', ''feedback_concluido'', ''forjada'', ''{in_app}'')',
  'ninguem insere notificacao direto — so registrar_notificacao'
);

-- Marcar como lida funciona.
update notificacao set lida_em = now() where lida_em is null;

select pg_temp.afirmar(
  pg_temp.quantas('select 1 from notificacao where lida_em is null') = 0,
  'o dono marca as proprias notificacoes como lidas'
);

-- Mas reescrever o conteudo, nao. RLS filtra linha, nao coluna — a trava e o
-- trigger.
do $$
begin
  begin
    update notificacao set titulo = 'titulo trocado'
     where perfil_id = '11111111-1111-1111-1111-111111111111';
    raise exception 'FALHOU: o dono reescreveu o titulo' using errcode = 'TS001';
  exception
    when sqlstate 'DS022' then null;
  end;
end $$;

-- `registrar_notificacao` nao esta na superficie do cliente.
select pg_temp.afirmar_bloqueado(
  'select registrar_notificacao(''11111111-1111-1111-1111-111111111111'', ''feedback_concluido'')',
  'o cliente nao chama registrar_notificacao'
);

-- Preferencia e do dono.
insert into preferencia_notificacao (perfil_id, evento, in_app, email)
values ('11111111-1111-1111-1111-111111111111', 'musica_compartilhada', true, false);

select pg_temp.afirmar_bloqueado(
  'insert into preferencia_notificacao (perfil_id, evento)
     values (''22222222-2222-2222-2222-222222222222'', ''musica_compartilhada'')',
  'artista nao define preferencia para outra conta'
);

-- =========================================================== como o ADMIN ==

reset role;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
set local role authenticated;

-- O admin **nao** le a caixa de entrada de terceiros: notificacao e "proprias"
-- para todos os papeis (data-model §12).
select pg_temp.afirmar_invisivel(
  'select 1 from notificacao',
  'admin nao le a notificacao de outra conta'
);

select pg_temp.afirmar(
  pg_temp.quantas('select 1 from preferencia_notificacao') > 0,
  'admin le a preferencia, para diagnosticar "nao recebi o e-mail"'
);

-- ==================================================== sem sessao (anon) ====

reset role;
set local request.jwt.claims = '{"role":"anon"}';
set local role anon;

select pg_temp.afirmar_invisivel('select 1 from notificacao', 'anon nao le notificacao');
select pg_temp.afirmar_invisivel('select 1 from evento_notificacao', 'anon nao le o catalogo');

-- ---------------------------------------------------------------------------

reset role;
select 'OK 0005_notificacoes' as resultado;

rollback;
