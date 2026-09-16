-- ============================================================================
-- Testes da migration 0009 · remuneração
--
-- Roda concatenado a `_ajuda.sql`. Ver o cabeçalho daquele arquivo.
--
-- É a suíte com cobertura obrigatória (data-model §10). Cobre o item do gate
-- da R2 "avaliação concluída gera ganho com o percentual correto por classe e
-- prazo" e a invariante `repasse + comissão = valor da transação` (RNF-010).
-- ============================================================================

-- ------------------------------------------------------------- fixtures ----

insert into membro_admin (perfil_id, papel_admin)
select id, 'administrador' from ator where papel = 'admin';

insert into perfil_artista (perfil_id) select id from ator where papel = 'artista';
insert into perfil_artista (perfil_id) select id from ator where papel = 'vizinho';

insert into perfil_curador (perfil_id, classe, situacao, cadastro_concluido_em, passo_cadastro)
select id, 'bronze', 'bronze_aprovado', now(), 8 from ator where papel = 'curador';

-- Todo fixture filtra pelo ator. O projeto é compartilhado com a suíte E2E, e
-- um `from perfil_curador pc` sem filtro pega também os curadores dela: o
-- `servico_curador` batia na unique `(perfil_curador_id, tipo)` e o `envio`
-- virava produto cartesiano.
insert into servico_curador (perfil_curador_id, tipo, preco_claves)
select pc.id, 'feedback', 2.00 from perfil_curador pc
 where pc.perfil_id = (select id from ator where papel = 'curador');

insert into midia_curador (perfil_curador_id, tipo, nome, url)
select pc.id, 'playlist', 'Radar', 'https://sp.test/pl' from perfil_curador pc
 where pc.perfil_id = (select id from ator where papel = 'curador');

insert into faixa (perfil_artista_id, titulo, origem, arquivo_caminho, duracao_segundos, situacao)
select pa.id, 'Faixa em avaliacao', 'arquivo', a.id::text || '/f/1.mp3', 200, 'em_curadoria'
from perfil_artista pa join ator a on a.id = pa.perfil_id where a.papel = 'artista';

insert into envio (faixa_id, perfil_curador_id, total_claves, prazo_em, devolucao_em, situacao)
select f.id, pc.id, 2.00, now() + interval '72 hours', now() + interval '7 days', 'avaliando'
from faixa f
join perfil_artista pa on pa.id = f.perfil_artista_id
join perfil_curador pc on pc.perfil_id = (select id from ator where papel = 'curador')
where f.titulo = 'Faixa em avaliacao'
  and pa.perfil_id = (select id from ator where papel = 'artista');

-- ============================== calcular_remuneracao, caso a caso =========

-- A tabela do board (regras §3), valor a valor — decisão do cliente em
-- open-questions #5, aplicada pela `0009b`. `confere` cobre piso, percentual,
-- teto, base, valor, comissão **e** a invariante do rateio na mesma linha.
--
-- Acréscimos: onze 3 · justificativa 3 · feedback 3 · compartilhou 8, todos
-- somando até **um** teto só.
do $$
declare
  v_n integer;
