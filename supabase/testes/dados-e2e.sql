-- ============================================================================
-- Contas e catálogo da suíte E2E
--
-- **Não é migration.** Vive em `supabase/testes/` porque cria dados, não
-- schema, e porque não deve rodar em toda promoção de ambiente.
--
-- Ao contrário dos `*.testes.sql` deste diretório, este arquivo **commita**:
-- as contas têm de sobreviver à transação para o Playwright entrar com elas.
--
-- ---------------------------------------------------------------------------
-- COMO RODAR
--
-- A senha não está aqui. Ela entra por `current_setting`, e a mesma senha vai
-- para `E2E_SENHA` no `.env.local` (local) ou no secret do job (CI):
--
--   set dissona.e2e_senha = 'a-senha-escolhida';
--   \i supabase/testes/dados-e2e.sql
--
-- Ou, pelo `execute_sql` do MCP, as duas instruções na mesma chamada.
--
-- Versionar a senha seria versionar a credencial de uma conta com papel
-- `admin` num projeto que também serve produção (open-questions #25 — Preview,
-- Production e E2E compartilham o mesmo projeto Supabase). Daí o parâmetro.
--
-- ---------------------------------------------------------------------------
-- IDEMPOTENTE
--
-- Rodar duas vezes é seguro: cada bloco é `on conflict do nothing` ou
-- `update`. Rodar depois de mudar `dissona.e2e_senha` **troca** a senha das
-- três contas, que é o comportamento desejado quando o secret gira.
--
-- ---------------------------------------------------------------------------
-- LIMPEZA
--
-- Nada aqui é apagado automaticamente. O que a suíte cria durante a execução
-- (pacotes de A2 e A3) leva o prefixo `e2e_` no nome, e o rodapé deste arquivo
-- traz o comando de varredura.
-- ============================================================================

-- --------------------------------------------------------------- as contas

do $bloco$
declare
  v_senha text := current_setting('dissona.e2e_senha', true);
  v_ator record;
begin
  if v_senha is null or btrim(v_senha) = '' then
    raise exception 'defina dissona.e2e_senha antes de rodar: set dissona.e2e_senha = ''...''';
  end if;

  for v_ator in
    select * from (values
      ('e2e_admin@e2e.dissona.local',   'E2E Admin'),
      ('e2e_suporte@e2e.dissona.local', 'E2E Suporte'),
      ('e2e_artista@e2e.dissona.local', 'E2E Artista'),
      -- As quatro abaixo servem à suíte de paridade visual
      -- (`e2e/prototipo/`), que precisa de uma conta **por estado de tela**:
      -- sem papel, com tour pendente, meio do wizard e wizard concluído.
      -- Nenhuma delas navega no produto além disso.
      ('e2e_sem_papel@e2e.dissona.local', 'E2E Sem Papel'),
      ('e2e_tour@e2e.dissona.local',      'E2E Tour'),
      ('e2e_wizard@e2e.dissona.local',    'E2E Wizard'),
      ('e2e_bronze@e2e.dissona.local',    'E2E Bronze'),
      ('e2e_prata@e2e.dissona.local',     'E2E Prata')
    ) as t(email, nome)
  loop
    -- Existência conferida com `select`, e não com `on conflict`.
    --
    -- O índice único de e-mail em `auth.users` é **parcial**
    -- (`where is_sso_user = false`) e sobre uma expressão (`lower(email)`), e
    -- `on conflict` exige que a inferência case expressão e predicado
    -- exatamente. É detalhe interno do Supabase Auth, que pode mudar sem
    -- aviso; um `select` antes não pode quebrar por isso.
    if exists (select 1 from auth.users u where u.email = v_ator.email) then
      -- O `coalesce` nos tokens conserta contas criadas por uma versão
      -- anterior deste arquivo, que as deixava NULL.
      update auth.users u set
        encrypted_password = extensions.crypt(v_senha, extensions.gen_salt('bf')),
        email_confirmed_at = coalesce(u.email_confirmed_at, now()),
        confirmation_token = coalesce(u.confirmation_token, ''),
        recovery_token = coalesce(u.recovery_token, ''),
        email_change = coalesce(u.email_change, ''),
        email_change_token_new = coalesce(u.email_change_token_new, ''),
        email_change_token_current = coalesce(u.email_change_token_current, ''),
        reauthentication_token = coalesce(u.reauthentication_token, ''),
        updated_at = now()
      where u.email = v_ator.email;
    else
      -- `auth.users` direto, e não `auth.admin.createUser`: este arquivo roda
      -- por SQL, e o trigger `criar_perfil_para_novo_usuario` da 0001 faz o
      -- resto — inclusive criar o `perfil`. Deixar o trigger agir é o que
      -- garante que a conta de teste passe pelo **mesmo** caminho de uma
      -- conta real.
      --
      -- Os seis campos de token vão como **string vazia**, e não NULL. Sem
      -- isso o login falha com "Database error querying schema" (HTTP 500) e
      -- nada no banco parece errado: o GoTrue lê essas colunas para `string`
      -- de Go e não sabe converter NULL. É a armadilha clássica de criar
      -- usuário por SQL cru, e ela **não aparece** nos `*.testes.sql` deste
      -- diretório porque nenhum deles autentica de verdade — eles só trocam de
      -- `role` dentro da transação. Só um login pela tela expõe o problema.
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        confirmation_token, recovery_token,
        email_change, email_change_token_new, email_change_token_current,
        reauthentication_token
      )
      values (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(), 'authenticated', 'authenticated',
        v_ator.email,
        extensions.crypt(v_senha, extensions.gen_salt('bf')),
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('nome_completo', v_ator.nome, 'aceite_termos', 'true'),
        '', '', '', '', '', ''
      );
    end if;
  end loop;
