-- ============================================================================
-- 0002c · Credenciais do protótipo e a classificação do curador  (R1)
--
-- Três coisas que o módulo 12 não consegue existir sem, e que só apareceram ao
-- confrontar o schema com o protótipo tela por tela.
--
-- 1 · OS TIPOS DE CREDENCIAL ESTAVAM ERRADOS
--
-- A `0002` aceita `veiculo | formacao | premio | participacao_disco`. O passo 6
-- do wizard do curador declara **seis** credenciais, e três delas não têm para
-- onde ir:
--
--     anos      "3 anos ou mais de atuação"
--     playlist  "Playlist com 1.000+ salvamentos"
--     canal     "Canal com 10 mil+ seguidores"
--     imprensa  "Texto publicado em imprensa ou blog"
--     disco     "Participação em lançamento de disco"
--     formacao  "Formação formal na área"       ← a única por anexo
--
-- O conjunto passa a ser o do protótipo, que o AGENTS.md põe acima da
-- derivação. `veiculo` vira `imprensa` e `participacao_disco` vira `disco`, que
-- são o mesmo item com o nome da tela. `premio` **sai**: o protótipo não tem
-- essa caixa, e "Prêmios" já é a coluna `perfil_curador.premios`, texto livre —
-- ele nunca foi uma credencial contável.
--
-- 2 · NÃO HAVIA ONDE GUARDAR O ANEXO
--
-- `formacao` se comprova por upload ("Anexar comprovação"), não por link, e
-- `verificavel` era gerada de `url is not null` — uma formação anexada contava
-- como não comprovada, e o curador ficava Bronze com a credencial na mão.
--
-- 3 · A CLASSIFICAÇÃO AUTOMÁTICA ESTAVA IMPOSSÍVEL
--
-- `proibir_autopromocao_de_classe` (0002) recusa com `DS020` qualquer escrita
-- do próprio curador em `classe`, `situacao` ou `classificado_em` — e está
-- certa: são o que define a remuneração. Mas a tela 12.4 classifica
-- **automaticamente** ao fim do wizard, e `security definer` não resolve:
-- ele troca o dono da execução, não a sessão, então `auth.uid()` continua
-- sendo o curador e `e_admin()` continua falso.
--
-- A saída é uma janela nomeada e estreita, no mesmo padrão de
-- `current_setting('dissona.motivo')` da `0003`: a RPC marca a transação, e o
-- trigger só cede para a transição exata que a 12.4 faz.
-- ============================================================================

-- ---------------------------------------------------- tipos de credencial ---

alter table credencial_curador
  drop constraint credencial_curador_tipo_conhecido;

alter table credencial_curador
  add constraint credencial_curador_tipo_conhecido
  check (tipo in ('anos', 'playlist', 'canal', 'imprensa', 'disco', 'formacao'));

comment on column credencial_curador.tipo is
  'Uma das seis credenciais do passo 6 do wizard (12.3). E a contagem das verificaveis que classifica (12.4).';

-- ------------------------------------------------------------------ anexo ---

-- Ordem obrigatória: a coluna gerada tem de ser criada **depois** de
-- `anexo_caminho`, porque a expressão a referencia. E `verificavel` tem de ser
-- derrubada antes, porque coluna gerada não aceita `alter ... using`.
alter table credencial_curador drop column verificavel;

alter table credencial_curador add column anexo_caminho text;

alter table credencial_curador
  add column verificavel boolean
  generated always as (url is not null or anexo_caminho is not null) stored;

comment on column credencial_curador.anexo_caminho is
  'Caminho no bucket materiais. Alternativa ao link para a credencial formacao, que se comprova por upload.';
comment on column credencial_curador.verificavel is
  'Gerada: tem link OU anexo. E o que a 12.4 conta contra classe.prata_min_credenciais.';

-- ------------------------------------- a janela da classificação automática --

create or replace function proibir_autopromocao_de_classe()
returns trigger
language plpgsql
security definer
set search_path = ''
as $funcao$
begin
  if public.e_admin() then
    return new;
  end if;

  -- A janela da 12.4. Estreita de propósito, e cada cláusula fecha um caminho:
  --
  --   `classe = 'bronze'`     Ouro e Prata nunca saem do cadastro ("A classe
  --                           Ouro não é atribuída no cadastro"; Prata é
  --                           decisão manual em 20.3).
  --   `situacao in (...)`     só os dois destinos que a tela 12.5 tem.
  --   `old.situacao = 'rascunho'`  vale uma vez por cadastro. Um curador já
  --                           classificado não se reclassifica.
  --
  -- Um cliente do PostgREST não emite `SET`, então só uma função do banco
  -- alcança o marcador — mas as cláusulas acima existem para que, mesmo se
  -- alcançasse, o máximo que conseguisse fosse o que a 12.4 já lhe daria.
  if coalesce(current_setting('dissona.classificacao', true), '') = 'automatica'
     and new.classe = 'bronze'
     and new.situacao in ('bronze_aprovado', 'prata_em_analise')
     and old.situacao = 'rascunho' then
    return new;
  end if;

  if new.classe is distinct from old.classe
     or new.situacao is distinct from old.situacao
     or new.classificado_em is distinct from old.classificado_em then
    raise exception 'classe e situacao do curador sao decisao do admin'
      using errcode = 'DS020';
  end if;

  return new;