begin
  select count(*) into v_n from (
    with esperado(classe, no_prazo, claves, onze, just, fb, comp,
                  e_piso, e_pct, e_teto, e_base, e_valor, e_comissao) as (values
      -- no prazo: piso da coluna "no prazo"
      ('bronze'::classe_curador, true,  2.00, false,false,false,false, 38, 38, 50,  2000,  760, 1240),
      ('bronze'::classe_curador, true,  2.00, true, true, true, false, 38, 47, 50,  2000,  940, 1060),
      ('bronze'::classe_curador, true,  2.00, true, true, true, true,  38, 50, 50,  2000, 1000, 1000),
      ('prata'::classe_curador,  true,  2.00, true, true, true, true,  43, 55, 55,  2000, 1100,  900),
      ('ouro'::classe_curador,   true,  2.00, true, true, true, true,  50, 62, 62,  2000, 1240,  760),
      ('ouro'::classe_curador,   true, 10.00, false,false,false,false, 50, 50, 62, 10000, 5000, 5000),
      -- em atraso: piso da coluna "em atraso", acumulado limitado a 50
      ('bronze'::classe_curador, false, 2.00, false,false,false,false, 30, 30, 50,  2000,  600, 1400),
      ('prata'::classe_curador,  false, 2.00, true, true, true, true,  40, 50, 50,  2000, 1000, 1000),
      ('ouro'::classe_curador,   false, 2.00, false,false,false,false, 45, 45, 50,  2000,  900, 1100),
      ('ouro'::classe_curador,   false, 2.00, true, true, true, true,  45, 50, 50,  2000, 1000, 1000)
    )
    select 1
      from esperado e
      cross join lateral calcular_remuneracao(
        e.classe, e.no_prazo, e.claves,
        jsonb_build_object('onze_criterios', e.onze, 'justificativas_250', e.just,
                           'feedback_150', e.fb, 'compartilhou', e.comp)) r
     where not (r.piso_percentual = e.e_piso
            and r.percentual_aplicado = e.e_pct
            and r.teto_percentual = e.e_teto
            and r.base_centavos = e.e_base
            and r.valor_centavos = e.e_valor
            and r.comissao_centavos = e.e_comissao
            and r.valor_centavos + r.comissao_centavos = r.base_centavos)
  ) as divergentes;

  perform pg_temp.afirmar(v_n = 0,
    format('os 10 casos da tabela de remuneracao conferem (%s divergiram)', v_n));
end $$;

-- A resposta do cliente, isolada: Bronze no prazo sem opcionais é 38%.
select pg_temp.afirmar(
  (select percentual_aplicado from calcular_remuneracao('bronze', true, 2.00)) = 38,
  'Bronze no prazo sem opcionais recebe 38% (open-questions #5, decisao do cliente)'
);

select pg_temp.afirmar(
  (select penalidade_prazo from calcular_remuneracao('bronze', false, 2.00)),
  'penalidade_prazo marca a entrega fora das 72h'
);

-- Atraso limita o acumulado a `teto_atraso_percentual`: Ouro com tudo iria a
-- 62, e atrasado para em 50.
select pg_temp.afirmar(
  (select teto_percentual from calcular_remuneracao('ouro', false, 2.00)) = 50,
  'fora das 72h o teto do Ouro cai para 50'
);

-- Um teto só, e ele é alcançável nas três classes — a #5b deixa de existir.
select pg_temp.afirmar(
  (select teto_percentual = percentual_aplicado from calcular_remuneracao('bronze', true, 2.00,
    '{"onze_criterios":true,"justificativas_250":true,"feedback_150":true,"compartilhou":true}'))
  and (select teto_percentual = percentual_aplicado from calcular_remuneracao('prata', true, 2.00,
    '{"onze_criterios":true,"justificativas_250":true,"feedback_150":true,"compartilhou":true}'))
  and (select teto_percentual = percentual_aplicado from calcular_remuneracao('ouro', true, 2.00,
    '{"onze_criterios":true,"justificativas_250":true,"feedback_150":true,"compartilhou":true}')),
  'com todos os opcionais o teto e alcancado nas tres classes'
);

-- O compartilhamento não é mais especial: sozinho, soma como qualquer outro.
select pg_temp.afirmar(
  (select percentual_aplicado from calcular_remuneracao('bronze', true, 2.00,
    '{"compartilhou":true}')) = 46,
  'compartilhar sozinho soma 8 ao piso de 38'
);

-- As chaves da leitura antiga saíram, e a do teto de atraso voltou.
select pg_temp.afirmar(
  not exists (select 1 from configuracao
               where chave in ('penalidade_atraso_pontos', 'piso_minimo_atraso_percentual'))
  and exists (select 1 from configuracao where chave = 'teto_atraso_percentual'),
  'configuracao sem penalidade em pontos, com teto_atraso_percentual'
);

-- Ordem fixa do jsonb de acréscimos: é o que o torna comparável em teste.
select pg_temp.afirmar(
  (select acrescimos from calcular_remuneracao('bronze', true, 2.00,
    '{"onze_criterios":true,"feedback_150":true,"compartilhou":true}'))
  = '[{"chave":"onze_criterios","percentual":3},
      {"chave":"feedback_150","percentual":3},
      {"chave":"compartilhou","percentual":8,"retido":false}]'::jsonb,
  'os acrescimos saem em ordem fixa, com o percentual de cada um'
);

