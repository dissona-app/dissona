-- ============================================================================
-- 0010 · RPCs de seleção e SLA  (R2)
--
-- `confirmar_selecao_curadores()`, `devolver_claves_sem_resposta()` e
-- `avisar_prazo_72h()`. Ver data-model §10 e architecture §4.1 e §7.
--
-- `devolver_claves_sem_resposta` não tem seção própria no data-model — só
-- aparece como item da linha `0010` em §11 e no §4.1 da arquitetura. A
-- assinatura é definida aqui.
-- ============================================================================

-- ------------------------------------------------ confirmar_selecao_curadores

-- Atômica: debita Claves, cria `envio` e `servico_envio`, agenda o prazo e
-- notifica. Na R2 é acionada pelo **placeholder** de seleção (TASK-215); a tela
-- real (módulo 4) chega na R3, e não muda esta função.
create or replace function confirmar_selecao_curadores(
  p_faixa_id uuid,
  p_selecao jsonb
)
returns setof uuid
language plpgsql
security definer
set search_path = ''
as $funcao$
declare
  v_faixa public.faixa;
  v_artista public.perfil_artista;
  v_cfg jsonb;
  v_disponivel numeric;
  v_total numeric := 0;
  v_item jsonb;
  v_curador public.perfil_curador;
  v_envio_id uuid;
  v_subtotal numeric;
  v_envios uuid[] := '{}';