end $bloco$;

-- ---------------------------------------------------------------- os papéis

-- `admin` é o único papel que `papel_usuario` recusa por policy (a 0001 barra
-- autopromoção). Aqui o insert roda como `postgres`, que é `bypassrls` — é o
-- mesmo privilégio que `aceitar_convite_admin` usa, por outro caminho.
insert into papel_usuario (perfil_id, papel)
select p.id, 'admin'::papel from perfil p
 where p.id in (
   select u.id from auth.users u
    where u.email in ('e2e_admin@e2e.dissona.local', 'e2e_suporte@e2e.dissona.local')
 )
on conflict (perfil_id, papel) do nothing;

insert into papel_usuario (perfil_id, papel)
select u.id, 'artista'::papel from auth.users u
 where u.email = 'e2e_artista@e2e.dissona.local'
on conflict (perfil_id, papel) do nothing;

insert into perfil_artista (perfil_id)
select u.id from auth.users u
 where u.email = 'e2e_artista@e2e.dissona.local'
on conflict (perfil_id) do nothing;

-- ------------------------------------------- os estados da paridade visual

-- `e2e_sem_papel` fica **sem** `papel_usuario` de propósito: é a única forma de
-- abrir a seleção de perfil (1.4), que a guarda de rota só mostra a quem está
-- autenticado e ainda não escolheu.

-- `e2e_tour` é artista com o tour pendente — `onboarding_visto_em` nulo é o que
-- leva o login para `/onboarding` (1.5).
insert into papel_usuario (perfil_id, papel)
select u.id, 'artista'::papel from auth.users u where u.email = 'e2e_tour@e2e.dissona.local'
on conflict (perfil_id, papel) do nothing;

insert into perfil_artista (perfil_id)
select u.id from auth.users u where u.email = 'e2e_tour@e2e.dissona.local'
on conflict (perfil_id) do nothing;

update perfil set onboarding_visto_em = null
 where id in (select u.id from auth.users u where u.email = 'e2e_tour@e2e.dissona.local');

-- As três contas de curador cobrem os três estados do módulo 12.
insert into papel_usuario (perfil_id, papel)
select u.id, 'curador'::papel from auth.users u
 where u.email in (
   'e2e_wizard@e2e.dissona.local',
   'e2e_bronze@e2e.dissona.local',
   'e2e_prata@e2e.dissona.local'
 )
