-- ============================================================================
-- Testes da migration 0004 · configuração
--
-- Roda concatenado a `_ajuda.sql`. Ver o cabeçalho daquele arquivo.
-- ============================================================================

insert into membro_admin (perfil_id, papel_admin)
select id, 'administrador' from ator where papel = 'admin';

-- ------------------------------------------------------------------- o seed

select pg_temp.afirmar(
  (select count(*) from configuracao) = 32,
  'o seed tem 32 chaves'
);

-- As chaves que o prototipo decidiu, e que o data-model tinha como pendentes.
select pg_temp.afirmar(
  (select valor from configuracao where chave = 'escuta_minima_percentual') = '60'::jsonb,
  'escuta minima e 60, conforme a copy do prototipo do curador'
);

select pg_temp.afirmar(
  (select valor from configuracao where chave = 'criterios_obrigatorios')
    = '["afinacao","ritmo","melodia","personalidade","conexao"]'::jsonb,
  'os cinco obrigatorios sao os do prototipo'
);

select pg_temp.afirmar(
  (select valor from configuracao where chave = 'remuneracao.base') = '"bruto"'::jsonb,
  'os percentuais incidem sobre o bruto'
);

-- A forma nova de `remuneracao.*`: piso <= teto_base <= teto_max nas tres classes.
select pg_temp.afirmar(
  (select bool_and(
            (valor ->> 'piso')::numeric <= (valor ->> 'teto_base')::numeric
        and (valor ->> 'teto_base')::numeric <= (valor ->> 'teto_max')::numeric)
     from configuracao where chave like 'remuneracao.%' and chave <> 'remuneracao.base'),
  'piso <= teto_base <= teto_max nas tres classes'
);

-- O **teto na avaliacao** do Ouro (50%) e o ponto de paridade com a margem
-- declarada. Nao e o piso: um Ouro que entrega no prazo sem nenhum opcional
-- recebe 45%, e chega aos 50% fazendo o trabalho completo.
select pg_temp.afirmar(
  (select (valor ->> 'teto_base')::numeric from configuracao where chave = 'remuneracao.ouro')
    = (select valor::text::numeric from configuracao where chave = 'margem_plataforma_percentual'),
  'o teto na avaliacao do Ouro coincide com a margem de referencia de 50%'
);

-- O vao entre `teto_base` e `teto_max` e **uniforme**: 12 pontos nas tres
-- classes. Ja o vao entre piso e teto_base varia (8, 3, 5), o que descarta a
-- leitura de que os acrescimos foram dimensionados para preencher esse vao.
select pg_temp.afirmar(
  (select bool_and(
            (c.valor ->> 'teto_max')::numeric - (c.valor ->> 'teto_base')::numeric = 12)
     from configuracao c
    where c.chave in ('remuneracao.bronze', 'remuneracao.prata', 'remuneracao.ouro')),
  'teto_max - teto_base = 12 pontos nas tres classes'
);

-- Os tres acrescimos de conteudo (3% cada) **saturam** `teto_base` em todas as
-- classes: 30+9 >= 38, 40+9 >= 43, 45+9 >= 50. Ou seja, quem responde os onze
-- criterios, justifica e escreve o feedback longo chega ao teto da avaliacao
-- independentemente da classe.
select pg_temp.afirmar(
  (select bool_and(
            (c.valor ->> 'piso')::numeric
              + (select valor::text::numeric from configuracao
                  where chave = 'acrescimo_onze_criterios_percentual')
              + (select valor::text::numeric from configuracao
                  where chave = 'acrescimo_justificativa_percentual')
              + (select valor::text::numeric from configuracao
                  where chave = 'acrescimo_feedback_150_percentual')
            >= (c.valor ->> 'teto_base')::numeric)
     from configuracao c
    where c.chave in ('remuneracao.bronze', 'remuneracao.prata', 'remuneracao.ouro')),
  'os tres acrescimos de conteudo saturam teto_base em todas as classes'
);