-- Arredondamento: centavo ímpar não se perde nem sobra.
select pg_temp.afirmar(
  (select valor_centavos + comissao_centavos = base_centavos
     from calcular_remuneracao('bronze', true, 2.01)),
  'com base de 2010 centavos o rateio ainda fecha exatamente'
);

select pg_temp.afirmar(
  (select valor_centavos from calcular_remuneracao('bronze', true, 2.01)) = 764,
  '38% de 2010 centavos = 763,8 -> 764, com arredondamento meia-unidade-pra-cima'
);

-- Determinismo: duas chamadas iguais devolvem o mesmo resultado.
select pg_temp.afirmar(
  (select to_jsonb(r) from calcular_remuneracao('ouro', true, 7.77,
     '{"onze_criterios":true}') r)
  = (select to_jsonb(r) from calcular_remuneracao('ouro', true, 7.77,
     '{"onze_criterios":true}') r),
  'a funcao e deterministica'
);

-- ================================ enviar_avaliacao, de ponta a ponta ======

reset role;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
set local role authenticated;

-- Escuta abaixo do mínimo barra a conclusão (RF-058).
do $$
begin
  begin
    perform enviar_avaliacao(
      (select id from envio limit 1),
      '[{"criterio":"afinacao","nota":4},{"criterio":"ritmo","nota":4},
        {"criterio":"melodia","nota":4},{"criterio":"personalidade","nota":4},
        {"criterio":"conexao","nota":4}]'::jsonb,
      3.5, 'Um feedback qualquer, curto.', 40);
    raise exception 'FALHOU: concluiu com escuta de 40%%' using errcode = 'TS001';
  exception
    when sqlstate 'DS001' then null;
  end;
end $$;

-- Critério obrigatório ausente barra (o `letra` não é obrigatório; falta o
-- `conexao`).
do $$
begin
  begin
    perform enviar_avaliacao(
      (select id from envio limit 1),
      '[{"criterio":"afinacao","nota":4},{"criterio":"ritmo","nota":4},
        {"criterio":"melodia","nota":4},{"criterio":"personalidade","nota":4},
        {"criterio":"letra","nota":4}]'::jsonb,
      3.5, 'Um feedback qualquer.', 80);
    raise exception 'FALHOU: concluiu sem o criterio conexao' using errcode = 'TS001';
  exception
    when sqlstate 'DS002' then null;
  end;
end $$;

-- Feedback vazio barra (é obrigatório, regras 5.2).
do $$
begin
  begin
    perform enviar_avaliacao(
      (select id from envio limit 1),
      '[{"criterio":"afinacao","nota":4},{"criterio":"ritmo","nota":4},
        {"criterio":"melodia","nota":4},{"criterio":"personalidade","nota":4},
        {"criterio":"conexao","nota":4}]'::jsonb,
      3.5, '   ', 80);
    raise exception 'FALHOU: concluiu sem feedback' using errcode = 'TS001';
  exception
    when sqlstate 'DS003' then null;
  end;
end $$;

-- O caminho feliz: cinco obrigatórios, feedback curto, sem compartilhar.
-- Bronze no prazo, sem nenhum opcional -> 38% de 2000 = 760.
do $$
declare
  v_ganho_id uuid;
  v_g public.ganho_curador;