on conflict (perfil_id, papel) do nothing;

-- Wizard em andamento: `rascunho` no passo 1, que é onde a retomada entra.
insert into perfil_curador (perfil_id, passo_cadastro, situacao, classe)
select u.id, 1, 'rascunho'::situacao_curador, 'bronze'::classe_curador
  from auth.users u where u.email = 'e2e_wizard@e2e.dissona.local'
on conflict (perfil_id) do update set
  passo_cadastro = 1, situacao = 'rascunho', cadastro_concluido_em = null, classificado_em = null;

-- Bronze liberado na hora (12.5) — abre o painel, a conta e "Meu cadastro".
insert into perfil_curador (perfil_id, passo_cadastro, situacao, classe, bio, cadastro_concluido_em, classificado_em)
select u.id, 8, 'bronze_aprovado'::situacao_curador, 'bronze'::classe_curador,
       'Conta de teste da suite de paridade visual.', now(), now()
  from auth.users u where u.email = 'e2e_bronze@e2e.dissona.local'
on conflict (perfil_id) do update set
  passo_cadastro = 8, situacao = 'bronze_aprovado', classe = 'bronze',
  cadastro_concluido_em = now(), classificado_em = now();

-- Candidato a Prata em análise (12.5) — a guarda o mantém fora do painel, e é
-- justamente a tela que precisa ser reencontrável.
insert into perfil_curador (perfil_id, passo_cadastro, situacao, classe, bio, cadastro_concluido_em)
select u.id, 8, 'prata_em_analise'::situacao_curador, 'bronze'::classe_curador,
       'Conta de teste da suite de paridade visual.', now()
  from auth.users u where u.email = 'e2e_prata@e2e.dissona.local'
on conflict (perfil_id) do update set
  passo_cadastro = 8, situacao = 'prata_em_analise', cadastro_concluido_em = now();

-- --------------------------------------------------------- a equipe do admin

insert into membro_admin (perfil_id, cargo, papel_admin, ativo)
select u.id, 'Teste automatizado', 'administrador'::papel_admin, true
  from auth.users u where u.email = 'e2e_admin@e2e.dissona.local'
on conflict (perfil_id) do update set
  papel_admin = 'administrador', ativo = true;

-- `suporte` tem `gestao` só para ler, e **nenhuma** permissão em `pacotes`.
-- É a persona que prova que a tela nega em vez de mostrar botões que a RLS
-- recusaria em silêncio.
insert into membro_admin (perfil_id, cargo, papel_admin, ativo)
select u.id, 'Teste automatizado', 'suporte'::papel_admin, true
  from auth.users u where u.email = 'e2e_suporte@e2e.dissona.local'
on conflict (perfil_id) do update set
  papel_admin = 'suporte', ativo = true;

-- ----------------------------------------------------- o catálogo do protótipo

-- Os quatro pacotes da tela 21, com os valores literais do protótipo. O
-- "Catálogo" **inativo** não é acaso: é o que faz a nota "Só os pacotes ativos
-- aparecem na Carteira do artista" ser demonstrável, e é exatamente o que o
-- cenário A3 pede.
--
-- Sem prefixo `e2e_` de propósito: estes são os pacotes reais do produto, e a
-- suíte só os **lê**. O que ela cria e destrói (A2 e A3) leva o prefixo.
insert into pacote_clave (nome, quantidade_claves, valor_centavos, desconto_percentual, ativo)
select * from (values
  ('Ensaio',      10::numeric,  10000::bigint, 0::numeric,  true),
  ('Repertório',  30::numeric,  28500::bigint, 5::numeric,  true),
  ('Turnê',       60::numeric,  54000::bigint, 10::numeric, true),
  ('Catálogo',   100::numeric,  85000::bigint, 15::numeric, false)
) as t(nome, quantidade_claves, valor_centavos, desconto_percentual, ativo)
where not exists (
  select 1 from pacote_clave pc where pc.nome = t.nome and pc.excluido_em is null
);

