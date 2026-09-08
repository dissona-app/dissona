-- ============================================================================
-- 0009 · Remuneração  (R2)
--
-- `ganho_curador`, `calcular_remuneracao()` e a RPC `enviar_avaliacao()`.
-- Ver data-model §10.
--
-- `calcular_remuneracao` segue o algoritmo do **protótipo da R2**, que o
-- AGENTS.md põe acima do board, e que difere da leitura do data-model §5:
--
--     piso     = no_prazo ? faixa.piso : max(piso_minimo, faixa.piso - 8)
--     pct_base = min(piso + 3 + 3 + 3, faixa.teto_base)
--     pct      = min(pct_base + 8, faixa.teto_max)
--     valor    = round(base_centavos * pct / 100)
--
-- Ou seja: os três números por classe são (piso dentro das 72h, teto na
-- avaliação, teto com compartilhamento) — e não (atraso, prazo, teto). As
-- legendas da tela não deixam margem: "Piso da classe dentro das 72h" exibe
-- 30% para Bronze, e "Teto da classe Bronze: 38% na avaliação e 50% com
-- compartilhamento".
--
-- Consequências, registradas aqui porque atravessam telas e requisitos:
--
--  · **RF-066 está incorreto** ao afirmar que dentro de 72h "o piso é 38%
--    (Bronze)". 38% é o teto na avaliação. Um Bronze que entrega no prazo sem
--    nenhum opcional recebe **30%**.
--  · `teto_atraso_percentual` não existe mais: o atraso derruba o piso em 8
--    pontos, com mínimo de 15, e não capa o acumulado em 50%.
--  · Com os acréscimos do catálogo, `teto_max` **nunca é alcançado**: o máximo
--    real é 46 / 51 / 58 contra tetos de 50 / 55 / 62. Sobram 4 pontos nas três
--    classes — ou falta um acréscimo, ou os tetos são aspiracionais. Pergunta
--    aberta para o cliente.
-- ============================================================================

-- -------------------------------------------------------------- ganho_curador

create table ganho_curador (
  id uuid primary key default gen_random_uuid(),
  avaliacao_id uuid not null unique references avaliacao (id) on delete restrict,
  perfil_curador_id uuid not null references perfil_curador (id) on delete restrict,
  base_claves numeric(10, 2) not null,
  -- **Não está no data-model, e é o que torna a invariante verificável pelo
  -- banco.** Sem congelar a base em centavos, o `check` do rateio precisaria
  -- do valor da Clave, que vive em `configuracao` e um check não pode ler.
  base_centavos bigint not null,
  classe classe_curador not null,
  no_prazo boolean not null,
  piso_percentual numeric(5, 2) not null,
  acrescimos jsonb not null default '[]'::jsonb,
  percentual_aplicado numeric(5, 2) not null,
  teto_percentual numeric(5, 2) not null,
  penalidade_prazo boolean not null default false,
  valor_centavos bigint not null,
  comissao_centavos bigint not null,
  situacao situacao_ganho not null default 'liberado',
  criado_em timestamptz not null default now(),

  -- **A invariante do rateio (RNF-010), garantida pelo banco.** Se
  -- `calcular_remuneracao` errar, a gravação é recusada — a regra não depende
  -- de a função estar correta.
  constraint ganho_curador_rateio_fecha
    check (valor_centavos + comissao_centavos = base_centavos),
  constraint ganho_curador_valores_nao_negativos
    check (valor_centavos >= 0 and comissao_centavos >= 0 and base_centavos > 0),
  constraint ganho_curador_respeita_o_teto
    check (percentual_aplicado <= teto_percentual),
  constraint ganho_curador_piso_ate_aplicado
    check (piso_percentual <= percentual_aplicado)
);

comment on table ganho_curador is
  'Um ganho por avaliacao concluida. Escrito so por enviar_avaliacao (RNF-003). A invariante repasse + comissao = base e garantida por check.';
comment on column ganho_curador.base_centavos is
  'Base congelada em centavos, para o check do rateio poder existir sem ler configuracao.';
comment on column ganho_curador.acrescimos is
  'Lista em ordem fixa: [{chave, percentual, retido}]. Ordem fixa torna o jsonb comparavel em teste.';
