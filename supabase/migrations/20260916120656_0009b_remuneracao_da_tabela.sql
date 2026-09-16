-- ============================================================================
-- 0009b · Remuneração pela tabela do board — decisão do cliente (open-questions #5)
--
-- ## A decisão
--
-- A `0004` e a `0009` implementaram a leitura do **protótipo**: os três números
-- por classe eram (piso nas 72h, teto na avaliação, teto com compartilhamento),
-- e um Bronze no prazo sem opcionais recebia **30%**.
--
-- Em 2026-09-16 o cliente respondeu a pergunta #5: vale a **tabela do board**
-- ([regras §3](../../docs/prd/01-regras-de-negocio.md)). Os mesmos três números
-- passam a ser (piso em atraso, piso no prazo, teto):
--
-- | Classe | Piso · em atraso | Piso · no prazo | Teto |
-- |--------|------------------|-----------------|------|
-- | Ouro   | 45               | 50              | 62   |
-- | Prata  | 40               | 43              | 55   |
-- | Bronze | 30               | 38              | 50   |
--
-- Um Bronze no prazo sem opcionais recebe **38%**.
--
-- ## O que muda no cálculo, e não só no número
--
-- 1. **O piso depende do prazo**, direto da tabela. Some a penalidade de 8
--    pontos com mínimo de 15 (`penalidade_atraso_pontos`,
--    `piso_minimo_atraso_percentual`), que era leitura do protótipo.
-- 2. **Um teto só.** Os quatro acréscimos — onze critérios, justificativa,
--    feedback e compartilhamento — somam até o teto da classe. Deixa de existir
--    o degrau em que o compartilhamento era o único a passar de `teto_base`.
-- 3. **Atraso limita o acumulado a 50%** (regras §3.1, item 3: "feedback
--    entregue após 72h faz o acumulado chegar no máximo a 50%"). O 50 volta a
--    ser configuração — `teto_atraso_percentual`, a chave que a `0004` removeu.
--
-- Os valores dos acréscimos (3, 3, 3, 8) **não** mudam. O board fixa só o +3 da
-- justificativa; os outros continuam os do catálogo do protótipo, que nada na
-- tabela contradiz.
--
-- ## Consequência boa: some a #5b
--
-- Com um teto só, o máximo alcançável é `min(piso_prazo + 17, teto)` — 50, 55
-- e 62. **Os três tetos passam a ser atingíveis**, e a folga de 4 pontos da
-- #5b deixa de existir.
--
-- ## O que NÃO muda
--
-- A assinatura de `calcular_remuneracao` é a mesma, então `enviar_avaliacao` e
-- a tela 14.4 continuam chamando igual. Os `ganho_curador` já gravados (três,
-- todos da suíte E2E, de 2026-09-14) **ficam como estão**: o ganho é imutável,
-- e cada linha segue explicável pelas próprias colunas `piso_percentual`,
-- `acrescimos` e `teto_percentual`.
-- ============================================================================

-- O trigger de auditoria lê o motivo daqui.
select set_config(
  'dissona.motivo',
  'open-questions #5 respondida pelo cliente: remuneracao pela tabela do board',
  true
);

-- ------------------------------------------------------------ configuração

update configuracao set
  valor = '{"piso_atraso": 30, "piso_prazo": 38, "teto": 50}',
  descricao = 'Bronze: piso em atraso, piso no prazo (72h) e teto com opcionais. Tabela do board (regras 3), decisao do cliente em open-questions #5.'
 where chave = 'remuneracao.bronze';

update configuracao set
  valor = '{"piso_atraso": 40, "piso_prazo": 43, "teto": 55}',
  descricao = 'Prata: piso em atraso, piso no prazo (72h) e teto com opcionais. Tabela do board (regras 3), decisao do cliente em open-questions #5.'
 where chave = 'remuneracao.prata';

update configuracao set
  valor = '{"piso_atraso": 45, "piso_prazo": 50, "teto": 62}',
  descricao = 'Ouro: piso em atraso, piso no prazo (72h) e teto com opcionais. Tabela do board (regras 3), decisao do cliente em open-questions #5.'
 where chave = 'remuneracao.ouro';

insert into configuracao (chave, valor, descricao) values
  ('teto_atraso_percentual', '50',
   'Teto do acumulado quando o feedback e entregue apos 72h (regras 3.1, item 3). Aplica-se como min(teto da classe, este valor).');

delete from configuracao
 where chave in ('penalidade_atraso_pontos', 'piso_minimo_atraso_percentual');

update configuracao set
  descricao = 'Acrescimo por responder os onze criterios. Soma ate o teto da classe.'
 where chave = 'acrescimo_onze_criterios_percentual';

update configuracao set
  descricao = 'Acrescimo por justificativa longa (+3%, regras 3.1). Soma ate o teto da classe.'
 where chave = 'acrescimo_justificativa_percentual';

update configuracao set
  descricao = 'Acrescimo por feedback >= feedback_min_caracteres. Soma ate o teto da classe.'
 where chave = 'acrescimo_feedback_150_percentual';

update configuracao set
  descricao = 'Acrescimo por compartilhamento. Soma ate o teto da classe, como os demais — desde a 0009b nao ha mais degrau entre teto na avaliacao e teto com compartilhamento.'
 where chave = 'acrescimo_compartilhamento_percentual';

-- ------------------------------------------------------ calcular_remuneracao

create or replace function calcular_remuneracao(
  p_classe classe_curador,
  p_no_prazo boolean,
  p_base_claves numeric,
  p_opcionais jsonb default '{}'::jsonb
)
returns table (
  piso_percentual numeric,
  acrescimos jsonb,
  percentual_aplicado numeric,
  teto_percentual numeric,
  penalidade_prazo boolean,
  base_centavos bigint,
  valor_centavos bigint,
  comissao_centavos bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $funcao$
declare
  v_cfg jsonb;
  v_faixa jsonb;
  v_piso numeric;
  v_teto numeric;
  v_pct numeric;
  v_acrescimos jsonb := '[]'::jsonb;
  v_soma numeric := 0;
  v_base_centavos bigint;
  v_base_calculo bigint;
  v_valor bigint;
  v_retido boolean;

  -- Uma leitura de `configuracao`, não doze. A tela 14.4 chama esta função a
  -- cada render.
  c_chaves text[] := array[
    'remuneracao.base', 'remuneracao.bronze', 'remuneracao.prata', 'remuneracao.ouro',
    'clave_valor_centavos', 'margem_plataforma_percentual', 'teto_atraso_percentual',
    'acrescimo_onze_criterios_percentual', 'acrescimo_justificativa_percentual',
    'acrescimo_feedback_150_percentual', 'acrescimo_compartilhamento_percentual',
    'compartilhamento.acrescimo_retido'
  ];
begin
  select jsonb_object_agg(c.chave, c.valor) into v_cfg
    from public.configuracao c where c.chave = any(c_chaves);

  -- Falhar quando falta chave, em vez de `coalesce` para um default: um número
  -- de negócio errado que passa em silêncio é como ele chega a produção.
  if v_cfg is null or (select count(*) from jsonb_object_keys(v_cfg)) <> array_length(c_chaves, 1) then
    raise exception 'configuracao de remuneracao incompleta' using errcode = 'DS030';
  end if;

  v_faixa := v_cfg -> ('remuneracao.' || p_classe::text);

  -- 1 · Piso: direto da tabela, pelo prazo.
  v_piso := case when p_no_prazo
                 then (v_faixa ->> 'piso_prazo')::numeric
                 else (v_faixa ->> 'piso_atraso')::numeric
            end;

  -- 2 · Teto: o da classe; fora das 72h, no máximo `teto_atraso_percentual`.
  v_teto := (v_faixa ->> 'teto')::numeric;
  if not p_no_prazo then
    v_teto := least(v_teto, (v_cfg ->> 'teto_atraso_percentual')::numeric);
  end if;

  v_retido := coalesce((v_cfg ->> 'compartilhamento.acrescimo_retido')::boolean, false);

  -- 3 · Acréscimos, em **ordem fixa declarada**. A ordem não muda o total, mas
  -- torna o jsonb determinístico e comparável em teste.
  if coalesce((p_opcionais ->> 'onze_criterios')::boolean, false) then
    v_soma := v_soma + (v_cfg ->> 'acrescimo_onze_criterios_percentual')::numeric;
    v_acrescimos := v_acrescimos || jsonb_build_array(jsonb_build_object(
      'chave', 'onze_criterios',
      'percentual', (v_cfg ->> 'acrescimo_onze_criterios_percentual')::numeric));
  end if;

  if coalesce((p_opcionais ->> 'justificativas_250')::boolean, false) then
    v_soma := v_soma + (v_cfg ->> 'acrescimo_justificativa_percentual')::numeric;
    v_acrescimos := v_acrescimos || jsonb_build_array(jsonb_build_object(
      'chave', 'justificativas_250',
      'percentual', (v_cfg ->> 'acrescimo_justificativa_percentual')::numeric));
  end if;

  if coalesce((p_opcionais ->> 'feedback_150')::boolean, false) then
    v_soma := v_soma + (v_cfg ->> 'acrescimo_feedback_150_percentual')::numeric;
    v_acrescimos := v_acrescimos || jsonb_build_array(jsonb_build_object(
      'chave', 'feedback_150',
      'percentual', (v_cfg ->> 'acrescimo_feedback_150_percentual')::numeric));
  end if;

  if coalesce((p_opcionais ->> 'compartilhou')::boolean, false) then
    v_soma := v_soma + (v_cfg ->> 'acrescimo_compartilhamento_percentual')::numeric;
    v_acrescimos := v_acrescimos || jsonb_build_array(jsonb_build_object(
      'chave', 'compartilhou',
      'percentual', (v_cfg ->> 'acrescimo_compartilhamento_percentual')::numeric,
      'retido', v_retido));
  end if;

  -- 4 · Um teto só para tudo. `greatest` com o piso cobre a configuração
  -- incoerente em que o teto de atraso ficasse abaixo do piso de atraso: o
  -- check de `ganho_curador` (piso <= aplicado <= teto) recusaria a linha.
  v_pct := greatest(v_piso, least(v_piso + v_soma, v_teto));
  v_teto := greatest(v_teto, v_piso);

  -- 5 · Base em centavos, congelada.
  v_base_centavos := round(p_base_claves * (v_cfg ->> 'clave_valor_centavos')::numeric);

  -- 6 · Sobre o que o percentual incide — inalterado desde a 0009.
  if (v_cfg ->> 'remuneracao.base') = 'cota_curador' then
    v_base_calculo := round(v_base_centavos
                            * (v_cfg ->> 'margem_plataforma_percentual')::numeric / 100);
  else
    v_base_calculo := v_base_centavos;
  end if;

  v_valor := round(v_base_calculo * v_pct / 100)::bigint;

  -- 7 · A comissão é a **diferença**, nunca um segundo arredondamento.
  return query select
    v_piso,
    v_acrescimos,
    v_pct,
    v_teto,
    (not p_no_prazo),
    v_base_centavos,
    v_valor,
    v_base_centavos - v_valor;
end;
$funcao$;

comment on function calcular_remuneracao(classe_curador, boolean, numeric, jsonb) is
  'Remuneracao pela tabela do board (0009b): piso por prazo, acrescimos ate um teto so, atraso limita a teto_atraso_percentual.';