-- ------------------------------------------------ a carteira do e2e_artista

-- Os cenários B1 e B3 exigem os **três** tipos de lançamento na mesma conta:
-- adquiridas, usadas e devolvidas. Nenhum deles pode nascer de `insert` no
-- ledger — `lancamento_clave` é append-only por trigger, e a regra do projeto é
-- que só RPC `security definer` escreve nele. Então o seed encena a história
-- real: compra, seleção de curadores e devolução por SLA.
--
-- `criar_pedido_clave` e `confirmar_selecao_curadores` conferem a propriedade
-- contra `auth.uid()` no corpo, e `security definer` não contorna isso. Daí o
-- `set_config('request.jwt.claims', ...)` com `is_local = true`: ele vale só
-- dentro do bloco, e some ao fim da transação.
--
-- Idempotente pela marca em `faixa.titulo`: rodar de novo não duplica nada.
do $seed$
declare
  v_artista_perfil  uuid;
  v_artista_id      uuid;
  v_curador_id      uuid;
  v_pacote_id       uuid;
  v_pedido_id       uuid;
  v_faixa_id        uuid;
  v_envios          uuid[];
begin
  select u.id into v_artista_perfil
    from auth.users u where u.email = 'e2e_artista@e2e.dissona.local';

  select pa.id into v_artista_id
    from public.perfil_artista pa where pa.perfil_id = v_artista_perfil;

  select pc.id into v_curador_id
    from public.perfil_curador pc
    join auth.users u on u.id = pc.perfil_id
   where u.email = 'e2e_bronze@e2e.dissona.local';

  if v_artista_id is null or v_curador_id is null then
    raise notice 'e2e: artista ou curador ausente, pulando a carteira';
    return;
  end if;

  -- Já semeado? A faixa é a âncora.
  if exists (select 1 from public.faixa f
              where f.perfil_artista_id = v_artista_id
                and f.titulo = 'e2e_Faixa da carteira') then
    raise notice 'e2e: carteira ja semeada';
    return;
  end if;

  -- O Bronze precisa de `feedback` ativo, senão `confirmar_selecao_curadores`
  -- recusa com DS012. Os outros dois serviços dão o que a tela 13.1 lista.
  insert into public.servico_curador (perfil_curador_id, tipo, descricao, preco_claves, ativo)
  values
    (v_curador_id, 'feedback', 'Parecer escrito com notas por critério', 2, true),
    (v_curador_id, 'playlist', 'Inclusão na playlist pública',           3, true),
    (v_curador_id, 'post',     'Publicação nas redes com comentário',    4, true)
  on conflict (perfil_curador_id, tipo) do update
    set ativo = true, preco_claves = excluded.preco_claves;

  select pc.id into v_pacote_id
    from public.pacote_clave pc
   where pc.nome = 'Repertório' and pc.ativo and pc.excluido_em is null;

  -- ---- 1 · compra -------------------------------------------------------
  -- Como o artista, porque `criar_pedido_clave` lê `meu_perfil_artista_id()`.
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_artista_perfil, 'role', 'authenticated')::text, true);

  v_pedido_id := public.criar_pedido_clave(v_pacote_id, 'pix');

  -- `confirmar_pedido_clave` é revogada até de `authenticated`: quem a chama é
  -- o webhook, pela service role. Aqui o bloco roda como `postgres`, e o
  -- `set_config` acima não troca de papel — só de identidade.
  perform public.confirmar_pedido_clave(v_pedido_id);

  -- ---- 2 · consumo ------------------------------------------------------
  insert into public.faixa (
    perfil_artista_id, titulo, genero, origem, arquivo_caminho,
    duracao_segundos, contexto_curador, situacao
  )
  values (
    v_artista_id, 'e2e_Faixa da carteira', 'Indie', 'arquivo',
    v_artista_perfil || '/e2e_faixa-da-carteira.mp3',
    212, 'Faixa da suíte automatizada. O que importa aqui é o extrato.',
    'rascunho'
  )
  returning id into v_faixa_id;

  select array_agg(e) into v_envios
    from public.confirmar_selecao_curadores(
      v_faixa_id,
      json_build_array(
        json_build_object('perfil_curador_id', v_curador_id,
                          'servicos', json_build_array('feedback'))
      )::jsonb
    ) as e;

  -- ---- 3 · devolução ----------------------------------------------------
  -- O job só alcança envio com `devolucao_em` vencido. Recuar a data é o que
  -- encena os 7 dias sem resposta sem esperar uma semana.
  update public.envio
     set devolucao_em = now() - interval '1 hour',
         prazo_em     = now() - interval '4 days'
   where id = v_envios[1];

  perform public.devolver_claves_sem_resposta();

  -- ---- 4 · uma faixa que continua na fila --------------------------------
  -- Sem ela, "Comprometidas em análise" ficaria zerada na tela 5 — o envio da
  -- faixa acima foi devolvido, e devolvido não é comprometido. Esta segunda
  -- faixa é também o item que a fila do curador (13) vai listar.
  insert into public.faixa (
    perfil_artista_id, titulo, genero, origem, arquivo_caminho,
    duracao_segundos, contexto_curador, situacao
  )
  values (
    v_artista_id, 'e2e_Faixa em curadoria', 'Rap nacional', 'arquivo',
    v_artista_perfil || '/e2e_faixa-em-curadoria.mp3',
    187, 'Quero saber se a base compete com a voz no refrão.',
    'rascunho'
  )
  returning id into v_faixa_id;

  perform public.confirmar_selecao_curadores(
    v_faixa_id,
    json_build_array(
      json_build_object('perfil_curador_id', v_curador_id,
                        'servicos', json_build_array('feedback', 'playlist'))
    )::jsonb
  );

  raise notice 'e2e: carteira semeada (compra, consumo, devolucao e envio ativo)';
