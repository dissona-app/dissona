-- ============================================================================
-- Testes da migration 0004 · configuração
--
-- Roda concatenado a `_ajuda.sql`. Ver o cabeçalho daquele arquivo.
-- ============================================================================

insert into membro_admin (perfil_id, papel_admin)
select id, 'administrador' from ator where papel = 'admin';

-- ------------------------------------------------------------------- o seed

-- 32 no seed da 0004; a 0009b tira as duas chaves da penalidade em pontos e
-- devolve `teto_atraso_percentual` — 31.
select pg_temp.afirmar(
  (select count(*) from configuracao) = 31,
  'configuracao tem 31 chaves depois da 0009b'
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

-- A forma de `remuneracao.*` desde a `0009b` (open-questions #5, decisao do
-- cliente): a tabela do board — piso em atraso, piso no prazo e teto.
select pg_temp.afirmar(
  (select bool_and(
            (valor ->> 'piso_atraso')::numeric <= (valor ->> 'piso_prazo')::numeric
        and (valor ->> 'piso_prazo')::numeric <= (valor ->> 'teto')::numeric)
     from configuracao where chave like 'remuneracao.%' and chave <> 'remuneracao.base'),
  'piso_atraso <= piso_prazo <= teto nas tres classes'
);

-- Os valores literais da tabela do board (regras §3).
select pg_temp.afirmar(
  (select valor from configuracao where chave = 'remuneracao.bronze')
    = '{"piso_atraso": 30, "piso_prazo": 38, "teto": 50}'::jsonb
  and (select valor from configuracao where chave = 'remuneracao.prata')
    = '{"piso_atraso": 40, "piso_prazo": 43, "teto": 55}'::jsonb
  and (select valor from configuracao where chave = 'remuneracao.ouro')
    = '{"piso_atraso": 45, "piso_prazo": 50, "teto": 62}'::jsonb,
  'as tres faixas sao as da tabela do board'
);

-- O **piso no prazo** do Ouro (50%) e o ponto de paridade com a margem de
-- referencia: um Ouro que entrega no prazo sem nenhum opcional fica em 50/50.
select pg_temp.afirmar(
  (select (valor ->> 'piso_prazo')::numeric from configuracao where chave = 'remuneracao.ouro')
    = (select valor::text::numeric from configuracao where chave = 'margem_plataforma_percentual'),
  'o piso no prazo do Ouro coincide com a margem de referencia de 50%'
);

-- Com os quatro acrescimos do catalogo (3+3+3+8 = 17) o teto e **alcancavel**
-- nas tres classes: 38+17 >= 50, 43+17 >= 55, 50+17 >= 62. A folga de 4 pontos
-- da leitura antiga (open-questions #5b) deixou de existir.
select pg_temp.afirmar(
  (select bool_and(
            (c.valor ->> 'piso_prazo')::numeric
              + (select sum(valor::text::numeric) from configuracao
                  where chave in ('acrescimo_onze_criterios_percentual',
                                  'acrescimo_justificativa_percentual',
                                  'acrescimo_feedback_150_percentual',
                                  'acrescimo_compartilhamento_percentual'))
            >= (c.valor ->> 'teto')::numeric)
     from configuracao c
    where c.chave in ('remuneracao.bronze', 'remuneracao.prata', 'remuneracao.ouro')),
  'com todos os acrescimos o teto e alcancavel nas tres classes'
);

-- O atraso limita o acumulado (regras §3.1, item 3) — a chave que a leitura do
-- prototipo tinha removido voltou, e a penalidade em pontos saiu.
select pg_temp.afirmar(
  (select valor from configuracao where chave = 'teto_atraso_percentual') = '50'::jsonb,
  'teto_atraso_percentual e 50'
);

select pg_temp.afirmar(
  not exists (select 1 from configuracao
               where chave in ('penalidade_atraso_pontos', 'piso_minimo_atraso_percentual')),
  'a penalidade de atraso em pontos nao existe mais'
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