-- ATENCAO — achado a levar ao cliente: com o conjunto de acrescimos do
-- prototipo, `teto_max` **nunca e alcancado**. O maximo real e
-- `teto_base + acrescimo_compartilhamento` = 46 / 51 / 58, contra tetos de
-- 50 / 55 / 62 — sobram exatamente 4 pontos em todas as tres classes.
-- Ou falta um acrescimo de 4 pontos no catalogo, ou `teto_max` e aspiracional.
-- O teste fixa a folga para que ela nao mude sem alguem notar.
select pg_temp.afirmar(
  (select bool_and(
            (c.valor ->> 'teto_max')::numeric
              - least(
                  (c.valor ->> 'teto_base')::numeric
                    + (select valor::text::numeric from configuracao
                        where chave = 'acrescimo_compartilhamento_percentual'),
                  (c.valor ->> 'teto_max')::numeric)
            = 4)
     from configuracao c
    where c.chave in ('remuneracao.bronze', 'remuneracao.prata', 'remuneracao.ouro')),
  'sobram 4 pontos entre o maximo alcancavel e teto_max, nas tres classes'
);

-- `teto_atraso_percentual` saiu: no prototipo o atraso derruba o piso, nao capa
-- o acumulado.
select pg_temp.afirmar(
  not exists (select 1 from configuracao where chave = 'teto_atraso_percentual'),
  'teto_atraso_percentual nao existe mais'
);

select pg_temp.afirmar(
  (select valor from configuracao where chave = 'penalidade_atraso_pontos') = '8'::jsonb
  and (select valor from configuracao where chave = 'piso_minimo_atraso_percentual') = '15'::jsonb,
  'a penalidade de atraso e de 8 pontos, com piso minimo de 15'
);

-- Toda chave tem descricao: e o que faz a tabela ser legivel por quem opera.
select pg_temp.afirmar(
  not exists (select 1 from configuracao where char_length(btrim(descricao)) = 0),
  'toda chave tem descricao'
);

-- ------------------------------------------------------------------ auditoria

update configuracao set valor = '61' where chave = 'escuta_minima_percentual';

select pg_temp.afirmar(
  (select (antes ->> 'valor') = '60' and (depois ->> 'valor') = '61'
     from log_auditoria
    where tabela = 'configuracao' order by id desc limit 1),
  'alterar um threshold entra no rastro, com antes e depois'
);

update configuracao set valor = '60' where chave = 'escuta_minima_percentual';

-- ========================================================= como o ARTISTA ==

reset role;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

-- Leitura para qualquer autenticado: a tela de avaliacao precisa de meia duzia
-- de thresholds por render.
select pg_temp.afirmar(
  pg_temp.quantas('select 1 from configuracao') = 32,
  'artista le a configuracao inteira'
);

select pg_temp.afirmar_sem_efeito(
  'update configuracao set valor = ''0'' where chave = ''escuta_minima_percentual''',
  'artista nao altera threshold'
);

select pg_temp.afirmar_bloqueado(
  'insert into configuracao (chave, valor, descricao) values (''x'', ''1'', ''y'')',
  'ninguem cria chave nova — chave nova e migration'
);

-- `delete` sem policy nao levanta erro: nenhuma linha qualifica para o comando,
-- e o resultado e zero linhas afetadas. Mesmo modo silencioso do `update`.
select pg_temp.afirmar_sem_efeito(
  'delete from configuracao where chave = ''ciclo_meses''',
  'ninguem apaga chave — nem o admin'
);

-- =========================================================== como o ADMIN ==

reset role;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
set local role authenticated;

update configuracao set valor = '65' where chave = 'escuta_minima_percentual';

select pg_temp.afirmar(
  (select valor from configuracao where chave = 'escuta_minima_percentual') = '65'::jsonb,
  'administrador altera threshold'
);

-- Financeiro nao mexe em configuracao: os pisos de remuneracao ficam com o
-- administrador.
reset role;
update membro_admin set papel_admin = 'financeiro'
 where perfil_id = '44444444-4444-4444-4444-444444444444';
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
set local role authenticated;

select pg_temp.afirmar_sem_efeito(
  'update configuracao set valor = ''99'' where chave = ''remuneracao.base''',
  'admin financeiro nao altera configuracao'
);

-- ==================================================== sem sessao (anon) ====

reset role;
set local request.jwt.claims = '{"role":"anon"}';
set local role anon;

select pg_temp.afirmar_invisivel('select 1 from configuracao', 'anon nao le a configuracao');

-- ---------------------------------------------------------------------------

reset role;
select 'OK 0004_configuracao' as resultado;

rollback;
