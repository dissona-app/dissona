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

insert into servico_curador (perfil_curador_id, tipo, preco_claves)
select pc.id, 'feedback', 2.00 from perfil_curador pc;

insert into midia_curador (perfil_curador_id, tipo, nome, url)
select pc.id, 'playlist', 'Radar', 'https://sp.test/pl' from perfil_curador pc;

insert into faixa (perfil_artista_id, titulo, origem, arquivo_caminho, duracao_segundos, situacao)
select pa.id, 'Faixa em avaliacao', 'arquivo', a.id::text || '/f/1.mp3', 200, 'em_curadoria'
from perfil_artista pa join ator a on a.id = pa.perfil_id where a.papel = 'artista';

insert into envio (faixa_id, perfil_curador_id, total_claves, prazo_em, devolucao_em, situacao)
select f.id, pc.id, 2.00, now() + interval '72 hours', now() + interval '7 days', 'avaliando'
from faixa f, perfil_curador pc where f.titulo = 'Faixa em avaliacao';

-- ============================== calcular_remuneracao, caso a caso =========

-- A tabela do protótipo, valor a valor. `confere` cobre piso, percentual,
-- base, valor, comissão **e** a invariante do rateio na mesma linha.
do $$
declare
  v_n integer;
begin
  select count(*) into v_n from (
    with esperado(classe, no_prazo, claves, onze, just, fb, comp,
                  e_piso, e_pct, e_base, e_valor, e_comissao) as (values
      ('bronze'::classe_curador, true,  2.00, false,false,false,false, 30, 30,  2000,  600, 1400),
      ('bronze'::classe_curador, true,  2.00, true, true, true, false, 30, 38,  2000,  760, 1240),
      ('bronze'::classe_curador, true,  2.00, true, true, true, true,  30, 46,  2000,  920, 1080),
      ('bronze'::classe_curador, false, 2.00, false,false,false,false, 22, 22,  2000,  440, 1560),
      ('prata'::classe_curador,  false, 2.00, true, true, true, true,  32, 49,  2000,  980, 1020),
      ('ouro'::classe_curador,   true,  2.00, true, true, true, true,  45, 58,  2000, 1160,  840),
      ('ouro'::classe_curador,   true, 10.00, false,false,false,false, 45, 45, 10000, 4500, 5500)
    )
    select 1
      from esperado e
      cross join lateral calcular_remuneracao(
        e.classe, e.no_prazo, e.claves,
        jsonb_build_object('onze_criterios', e.onze, 'justificativas_250', e.just,
                           'feedback_150', e.fb, 'compartilhou', e.comp)) r
     where not (r.piso_percentual = e.e_piso
            and r.percentual_aplicado = e.e_pct
            and r.base_centavos = e.e_base
            and r.valor_centavos = e.e_valor
            and r.comissao_centavos = e.e_comissao
            and r.valor_centavos + r.comissao_centavos = r.base_centavos)
  ) as divergentes;

  perform pg_temp.afirmar(v_n = 0,
    format('os 7 casos da tabela de remuneracao conferem (%s divergiram)', v_n));
end $$;

-- O atraso derruba o piso em 8 pontos, com mínimo de 15 — e **não** capa o
-- acumulado em 50%, como o data-model §10 descrevia.
select pg_temp.afirmar(
  (select piso_percentual from calcular_remuneracao('bronze', false, 2.00)) = 22,
  'Bronze atrasado tem piso 22 = max(15, 30 - 8)'
);

select pg_temp.afirmar(
  (select penalidade_prazo from calcular_remuneracao('bronze', false, 2.00)),
  'penalidade_prazo marca a entrega fora das 72h'
);

-- O teto de atraso de 50% não existe mais: Prata atrasada com tudo dá 49%, e
-- sob a leitura antiga daria exatamente 50%.
select pg_temp.afirmar(
  (select percentual_aplicado from calcular_remuneracao('prata', false, 2.00,
    '{"onze_criterios":true,"justificativas_250":true,"feedback_150":true,"compartilhou":true}')) = 49,
  'Prata atrasada com tudo chega a 49%, e nao ao teto de atraso de 50%'
);

-- Os três acréscimos de conteúdo saturam `teto_base` nas três classes.
select pg_temp.afirmar(
  (select percentual_aplicado from calcular_remuneracao('bronze', true, 2.00,
    '{"onze_criterios":true,"justificativas_250":true,"feedback_150":true}')) = 38
  and (select percentual_aplicado from calcular_remuneracao('prata', true, 2.00,
    '{"onze_criterios":true,"justificativas_250":true,"feedback_150":true}')) = 43
  and (select percentual_aplicado from calcular_remuneracao('ouro', true, 2.00,
    '{"onze_criterios":true,"justificativas_250":true,"feedback_150":true}')) = 50,
  'os tres acrescimos de conteudo saturam teto_base: 38 / 43 / 50'
);

-- E `teto_max` nunca é alcançado: sobram 4 pontos nas três classes.
select pg_temp.afirmar(
  (select teto_percentual - percentual_aplicado from calcular_remuneracao('bronze', true, 2.00,
    '{"onze_criterios":true,"justificativas_250":true,"feedback_150":true,"compartilhou":true}')) = 4
  and (select teto_percentual - percentual_aplicado from calcular_remuneracao('prata', true, 2.00,
    '{"onze_criterios":true,"justificativas_250":true,"feedback_150":true,"compartilhou":true}')) = 4
  and (select teto_percentual - percentual_aplicado from calcular_remuneracao('ouro', true, 2.00,
    '{"onze_criterios":true,"justificativas_250":true,"feedback_150":true,"compartilhou":true}')) = 4,
  'sobram 4 pontos ate teto_max nas tres classes — achado a levar ao cliente'
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
  (select valor_centavos from calcular_remuneracao('bronze', true, 2.01)) = 603,
  '30% de 2010 centavos = 603, com arredondamento meia-unidade-pra-cima'
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
-- Bronze no prazo, sem nenhum opcional -> 30% de 2000 = 600.
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
  perform pg_temp.afirmar(v_g.piso_percentual = 30, 'piso do Bronze no prazo e 30%');
  perform pg_temp.afirmar(v_g.percentual_aplicado = 30,
    'sem opcionais, o percentual e o piso — e NAO 38%, como RF-066 afirma');
  perform pg_temp.afirmar(v_g.base_centavos = 2000, 'base de 2 Claves = R$ 20,00');
  perform pg_temp.afirmar(v_g.valor_centavos = 600, 'o curador recebe R$ 6,00');
  perform pg_temp.afirmar(v_g.comissao_centavos = 1400, 'a plataforma fica com R$ 14,00');
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

select pg_temp.afirmar(
  (select count(*) from notificacao where evento = 'feedback_concluido') = 1
  and (select count(*) from notificacao where evento = 'credito_liberado') = 1,
  'os dois lados foram notificados'
);

select pg_temp.afirmar(
  (select n.perfil_id from notificacao n where n.evento = 'feedback_concluido')
    = (select id from ator where papel = 'artista')
  and (select n.perfil_id from notificacao n where n.evento = 'credito_liberado')
    = (select id from ator where papel = 'curador'),
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

select pg_temp.afirmar(
  pg_temp.quantas('select 1 from ganho_curador') = 1,
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