begin
  v_ganho_id := enviar_avaliacao(
    (select id from envio limit 1),
    '[{"criterio":"afinacao","nota":4.5},{"criterio":"ritmo","nota":4},
      {"criterio":"melodia","nota":3.5},{"criterio":"personalidade","nota":5},
      {"criterio":"conexao","nota":4}]'::jsonb,
    3.5, 'Feedback curto, abaixo dos 150 caracteres.', 80);

  select * into v_g from ganho_curador where id = v_ganho_id;

  perform pg_temp.afirmar(v_g.classe = 'bronze', 'a classe foi congelada no ganho');
  perform pg_temp.afirmar(v_g.no_prazo, 'entregue dentro das 72h');
  perform pg_temp.afirmar(v_g.piso_percentual = 38, 'piso do Bronze no prazo e 38% (tabela do board)');
  perform pg_temp.afirmar(v_g.percentual_aplicado = 38,
    'sem opcionais, o percentual e o piso no prazo: 38% (open-questions #5)');
  perform pg_temp.afirmar(v_g.base_centavos = 2000, 'base de 2 Claves = R$ 20,00');
  perform pg_temp.afirmar(v_g.valor_centavos = 760, 'o curador recebe R$ 7,60');
  perform pg_temp.afirmar(v_g.comissao_centavos = 1240, 'a plataforma fica com R$ 12,40');
  perform pg_temp.afirmar(v_g.valor_centavos + v_g.comissao_centavos = v_g.base_centavos,
    'repasse + comissao = base (RNF-010)');
  perform pg_temp.afirmar(v_g.acrescimos = '[]'::jsonb, 'nenhum acrescimo');
  perform pg_temp.afirmar(v_g.situacao = 'liberado', 'o ganho nasce liberado');
end $$;

-- O que a conclusão deixou no resto do modelo.
select pg_temp.afirmar(
  (select situacao from avaliacao) = 'concluida'
  and (select concluida_em is not null from avaliacao)
  and (select no_prazo is not null from avaliacao)
  and (select classe_no_momento from avaliacao) = 'bronze',
  'a avaliacao ficou concluida com no_prazo e classe congelados'
);

select pg_temp.afirmar(
  (select count(*) from nota_criterio) = 5,
  'as cinco notas foram gravadas'
);

select pg_temp.afirmar(
  (select modalidade from compartilhamento) = 'nao_compartilhou',
  'nao_compartilhou foi registrado explicitamente — a diferenca precisa ser auditavel'
);

select pg_temp.afirmar(
  (select situacao from envio) = 'pronto' and (select concluido_em is not null from envio),
  'o envio foi fechado como pronto'
);

-- As duas notificacoes vao para pessoas diferentes, e `notificacao` e "proprias"
-- para todo papel — o curador nao ve a do artista. A conferencia precisa sair
-- da sessao do curador.
reset role;

-- Filtrado pelos atores do fixture: depois do `reset role` a consulta roda como
-- `postgres`, que enxerga o banco inteiro — e o projeto é compartilhado com a
-- suíte E2E, que conclui avaliações de verdade.
select pg_temp.afirmar(
  (select count(*) from notificacao
    where evento = 'feedback_concluido' and perfil_id in (select id from ator)) = 1
  and (select count(*) from notificacao
    where evento = 'credito_liberado' and perfil_id in (select id from ator)) = 1,
  'os dois lados foram notificados'
);

select pg_temp.afirmar(
  exists (select 1 from notificacao n
           where n.evento = 'feedback_concluido'
             and n.perfil_id = (select id from ator where papel = 'artista'))
  and exists (select 1 from notificacao n
               where n.evento = 'credito_liberado'
                 and n.perfil_id = (select id from ator where papel = 'curador')),
  'cada notificacao foi para a pessoa certa'
);

set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
set local role authenticated;

-- Concluir duas vezes não acontece.
do $$
begin
  begin
    perform enviar_avaliacao(
      (select id from envio limit 1),
      '[{"criterio":"afinacao","nota":4},{"criterio":"ritmo","nota":4},
        {"criterio":"melodia","nota":4},{"criterio":"personalidade","nota":4},
        {"criterio":"conexao","nota":4}]'::jsonb,
      3.5, 'Outro feedback.', 90);
    raise exception 'FALHOU: concluiu a mesma avaliacao duas vezes' using errcode = 'TS001';
  exception
    when sqlstate 'DS004' then null;   -- o envio ja esta pronto
    when sqlstate 'DS005' then null;   -- ou a avaliacao ja esta concluida
  end;
end $$;

-- Avaliação concluída não se reescreve (DS005), e o cliente não conclui
-- avaliação por update (DS004).
do $$
begin
  begin
    update avaliacao set feedback = 'reescrito depois de concluir';
    raise exception 'FALHOU: reescreveu avaliacao concluida' using errcode = 'TS001';
  exception
    when sqlstate 'DS005' then null;
  end;
end $$;