comment on column ganho_curador.penalidade_prazo is
  'Entrega fora das 72h. Sob o algoritmo do prototipo, isso derruba o piso em 8 pontos (minimo 15) — nao capa o acumulado em 50%, como o data-model 10 descrevia.';

create index ganho_curador_do_curador_idx on ganho_curador (perfil_curador_id, criado_em desc);
create index ganho_curador_situacao_idx on ganho_curador (situacao);

-- Trigger de auditoria que a `0003` não pôde criar: a tabela nasce aqui.
create trigger ganho_curador_auditoria
  after insert or update or delete on ganho_curador
  for each row execute function registrar_auditoria();

-- Dinheiro escriturado não se reescreve. Mesmo padrão do ledger de Claves.
create or replace function proibir_alteracao_de_ganho()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $funcao$
begin
  -- A situação (`liberado` → `em_saque` → `pago`) é fluxo de payout da R5 e
  -- roda por RPC; o resto é imutável.
  if current_user <> 'authenticated' then
    return new;
  end if;
  raise exception 'ganho_curador nao e alterado pelo cliente' using errcode = 'DS023';
end;
$funcao$;

revoke execute on function proibir_alteracao_de_ganho() from public, anon, authenticated;

create trigger ganho_curador_imutavel_para_o_cliente
  before update or delete on ganho_curador
  for each row execute function proibir_alteracao_de_ganho();

-- ----------------------------------------------------- calcular_remuneracao

-- `stable`, e não `immutable`: lê `configuracao`. `security invoker` porque
-- `configuracao` é legível por qualquer autenticado — e `grant` para
-- `authenticated` porque a **etapa 5 da avaliação precisa prever** o valor com
-- a mesma função que grava. Uma função para prever e outra para gravar é a
-- origem clássica de "o valor mostrado não é o valor pago".
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
  v_teto_base numeric;
  v_teto_max numeric;
  v_pct_base numeric;
  v_pct numeric;
  v_acrescimos jsonb := '[]'::jsonb;
  v_soma numeric := 0;
  v_base_centavos bigint;
  v_base_calculo bigint;
  v_valor bigint;
  v_retido boolean;

  -- Uma leitura de `configuracao`, não onze. A tela de remuneração chama esta
  -- função a cada render.
  c_chaves text[] := array[
    'remuneracao.base', 'remuneracao.bronze', 'remuneracao.prata', 'remuneracao.ouro',
    'clave_valor_centavos', 'margem_plataforma_percentual',
    'penalidade_atraso_pontos', 'piso_minimo_atraso_percentual',
    'acrescimo_onze_criterios_percentual', 'acrescimo_justificativa_percentual',
    'acrescimo_feedback_150_percentual', 'acrescimo_compartilhamento_percentual',
    'compartilhamento.acrescimo_retido'
  ];