begin
  -- 1 · Trava a faixa e confere a propriedade no corpo — `security definer`
  -- ignora a RLS.
  select * into v_faixa from public.faixa f where f.id = p_faixa_id for update;
  if not found then
    raise exception 'faixa inexistente' using errcode = 'DS024';
  end if;

  select * into v_artista from public.perfil_artista pa
   where pa.id = v_faixa.perfil_artista_id and pa.perfil_id = auth.uid();
  if not found then
    raise exception 'esta faixa nao e sua' using errcode = 'DS020';
  end if;

  if v_faixa.situacao not in ('rascunho', 'aguardando_selecao') then
    raise exception 'faixa nao esta aguardando selecao' using errcode = 'DS013';
  end if;

  if coalesce(jsonb_array_length(p_selecao), 0) = 0 then
    raise exception 'selecione ao menos um curador' using errcode = 'DS011';
  end if;

  -- 2 · **Serializa por artista.** Sem esta trava, duas confirmações
  -- simultâneas passam as duas pela checagem de saldo e o ledger fica negativo.
  -- `saldo_carteira` é view e não pode ser travada; travar a linha do artista é
  -- o primitivo correto, e mais legível que um advisory lock.
  perform 1 from public.perfil_artista pa where pa.id = v_artista.id for update;

  select jsonb_object_agg(c.chave, c.valor) into v_cfg
    from public.configuracao c
   where c.chave in ('prazo_avaliacao_horas', 'prazo_devolucao_dias');

  -- 3 · Itera **ordenado por curador**: ordem determinística evita deadlock
  -- entre duas execuções concorrentes que compartilhem curadores.
  for v_item in
    select valor from jsonb_array_elements(p_selecao) as t(valor)
     order by (valor ->> 'perfil_curador_id')
  loop
    select * into v_curador from public.perfil_curador pc
     where pc.id = (v_item ->> 'perfil_curador_id')::uuid
       and pc.situacao in ('bronze_aprovado', 'prata_aprovado');
    if not found then
      raise exception 'curador inexistente ou nao aprovado' using errcode = 'DS011';
    end if;

    -- O serviço `feedback` é obrigatório e sempre existe (regras §5): é o que a
    -- avaliação entrega. Sem ele o envio não faria sentido.
    if not exists (
      select 1 from public.servico_curador sc
       where sc.perfil_curador_id = v_curador.id and sc.tipo = 'feedback' and sc.ativo
    ) then
      raise exception 'o curador nao oferece o servico de feedback'
        using errcode = 'DS012';
    end if;

    -- 4 · Cria o envio com os prazos calculados de `configuracao`.
    insert into public.envio (
      faixa_id, perfil_curador_id, total_claves, prazo_em, devolucao_em
    )
    values (
      p_faixa_id, v_curador.id, 0,
      now() + make_interval(hours => (v_cfg ->> 'prazo_avaliacao_horas')::integer),
      now() + make_interval(days => (v_cfg ->> 'prazo_devolucao_dias')::integer)
    )
    returning id into v_envio_id;

    -- 5 · Congela o preço de cada serviço contratado. Mudança de preço depois
    -- não afeta contratação feita (regras §1).
    insert into public.servico_envio (envio_id, servico_curador_id, tipo, preco_claves)
    select v_envio_id, sc.id, sc.tipo, sc.preco_claves
      from public.servico_curador sc
     where sc.perfil_curador_id = v_curador.id
       and sc.ativo
       and (
         sc.tipo = 'feedback'
         or sc.tipo::text = any(
           select jsonb_array_elements_text(coalesce(v_item -> 'servicos', '[]'::jsonb)))
       );

    select coalesce(sum(se.preco_claves), 0) into v_subtotal
      from public.servico_envio se where se.envio_id = v_envio_id;

    update public.envio set total_claves = v_subtotal where id = v_envio_id;

    v_total := v_total + v_subtotal;
    v_envios := v_envios || v_envio_id;
  end loop;

  -- 6 · Só agora o saldo, com o total já apurado dos preços congelados.
  select sc.disponivel into v_disponivel
    from public.saldo_carteira sc where sc.perfil_artista_id = v_artista.id;

  if coalesce(v_disponivel, 0) < v_total then
    raise exception 'saldo insuficiente: precisa de % e tem %', v_total, coalesce(v_disponivel, 0)
      using errcode = 'DS010';
  end if;

  -- 7 · **Um lançamento por envio**, e não um agregado. É o que permite a
  -- devolução por envio e a coluna "Origem" do extrato (5.3). O índice único
  -- parcial garante que não haja um segundo consumo para o mesmo envio.
  insert into public.lancamento_clave
    (perfil_artista_id, tipo, quantidade, envio_id, descricao)
  select v_artista.id, 'consumo', -e.total_claves, e.id,
         'Curadoria de ' || coalesce(p.nome_exibicao, p.nome_completo)
    from public.envio e
    join public.perfil_curador pc on pc.id = e.perfil_curador_id
    join public.perfil p on p.id = pc.perfil_id
   where e.id = any(v_envios);

  update public.faixa set situacao = 'em_curadoria' where id = p_faixa_id;

  -- 8 · Notifica o artista uma vez, e cada curador.
  perform public.registrar_notificacao(
    v_artista.perfil_id, 'selecao_confirmada',
    jsonb_build_object('faixa_id', p_faixa_id, 'curadores', array_length(v_envios, 1),
                       'claves', v_total));

  perform public.registrar_notificacao(
    pc.perfil_id, 'nova_musica_na_fila',
    jsonb_build_object('envio_id', e.id, 'faixa_id', p_faixa_id))
  from public.envio e
  join public.perfil_curador pc on pc.id = e.perfil_curador_id
  where e.id = any(v_envios);

  return query select unnest(v_envios);
end;
$funcao$;

comment on function confirmar_selecao_curadores(uuid, jsonb) is
  'Atomica: cria envios com preco congelado, debita o ledger uma vez por envio, agenda prazos e notifica. Acionada pelo placeholder da R2 (TASK-215) e pela tela real na R3.';

revoke execute on function confirmar_selecao_curadores(uuid, jsonb) from public, anon;
grant execute on function confirmar_selecao_curadores(uuid, jsonb) to authenticated;

-- ---------------------------------------------- devolver_claves_sem_resposta

