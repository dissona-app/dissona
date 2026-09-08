-- ============================================================================
-- 0010b · `confirmar_selecao_curadores` não cria envio com total zero
--
-- A versão da `0010` inseria o `envio` com `total_claves = 0`, depois inseria
-- os `servico_envio` e só então atualizava o total. Mas `envio` tem
-- `check (total_claves > 0)` — e com razão: envio de zero Clave não existe como
-- contrato. O insert estourava com `23514` antes de chegar ao update.
--
-- A correção não é relaxar o check. É apurar o subtotal **antes** de inserir,
-- a partir de `servico_curador`, e criar o `envio` já com o valor final. A
-- função deixa de passar por um estado que o schema recusa.
--
-- O predicado de quais serviços entram é o mesmo nos dois lugares (o subtotal
-- e o `servico_envio`), e por isso vive numa CTE nomeada em vez de repetido.
-- ============================================================================

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
  v_pedidos text[];
  v_envios uuid[] := '{}';
begin
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

  -- Serializa por artista: sem esta trava, duas confirmações simultâneas passam
  -- as duas pela checagem de saldo e o ledger fica negativo.
  perform 1 from public.perfil_artista pa where pa.id = v_artista.id for update;

  select jsonb_object_agg(c.chave, c.valor) into v_cfg
    from public.configuracao c
   where c.chave in ('prazo_avaliacao_horas', 'prazo_devolucao_dias');

  -- Ordem determinística por curador: evita deadlock entre execuções
  -- concorrentes que compartilhem curadores.
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

    -- Os tipos contratados: `feedback` sempre, mais o que o artista pediu.
    -- Apurado uma vez e usado no subtotal e no insert, para os dois não
    -- poderem divergir.
    v_pedidos := array(
      select 'feedback'
      union
      select jsonb_array_elements_text(coalesce(v_item -> 'servicos', '[]'::jsonb))
    );

    select coalesce(sum(sc.preco_claves), 0) into v_subtotal
      from public.servico_curador sc
     where sc.perfil_curador_id = v_curador.id
       and sc.ativo
       and sc.tipo::text = any(v_pedidos);

    -- O `feedback` é obrigatório e sempre existe (regras §5): é o que a
    -- avaliação entrega. Sem ele o subtotal seria zero e o envio, sem sentido.
    if not exists (
      select 1 from public.servico_curador sc
       where sc.perfil_curador_id = v_curador.id and sc.tipo = 'feedback' and sc.ativo
    ) then
      raise exception 'o curador nao oferece o servico de feedback'
        using errcode = 'DS012';
    end if;

    -- Cria o envio **já com o total final**: o schema não aceita zero, e a
    -- função não deve passar por um estado que ele recusa.
    insert into public.envio (
      faixa_id, perfil_curador_id, total_claves, prazo_em, devolucao_em
    )
    values (
      p_faixa_id, v_curador.id, v_subtotal,
      now() + make_interval(hours => (v_cfg ->> 'prazo_avaliacao_horas')::integer),
      now() + make_interval(days => (v_cfg ->> 'prazo_devolucao_dias')::integer)
    )
    returning id into v_envio_id;

    -- Preço congelado: mudança de preço depois não afeta contratação feita.
    insert into public.servico_envio (envio_id, servico_curador_id, tipo, preco_claves)
    select v_envio_id, sc.id, sc.tipo, sc.preco_claves
      from public.servico_curador sc
     where sc.perfil_curador_id = v_curador.id
       and sc.ativo
       and sc.tipo::text = any(v_pedidos);

    v_total := v_total + v_subtotal;
    v_envios := v_envios || v_envio_id;
  end loop;

  select sc.disponivel into v_disponivel
    from public.saldo_carteira sc where sc.perfil_artista_id = v_artista.id;

  if coalesce(v_disponivel, 0) < v_total then
    raise exception 'saldo insuficiente: precisa de % e tem %', v_total, coalesce(v_disponivel, 0)
      using errcode = 'DS010';
  end if;

  -- Um lançamento por envio, e não um agregado: é o que permite a devolução por
  -- envio e a coluna "Origem" do extrato (5.3).
  insert into public.lancamento_clave
    (perfil_artista_id, tipo, quantidade, envio_id, descricao)
  select v_artista.id, 'consumo', -e.total_claves, e.id,
         'Curadoria de ' || coalesce(p.nome_exibicao, p.nome_completo)
    from public.envio e
    join public.perfil_curador pc on pc.id = e.perfil_curador_id
    join public.perfil p on p.id = pc.perfil_id
   where e.id = any(v_envios);

  update public.faixa set situacao = 'em_curadoria' where id = p_faixa_id;

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
  'Atomica: cria envios com preco congelado e total apurado antes do insert, debita o ledger uma vez por envio, agenda prazos e notifica.';

revoke execute on function confirmar_selecao_curadores(uuid, jsonb) from public, anon;
grant execute on function confirmar_selecao_curadores(uuid, jsonb) to authenticated;