end;
$funcao$;

revoke execute on function proibir_autopromocao_de_classe()
  from public, anon, authenticated;

-- ----------------------------------------- concluir_cadastro_curador ---------

-- Fim do wizard (12.4 + 12.5), numa transação: conta as credenciais, decide a
-- classe, fecha o cadastro e notifica. Tudo junto porque um curador com
-- `cadastro_concluido_em` gravado e `situacao` ainda em `rascunho` ficaria
-- preso — a guarda de rota o manda para o wizard, e o wizard já terminou.
create or replace function concluir_cadastro_curador()
returns table (
  classe classe_curador,
  situacao situacao_curador,
  credenciais_verificaveis integer,
  minimo_para_prata integer
)
language plpgsql
security definer
set search_path = ''
as $funcao$
declare
  v_curador public.perfil_curador;
  v_minimo integer;
  v_verificaveis integer;
  v_classe public.classe_curador := 'bronze';
  v_situacao public.situacao_curador;
  v_admin record;
begin
  if auth.uid() is null then
    raise exception 'e preciso estar autenticado para concluir o cadastro'
      using errcode = 'DS020';
  end if;

  select * into v_curador
    from public.perfil_curador pc
   where pc.perfil_id = auth.uid()
   for update;

  if not found then
    raise exception 'cadastro de curador inexistente' using errcode = 'DS024';
  end if;

  if v_curador.cadastro_concluido_em is not null then
    raise exception 'cadastro de curador ja concluido' using errcode = 'DS015';
  end if;

  -- Feedback é o serviço obrigatório (12.2), e
  -- `confirmar_selecao_curadores` (0010) exige um `servico_envio` de feedback.
  -- Liberar um curador sem ele o tornaria contratável e imediatamente
  -- inutilizável.
  if not exists (
    select 1 from public.servico_curador s
     where s.perfil_curador_id = v_curador.id
       and s.tipo = 'feedback'
       and s.ativo
  ) then
    raise exception 'o servico feedback e obrigatorio' using errcode = 'DS012';
  end if;

  select (c.valor::text)::integer into v_minimo
    from public.configuracao c
   where c.chave = 'classe.prata_min_credenciais';

  if v_minimo is null then
    raise exception 'configuracao classe.prata_min_credenciais ausente'
      using errcode = 'DS030';
  end if;

  select count(*) into v_verificaveis
    from public.credencial_curador cc
   where cc.perfil_curador_id = v_curador.id
     and cc.verificavel;

  -- Candidato a Prata segue **Bronze** na coluna `classe`: a promoção é o
  -- ato do admin em 20.3. Enquanto isso, `prata_em_analise` mantém o curador
  -- fora da vitrine — a policy "aprovados sao publicos" (0002) só reconhece
  -- `bronze_aprovado` e `prata_aprovado`.
  if v_verificaveis >= v_minimo then
    v_situacao := 'prata_em_analise';
  else
    v_situacao := 'bronze_aprovado';
  end if;

  perform set_config('dissona.classificacao', 'automatica', true);

  update public.perfil_curador
     set classe = v_classe,
         situacao = v_situacao,
         classificado_em = now(),
         cadastro_concluido_em = now()
   where id = v_curador.id;

  perform set_config('dissona.classificacao', '', true);

  if v_situacao = 'bronze_aprovado' then
    perform public.registrar_notificacao(
      v_curador.perfil_id,
      'bronze_aprovado',
      jsonb_build_object('credenciais', v_verificaveis)
    );
  else
    perform public.registrar_notificacao(
      v_curador.perfil_id,
      'cadastro_em_analise',
      jsonb_build_object('credenciais', v_verificaveis)
    );

    -- 12.5 dispara o alerta para a equipe; a decisão acontece em 20.3.
    for v_admin in
      select ma.perfil_id from public.membro_admin ma where ma.ativo
    loop
      perform public.registrar_notificacao(
        v_admin.perfil_id,
        'curador_prata_em_analise',
        jsonb_build_object(
          'perfil_curador_id', v_curador.id,
          'credenciais', v_verificaveis
        )
      );
    end loop;
  end if;

  return query select v_classe, v_situacao, v_verificaveis, v_minimo;
end;
$funcao$;

comment on function concluir_cadastro_curador() is
  'Fim do wizard do modulo 12: classifica por credenciais verificaveis (12.4), fecha o cadastro e notifica (12.5). Unico caminho — o trigger de autopromocao barra o resto.';

revoke execute on function concluir_cadastro_curador() from public, anon;
grant execute on function concluir_cadastro_curador() to authenticated;