-- **Não é RPC de usuário**: é job. Revogada até de `authenticated`.
--
-- `for update skip locked` permite duas execuções simultâneas sem contenção e
-- sem trabalho duplicado, e o `limit` mantém a transação curta.
create or replace function devolver_claves_sem_resposta(p_limite integer default 500)
returns integer
language plpgsql
security definer
set search_path = ''
as $funcao$
declare
  v_envio record;
  v_n integer := 0;
begin
  for v_envio in
    select e.id, e.total_claves, e.faixa_id, f.perfil_artista_id, pa.perfil_id
      from public.envio e
      join public.faixa f on f.id = e.faixa_id
      join public.perfil_artista pa on pa.id = f.perfil_artista_id
     where e.situacao in ('recebeu', 'ouviu', 'avaliando')
       and e.devolucao_em <= now()
     order by e.devolucao_em
     limit p_limite
     for update of e skip locked
  loop
    update public.envio
       set situacao = 'devolvido', devolvido_em = now()
     where id = v_envio.id;

    -- O índice único parcial `(envio_id) where tipo = 'devolucao'` é a defesa
    -- que não depende desta função estar correta.
    insert into public.lancamento_clave
      (perfil_artista_id, tipo, quantidade, envio_id, descricao)
    values
      (v_envio.perfil_artista_id, 'devolucao', v_envio.total_claves, v_envio.id,
       'Devolucao por falta de resposta em 7 dias');

    -- A faixa sai da fila do curador; se não sobrou envio ativo, ela encerra.
    if not exists (
      select 1 from public.envio e2
       where e2.faixa_id = v_envio.faixa_id
         and e2.situacao in ('recebeu', 'ouviu', 'avaliando')
    ) then
      update public.faixa set situacao = 'concluida' where id = v_envio.faixa_id;
    end if;

    -- Evento **crítico**: ignora a preferência do usuário.
    perform public.registrar_notificacao(
      v_envio.perfil_id, 'claves_devolvidas',
      jsonb_build_object('envio_id', v_envio.id, 'claves', v_envio.total_claves));

    v_n := v_n + 1;
  end loop;

  return v_n;
end;
$funcao$;

comment on function devolver_claves_sem_resposta(integer) is
  'Job horario: devolve a Clave, tira a faixa da fila, lanca no extrato e notifica (RF-070). O credito devolvido NAO gera ganho para o curador.';

revoke execute on function devolver_claves_sem_resposta(integer)
  from public, anon, authenticated;

-- --------------------------------------------------------- avisar_prazo_72h

-- Também job. `envio.avisado_prazo_em` existe para o aviso não repetir a cada
-- hora durante as 72 horas — sem essa coluna o curador receberia 72 avisos.
create or replace function avisar_prazo_72h(
  p_janela interval default interval '12 hours',
  p_limite integer default 500
)
returns integer
language plpgsql
security definer
set search_path = ''
as $funcao$
declare
  v_envio record;
  v_n integer := 0;
begin
  for v_envio in
    select e.id, e.prazo_em, pc.perfil_id
      from public.envio e
      join public.perfil_curador pc on pc.id = e.perfil_curador_id
     where e.situacao in ('recebeu', 'ouviu', 'avaliando')
       and e.avisado_prazo_em is null
       and e.prazo_em between now() and now() + p_janela
     order by e.prazo_em
     limit p_limite
     for update of e skip locked
  loop
    update public.envio set avisado_prazo_em = now() where id = v_envio.id;

    -- Evento **crítico**: o curador não pode desativar o aviso de prazo.
    perform public.registrar_notificacao(
      v_envio.perfil_id, 'prazo_72h_proximo',
      jsonb_build_object('envio_id', v_envio.id, 'prazo_em', v_envio.prazo_em));

    v_n := v_n + 1;
  end loop;

  return v_n;
end;
$funcao$;

comment on function avisar_prazo_72h(interval, integer) is
  'Job horario: avisa o curador antes de o prazo vencer (RF-069), uma vez por envio.';

revoke execute on function avisar_prazo_72h(interval, integer)
  from public, anon, authenticated;