end
$seed$;

-- ------------------------------------------- uma faixa por cenário do C3 ao C6

-- `playwright.config.ts` roda `fullyParallel: true`, e C3, C4, C5 e C6 escrevem
-- todos no **mesmo** rascunho se compartilharem o envio: um worker salva cinco
-- notas enquanto o outro afirma que há uma só. É a mesma razão que fez A2 e A3
-- criarem pacotes com nome único — aqui o recurso disputado é o envio, e ele
-- não pode ser criado pelo navegador.
--
-- Então cada cenário ganha o seu. Dentro de um arquivo os testes seguem em
-- série (`test.describe.configure({ mode: 'serial' })`), que é o que a suíte
-- declara.
--
-- **A escuta já vem medida em 100%.** O Playwright não reproduz áudio de
-- verdade, e o arquivo destas faixas nem existe no Storage. Sem isto,
-- `enviar_avaliacao` recusaria a conclusão com `DS001` e o C6 testaria o gate
-- em vez da conclusão. O gate em si é provado em
-- `0009_remuneracao.testes.sql`, que é onde ele mora.
--
-- **O C6 consome o dele**: concluir é irreversível — o envio vira `pronto` e
-- `ganho_curador` não é reescrito nem apagado. Por isso a condição de criação
-- é "não há envio pendente com este título", e não "a faixa não existe": rodar
-- este arquivo antes da suíte repõe o cenário. As concluídas ficam, e ficam bem
-- — viram histórico de devolutiva do artista.
do $cenarios$
declare
  v_artista_perfil uuid;
  v_artista_id     uuid;
  v_curador_id     uuid;
  v_faixa_id       uuid;
  v_envios         uuid[];
  v_titulo         text;