begin
  select jsonb_object_agg(c.chave, c.valor) into v_cfg
    from public.configuracao c where c.chave = any(c_chaves);

  -- Falhar quando falta chave, em vez de `coalesce` para um default: é a mesma
  -- política de `lib/configuracao` — um número de negócio errado que passa em
  -- silêncio é como ele chega a produção.
  if v_cfg is null or (select count(*) from jsonb_object_keys(v_cfg)) <> array_length(c_chaves, 1) then
    raise exception 'configuracao de remuneracao incompleta' using errcode = 'DS030';
  end if;

  v_faixa := v_cfg -> ('remuneracao.' || p_classe::text);
  v_teto_base := (v_faixa ->> 'teto_base')::numeric;
  v_teto_max := (v_faixa ->> 'teto_max')::numeric;

  -- 1 · Piso. Fora das 72h ele cai, com um mínimo absoluto.
  if p_no_prazo then
    v_piso := (v_faixa ->> 'piso')::numeric;
  else
    v_piso := greatest(
      (v_cfg ->> 'piso_minimo_atraso_percentual')::numeric,
      (v_faixa ->> 'piso')::numeric - (v_cfg ->> 'penalidade_atraso_pontos')::numeric
    );
  end if;

  v_retido := coalesce((v_cfg ->> 'compartilhamento.acrescimo_retido')::boolean, false);

  -- 2 · Acréscimos de conteúdo, em **ordem fixa declarada**. A ordem não muda
  -- o total, mas torna o jsonb byte a byte determinístico e comparável em teste.
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

  -- 3 · Os três de conteúdo são capados no **teto na avaliação**.
  v_pct_base := least(v_piso + v_soma, v_teto_base);

  -- 4 · O compartilhamento é o único que passa de `teto_base`, e vai até
  -- `teto_max`. É por isso que ele vale 8 pontos, e não 3.
  if coalesce((p_opcionais ->> 'compartilhou')::boolean, false) then
    v_pct := least(
      v_pct_base + (v_cfg ->> 'acrescimo_compartilhamento_percentual')::numeric,
      v_teto_max);
    v_acrescimos := v_acrescimos || jsonb_build_array(jsonb_build_object(
      'chave', 'compartilhou',
      'percentual', (v_cfg ->> 'acrescimo_compartilhamento_percentual')::numeric,
      'retido', v_retido));
  else
    v_pct := v_pct_base;
  end if;

  -- 5 · Base em centavos, congelada.
  v_base_centavos := round(p_base_claves * (v_cfg ->> 'clave_valor_centavos')::numeric);

  -- 6 · Sobre o que o percentual incide. `bruto` é o que o protótipo faz;
  -- `cota_curador` existe para a virada de open-questions #5 ser um `update`
  -- de configuração, e não uma reescrita desta função.
  if (v_cfg ->> 'remuneracao.base') = 'cota_curador' then
    v_base_calculo := round(v_base_centavos
                            * (v_cfg ->> 'margem_plataforma_percentual')::numeric / 100);
  else
    v_base_calculo := v_base_centavos;
  end if;

  v_valor := round(v_base_calculo * v_pct / 100)::bigint;

  -- 7 · A comissão é a **diferença**, nunca um segundo arredondamento: é o que
  -- faz `valor + comissao = base` fechar sem centavo perdido nem sobrando.
  return query select
    v_piso,
    v_acrescimos,
    v_pct,
    v_teto_max,
    (not p_no_prazo),
    v_base_centavos,
    v_valor,
    v_base_centavos - v_valor;
end;
$funcao$;

comment on function calcular_remuneracao(classe_curador, boolean, numeric, jsonb) is
  'Remuneracao por classe e prazo, conforme o algoritmo do prototipo da R2. Pura e deterministica: nenhum now(), nenhum auth.uid(). Cobertura de teste obrigatoria.';

revoke execute on function calcular_remuneracao(classe_curador, boolean, numeric, jsonb)
  from public, anon;
-- A etapa 5 da avaliação prevê o valor com esta mesma função.
grant execute on function calcular_remuneracao(classe_curador, boolean, numeric, jsonb)
  to authenticated;

-- ---------------------------------------------------------- enviar_avaliacao