-- O ganho é imutável para o cliente, por **duas** camadas.
--
-- A primeira é a ausência de policy de `update`: nenhuma linha qualifica para o
-- comando, e o resultado é zero linhas afetadas, sem erro. O trigger
-- `proibir_alteracao_de_ganho` é a segunda camada, e só dispararia se alguma
-- policy de escrita viesse a existir — é cinto e suspensório, de propósito,
-- porque a tabela guarda dinheiro escriturado.
select pg_temp.afirmar_sem_efeito(
  'update ganho_curador set valor_centavos = 999999',
  'o cliente nao altera o ganho'
);

select pg_temp.afirmar_bloqueado(
  'insert into ganho_curador (avaliacao_id, perfil_curador_id, base_claves, base_centavos,
                              classe, no_prazo, piso_percentual, percentual_aplicado,
                              teto_percentual, valor_centavos, comissao_centavos)
     values (gen_random_uuid(), meu_perfil_curador_id(), 1, 1000, ''ouro'', true,
             100, 100, 100, 1000, 0)',
  'ninguem insere ganho direto — so enviar_avaliacao'
);

select pg_temp.afirmar(
  pg_temp.quantas('select 1 from ganho_curador') = 1,
  'o curador le o proprio ganho'
);

-- ========================================================= como o ARTISTA ==

reset role;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar(
  pg_temp.quantas('select 1 from avaliacao') = 1,
  'o artista le a avaliacao concluida da propria faixa'
);

select pg_temp.afirmar(
  pg_temp.quantas('select 1 from nota_criterio') = 5,
  'o artista le as notas da devolutiva'
);

-- Mas não o ganho: quanto o curador recebeu não é da conta do artista.
select pg_temp.afirmar_invisivel(
  'select 1 from ganho_curador',
  'o artista NAO ve quanto o curador recebeu'
);

-- A nota final chega pela view.
select pg_temp.afirmar(
  (select round(no, 2) from nota_avaliacao) = 4.20,
  'NO e a media das cinco notas: (4.5+4+3.5+5+4)/5 = 4.20'
);

select pg_temp.afirmar(
  (select nf from nota_avaliacao) = 7.70,
  'NF = NO + NS = 4.20 + 3.50 = 7.70, na escala 0-10'
);

select pg_temp.afirmar(
  (select nf_media from nota_artista) = 7.70,
  'a nota do artista e a media das NF'
);

-- ========================================================= como o VIZINHO ==

reset role;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar_invisivel('select 1 from avaliacao', 'vizinho nao ve avaliacao alheia');
select pg_temp.afirmar_invisivel('select 1 from nota_criterio', 'vizinho nao ve nota alheia');
select pg_temp.afirmar_invisivel('select 1 from ganho_curador', 'vizinho nao ve ganho alheio');
select pg_temp.afirmar_invisivel('select 1 from nota_artista', 'vizinho nao ve a nota de outro artista');

-- ==================================== como o admin de financeiro ==========

reset role;
update membro_admin set papel_admin = 'financeiro'
 where perfil_id = '44444444-4444-4444-4444-444444444444';
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
set local role authenticated;

-- Contado só o do curador do fixture: o financeiro enxerga **todos** os ganhos,
-- inclusive os que a suíte E2E grava no projeto compartilhado.
select pg_temp.afirmar(
  pg_temp.quantas('select 1 from ganho_curador g join perfil_curador pc on pc.id = g.perfil_curador_id
                    where pc.perfil_id = ''33333333-3333-3333-3333-333333333333''') = 1,
  'o financeiro le os ganhos, para conciliar o rateio'
);

select pg_temp.afirmar(
  (select sum(valor_centavos + comissao_centavos) = sum(base_centavos) from ganho_curador),
  'a invariante do rateio fecha no agregado, e nao so por linha'
);

-- ==================================================== sem sessao (anon) ====

reset role;
set local request.jwt.claims = '{"role":"anon"}';
set local role anon;

select pg_temp.afirmar_invisivel('select 1 from ganho_curador', 'anon nao le ganho');
select pg_temp.afirmar_invisivel('select 1 from criterio', 'anon nao le o catalogo de criterios');

-- ---------------------------------------------------------------------------

reset role;
select 'OK 0009_remuneracao' as resultado;

rollback;