begin
  select u.id into v_artista_perfil
    from auth.users u where u.email = 'e2e_artista@e2e.dissona.local';

  select pa.id into v_artista_id
    from public.perfil_artista pa where pa.perfil_id = v_artista_perfil;

  select pc.id into v_curador_id
    from public.perfil_curador pc
    join auth.users u on u.id = pc.perfil_id
   where u.email = 'e2e_bronze@e2e.dissona.local';

  if v_artista_id is null or v_curador_id is null then
    raise notice 'e2e: artista ou curador ausente, pulando as faixas dos cenarios';
    return;
  end if;

  -- `confirmar_selecao_curadores` confere a propriedade contra `auth.uid()` no
  -- corpo, e `security definer` não contorna isso.
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_artista_perfil, 'role', 'authenticated')::text, true);

  -- B7 confirma seleções a cada execução e consome Claves; sem recarga, a
  -- carteira zera e este bloco (e o B7) passam a falhar com DS010. Recarrega
  -- pelo caminho real — pedido e confirmação — quando o saldo fica baixo.
  if coalesce((select s.disponivel from public.saldo_carteira s
                where s.perfil_artista_id = v_artista_id), 0) < 20 then
    perform public.confirmar_pedido_clave(public.criar_pedido_clave(
      (select pc.id from public.pacote_clave pc
        where pc.ativo and pc.excluido_em is null
        order by pc.quantidade_claves desc limit 1),
      'pix'));
    raise notice 'e2e: carteira recarregada';
  end if;

  foreach v_titulo in array array[
    'e2e_Faixa do C3', 'e2e_Faixa do C4', 'e2e_Faixa do C5', 'e2e_Faixa do C6',
    'e2e_Faixa para concluir'
  ] loop
    continue when exists (
      select 1 from public.envio e join public.faixa f on f.id = e.faixa_id
       where e.perfil_curador_id = v_curador_id
         and f.titulo = v_titulo
         and e.situacao in ('recebeu', 'ouviu', 'avaliando')
    );

    insert into public.faixa (
      perfil_artista_id, titulo, genero, origem, arquivo_caminho,
      duracao_segundos, contexto_curador, situacao
    )
    values (
      v_artista_id, v_titulo, 'Indie', 'arquivo',
      v_artista_perfil || '/' || replace(lower(v_titulo), ' ', '-') || '.mp3',
      201, 'Faixa da suite automatizada: um cenario de avaliacao por envio.',
      'rascunho'
    )
    returning id into v_faixa_id;

    select array_agg(e) into v_envios
      from public.confirmar_selecao_curadores(
        v_faixa_id,
        json_build_array(
          json_build_object('perfil_curador_id', v_curador_id,
                            'servicos', json_build_array('feedback'))
        )::jsonb
      ) as e;

    insert into public.avaliacao (envio_id, perfil_curador_id, escuta_percentual, passo_atual)
    values (v_envios[1], v_curador_id, 100, 1);

    raise notice 'e2e: % criada com escuta ja medida', v_titulo;
  end loop;
end
$cenarios$;

-- ----------------------------------------------------------------- conferência

select
  (select count(*) from auth.users where email like 'e2e_%@e2e.dissona.local') as contas,
  (select count(*) from membro_admin ma
     join auth.users u on u.id = ma.perfil_id
    where u.email like 'e2e_%@e2e.dissona.local') as membros_admin,
  (select count(*) from pacote_clave where excluido_em is null) as pacotes_vivos,
  (select count(*) from pacote_clave where ativo and excluido_em is null) as pacotes_ativos,
  (select count(*) from lancamento_clave l
     join perfil_artista pa on pa.id = l.perfil_artista_id
     join auth.users u on u.id = pa.perfil_id
    where u.email = 'e2e_artista@e2e.dissona.local') as lancamentos_do_artista,
  (select disponivel from saldo_carteira sc
     join perfil_artista pa on pa.id = sc.perfil_artista_id
     join auth.users u on u.id = pa.perfil_id
    where u.email = 'e2e_artista@e2e.dissona.local') as saldo_do_artista;

-- ============================================================================
-- Varredura do que a suíte cria durante a execução:
--
--   update pacote_clave set ativo = false, excluido_em = now()
--    where nome like 'e2e\_%' and excluido_em is null;
--
-- `update`, e não `delete`: `pedido_clave` referencia o pacote, e a exclusão é
-- lógica desde a 0007b.
-- ============================================================================