-- Atômica. `security definer` porque escreve em `ganho_curador`, onde nenhum
-- papel tem `insert` (RNF-003), e porque precisa fechar o `envio` num estado
-- terminal que o trigger da `0006` reserva às RPCs.
create or replace function enviar_avaliacao(
  p_envio_id uuid,
  p_notas jsonb,
  p_nota_subjetiva numeric,
  p_feedback text,
  p_escuta_percentual numeric,
  p_compartilhamento jsonb default '{"modalidade":"nao_compartilhou"}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $funcao$
declare
  v_envio public.envio;
  v_curador public.perfil_curador;
  v_avaliacao_id uuid;
  v_ganho_id uuid;
  v_cfg jsonb;
  v_obrigatorios text[];
  v_faltando text[];
  v_no_prazo boolean;
  v_total_criterios integer;
  v_respondidos integer;
  v_justificados integer;
  v_opcionais jsonb;
  v_r record;
  v_perfil_artista uuid;
  v_modalidade public.modalidade_compartilhamento;
begin
  -- 1 · Trava a linha antes de qualquer leitura de estado.
  select * into v_envio from public.envio e where e.id = p_envio_id for update;
  if not found then
    raise exception 'envio inexistente' using errcode = 'DS024';
  end if;

  -- 2 · Propriedade **no corpo**: `security definer` ignora a RLS, e esquecer
  -- esta checagem é escalonamento horizontal sobre dinheiro.
  select * into v_curador from public.perfil_curador pc
   where pc.id = v_envio.perfil_curador_id and pc.perfil_id = auth.uid();
  if not found then
    raise exception 'este envio nao e seu' using errcode = 'DS020';
  end if;

  -- 3 · Situação.
  if v_envio.situacao not in ('recebeu', 'ouviu', 'avaliando') then
    raise exception 'envio nao esta em avaliacao' using errcode = 'DS004';
  end if;

  if exists (select 1 from public.avaliacao a
              where a.envio_id = p_envio_id and a.situacao = 'concluida') then
    raise exception 'avaliacao ja concluida' using errcode = 'DS005';
  end if;

  -- 4 · Uma leitura de configuração.
  select jsonb_object_agg(c.chave, c.valor) into v_cfg
    from public.configuracao c
   where c.chave in ('escuta_minima_percentual', 'criterios_obrigatorios',
                     'feedback_min_caracteres', 'justificativa_min_caracteres',
                     'acrescimo_justificativa_min_itens');

  -- 5 · Validações, na ordem em que o usuário as percebe.
  if coalesce(p_escuta_percentual, 0) < (v_cfg ->> 'escuta_minima_percentual')::numeric then
    raise exception 'escuta abaixo do minimo exigido' using errcode = 'DS001';
  end if;

  select array_agg(valor) into v_obrigatorios
    from jsonb_array_elements_text(v_cfg -> 'criterios_obrigatorios') as t(valor);

  select array_agg(o) into v_faltando
    from unnest(v_obrigatorios) as o
   where not exists (
     select 1 from jsonb_array_elements(p_notas) as n
      where n ->> 'criterio' = o and (n ->> 'nota') is not null
   );

  if v_faltando is not null then
    raise exception 'criterio obrigatorio ausente: %', array_to_string(v_faltando, ', ')
      using errcode = 'DS002';
  end if;

  if char_length(btrim(coalesce(p_feedback, ''))) = 0 then
    raise exception 'o feedback escrito e obrigatorio' using errcode = 'DS003';
  end if;

  -- 6 · Grava o rascunho completo. `no_prazo` e a classe congelam **aqui**, e
  -- em nenhum outro lugar.
  v_no_prazo := now() <= v_envio.prazo_em;

  insert into public.avaliacao (
    envio_id, perfil_curador_id, nota_subjetiva, feedback,
    escuta_percentual, situacao, passo_atual
  )
  values (
    p_envio_id, v_envio.perfil_curador_id, p_nota_subjetiva, p_feedback,
    coalesce(p_escuta_percentual, 0), 'rascunho', 5
  )
  on conflict (envio_id) do update
     set nota_subjetiva = excluded.nota_subjetiva,
         feedback = excluded.feedback,
         escuta_percentual = excluded.escuta_percentual,
         passo_atual = 5
  returning id into v_avaliacao_id;

  -- 7 · Notas: apaga e reinsere, porque o wizard salva e sai várias vezes.
  delete from public.nota_criterio nc where nc.avaliacao_id = v_avaliacao_id;

  insert into public.nota_criterio (avaliacao_id, criterio, nota, justificativa)
  select v_avaliacao_id, n ->> 'criterio', (n ->> 'nota')::numeric, n ->> 'justificativa'
    from jsonb_array_elements(p_notas) as n;

  -- 8 · Compartilhamento, inclusive `nao_compartilhou`.
  v_modalidade := coalesce(p_compartilhamento ->> 'modalidade', 'nao_compartilhou')
                    ::public.modalidade_compartilhamento;

  insert into public.compartilhamento
    (avaliacao_id, modalidade, midia_curador_id, descricao, url)
  values (
    v_avaliacao_id, v_modalidade,
    nullif(p_compartilhamento ->> 'midia_curador_id', '')::uuid,
    p_compartilhamento ->> 'descricao',
    p_compartilhamento ->> 'url'
  )
  on conflict (avaliacao_id) do update
     set modalidade = excluded.modalidade,
         midia_curador_id = excluded.midia_curador_id,
         descricao = excluded.descricao,
         url = excluded.url;

  -- 9 · Os opcionais são derivados **do que foi gravado**, não do que o cliente
  -- mandou. É a diferença entre um acréscimo apurado e um acréscimo declarado.
  select count(*) into v_total_criterios from public.criterio c where c.ativo;
  select count(*) into v_respondidos
    from public.nota_criterio nc where nc.avaliacao_id = v_avaliacao_id;
  select count(*) into v_justificados
    from public.nota_criterio nc
   where nc.avaliacao_id = v_avaliacao_id
     and char_length(btrim(coalesce(nc.justificativa, '')))
         >= (v_cfg ->> 'justificativa_min_caracteres')::integer;

  v_opcionais := jsonb_build_object(
    'onze_criterios', v_respondidos = v_total_criterios,
    'justificativas_250', v_justificados >= (v_cfg ->> 'acrescimo_justificativa_min_itens')::integer,
    'feedback_150', char_length(btrim(p_feedback)) >= (v_cfg ->> 'feedback_min_caracteres')::integer,
    'compartilhou', v_modalidade <> 'nao_compartilhou'
  );

  -- 10 · A remuneração. A mesma função que a tela usou para prever.
  select * into v_r
    from public.calcular_remuneracao(
      v_curador.classe, v_no_prazo, v_envio.total_claves, v_opcionais);

  insert into public.ganho_curador (
    avaliacao_id, perfil_curador_id, base_claves, base_centavos, classe, no_prazo,
    piso_percentual, acrescimos, percentual_aplicado, teto_percentual,
    penalidade_prazo, valor_centavos, comissao_centavos
  )
  values (
    v_avaliacao_id, v_envio.perfil_curador_id, v_envio.total_claves, v_r.base_centavos,
    v_curador.classe, v_no_prazo, v_r.piso_percentual, v_r.acrescimos,
    v_r.percentual_aplicado, v_r.teto_percentual, v_r.penalidade_prazo,
    v_r.valor_centavos, v_r.comissao_centavos
  )
  returning id into v_ganho_id;

  -- 11 · Conclui a avaliação, congelando o que explica o ganho.
  update public.avaliacao
     set situacao = 'concluida',
         concluida_em = now(),
         no_prazo = v_no_prazo,
         classe_no_momento = v_curador.classe
   where id = v_avaliacao_id;

  -- 12 · Fecha o envio.
  update public.envio
     set situacao = 'pronto', concluido_em = now()
   where id = p_envio_id;

  -- 13 · Notifica os dois lados (matriz de notificações).
  select f.perfil_artista_id into v_perfil_artista
    from public.faixa f where f.id = v_envio.faixa_id;

  perform public.registrar_notificacao(
    pa.perfil_id, 'feedback_concluido',
    jsonb_build_object('envio_id', p_envio_id, 'faixa_id', v_envio.faixa_id))
  from public.perfil_artista pa where pa.id = v_perfil_artista;

  perform public.registrar_notificacao(
    v_curador.perfil_id, 'credito_liberado',
    jsonb_build_object('ganho_id', v_ganho_id, 'valor_centavos', v_r.valor_centavos));

  return v_ganho_id;
end;
$funcao$;

comment on function enviar_avaliacao(uuid, jsonb, numeric, text, numeric, jsonb) is
  'Conclui a avaliacao numa transacao: valida, congela no_prazo e classe, grava notas e compartilhamento, calcula a remuneracao, insere o ganho, fecha o envio e notifica.';

revoke execute on function enviar_avaliacao(uuid, jsonb, numeric, text, numeric, jsonb)
  from public, anon;
grant execute on function enviar_avaliacao(uuid, jsonb, numeric, text, numeric, jsonb)
  to authenticated;

-- ------------------------------------------------------------------------ RLS

alter table ganho_curador enable row level security;

-- O curador lê os próprios ganhos, **somente leitura** (data-model §12); o
-- financeiro lê todos, para conciliar.
create policy "ganho_curador: dono le, financeiro le todos"
  on ganho_curador for select
  to authenticated
  using (perfil_curador_id = meu_perfil_curador_id() or tem_permissao('financeiro'));

-- Nenhuma policy de escrita: só `enviar_avaliacao`.
