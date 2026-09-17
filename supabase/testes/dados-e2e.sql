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
      ('e2e_prata@e2e.dissona.local',     'E2E Prata'),
      -- As três abaixo isolam estado que as outras não podem ter ao mesmo
      -- tempo: carteira nunca usada, saldo que não cobre a seleção, e um
      -- curador cuja fila pode ser mexida sem afetar a que o C1 conta.
      ('e2e_artista_novo@e2e.dissona.local', 'E2E Artista Novo'),
      ('e2e_sem_saldo@e2e.dissona.local',    'E2E Sem Saldo'),
      ('e2e_compra@e2e.dissona.local',       'E2E Compra'),
      ('e2e_curador_sla@e2e.dissona.local',  'E2E Curador SLA'),
      -- Estados de conta que a autenticação precisa distinguir, e que nenhuma
      -- outra persona pode ter ao mesmo tempo: bloqueada, e com dois papéis.
      ('e2e_bloqueada@e2e.dissona.local',    'E2E Bloqueada'),
      ('e2e_dois_papeis@e2e.dissona.local',  'E2E Dois Papéis'),
      -- As quatro do módulo 12. O wizard escreve tudo no mesmo
      -- `perfil_curador`, e `fullyParallel` faria um arquivo salvar o passo 5
      -- enquanto outro afirma o passo 1 — uma persona por arquivo de spec.
      ('e2e_wizard_nav@e2e.dissona.local',    'E2E Wizard Navegação'),
      ('e2e_wizard_midias@e2e.dissona.local', 'E2E Wizard Mídias'),
      ('e2e_wizard_cred@e2e.dissona.local',   'E2E Wizard Credenciais'),
      ('e2e_manutencao@e2e.dissona.local',    'E2E Manutenção')
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

-- O artista principal é uma conta **assentada**: onboarding já visto, ambiente
-- gravado. Sem isto o login dele cai em `/onboarding` (RF-007 funcionando), e
-- todo cenário que afirma o destino do login precisaria tratar o desvio. Quem
-- existe para o tour pendente é `e2e_tour`, logo abaixo — é para isso que ela
-- tem conta própria.
update perfil set
  onboarding_visto_em = coalesce(onboarding_visto_em, now()),
  ultimo_ambiente = coalesce(ultimo_ambiente, 'artista')
 where id in (select u.id from auth.users u where u.email = 'e2e_artista@e2e.dissona.local');

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

-- Os curadores que **trabalham** nos cenários são contas assentadas: onboarding
-- já visto e ambiente gravado. Sem isso o login deles cai em `/onboarding`
-- (RF-007 funcionando) e todo cenário que afirma o destino do login teria de
-- tratar o desvio. O wizard e o Prata ficam de fora de propósito: a guarda os
-- desvia antes, para o cadastro e para a análise.
update perfil set
  onboarding_visto_em = coalesce(onboarding_visto_em, now()),
  ultimo_ambiente = coalesce(ultimo_ambiente, 'curador')
 where id in (
   select u.id from auth.users u
    where u.email in ('e2e_bronze@e2e.dissona.local', 'e2e_curador_sla@e2e.dissona.local')
 );

-- Candidato a Prata em análise (12.5) — a guarda o mantém fora do painel, e é
-- justamente a tela que precisa ser reencontrável.
insert into perfil_curador (perfil_id, passo_cadastro, situacao, classe, bio, cadastro_concluido_em)
select u.id, 8, 'prata_em_analise'::situacao_curador, 'bronze'::classe_curador,
       'Conta de teste da suite de paridade visual.', now()
  from auth.users u where u.email = 'e2e_prata@e2e.dissona.local'
on conflict (perfil_id) do update set
  passo_cadastro = 8, situacao = 'prata_em_analise', cadastro_concluido_em = now();

-- ----------------------------------------- os estados isolados dos cenários

-- `e2e_artista_novo` e `e2e_sem_saldo` são artistas **sem carteira encenada**:
-- ganham papel e `perfil_artista`, e nada mais. É o estado natural de quem
-- nunca comprou, e é justamente o que `e2e_artista` não pode ter — ele tem
-- saldo e movimentações porque B1, B2 e B3 dependem disso.
--
--  * `e2e_artista_novo` abre a Carteira vazia (RF-042). **Nunca compra**: uma
--    compra apaga o único estado que a conta existe para provar.
--  * `e2e_sem_saldo` chega à seleção sem Claves que cubram o serviço, e é aí
--    que o bloqueio do RF-049 aparece.
--  * `e2e_compra` é a carteira do B2, que afirma **aritmética exata** de saldo.
--    Ela não é semeada com saldo porque o próprio B2 compra; o que ela precisa
--    é que ninguém mais gaste dali. Em `e2e_artista` isso era impossível: o B7
--    confirma seleção e consome 2 Claves, e caindo na janela de medição do Pix
--    o teste acusava crédito em dobro que não houve.
insert into papel_usuario (perfil_id, papel)
select u.id, 'artista'::papel from auth.users u
 where u.email in (
   'e2e_artista_novo@e2e.dissona.local',
   'e2e_sem_saldo@e2e.dissona.local',
   'e2e_compra@e2e.dissona.local'
 )
on conflict (perfil_id, papel) do nothing;

insert into perfil_artista (perfil_id)
select u.id from auth.users u
 where u.email in (
   'e2e_artista_novo@e2e.dissona.local',
   'e2e_sem_saldo@e2e.dissona.local',
   'e2e_compra@e2e.dissona.local'
 )
on conflict (perfil_id) do nothing;

-- `e2e_curador_sla` recebe as faixas cujo relógio os testes adiantam. Separado
-- do `e2e_bronze` porque a devolução por SLA **tira faixa da fila**: com a
-- mesma conta, a contagem que o C1 afirma mudaria no meio da asserção.
insert into papel_usuario (perfil_id, papel)
select u.id, 'curador'::papel from auth.users u
 where u.email = 'e2e_curador_sla@e2e.dissona.local'
on conflict (perfil_id, papel) do nothing;

insert into perfil_curador (perfil_id, passo_cadastro, situacao, classe, bio, cadastro_concluido_em, classificado_em)
select u.id, 8, 'bronze_aprovado'::situacao_curador, 'bronze'::classe_curador,
       'Conta de teste dos cenarios de SLA e atomicidade.', now(), now()
  from auth.users u where u.email = 'e2e_curador_sla@e2e.dissona.local'
on conflict (perfil_id) do update set
  passo_cadastro = 8, situacao = 'bronze_aprovado', classe = 'bronze',
  cadastro_concluido_em = now(), classificado_em = now();

-- Sem serviço ativo o curador não é selecionável, e `confirmar_selecao_curadores`
-- recusa a montagem das faixas abaixo. Os preços espelham os do `e2e_bronze`.
insert into servico_curador (perfil_curador_id, tipo, descricao, preco_claves, ativo)
-- O cast é explícito porque o literal vem de um `values` correlacionado: ali o
-- Postgres não infere `tipo_servico` do destino, como faria num insert direto.
select pc.id, t.tipo::tipo_servico, t.descricao, t.preco, true
  from public.perfil_curador pc
  join auth.users u on u.id = pc.perfil_id
 cross join (values
   ('feedback', 'Parecer escrito com notas por critério', 2::numeric),
   ('playlist', 'Inclusão na playlist pública',           3),
   ('post',     'Publicação nas redes com comentário',    4)
 ) as t(tipo, descricao, preco)
 where u.email = 'e2e_curador_sla@e2e.dissona.local'
on conflict (perfil_curador_id, tipo) do update
  set preco_claves = excluded.preco_claves, ativo = true;

-- ----------------------------------------------- os estados do módulo 12

-- Três rascunhos no passo 1, um por arquivo de spec do wizard. O `do update`
-- é o que **repõe** o passo: os cenários avançam e salvam, e sem a volta a
-- segunda execução encontraria o wizard onde a primeira o deixou.
insert into papel_usuario (perfil_id, papel)
select u.id, 'curador'::papel from auth.users u
 where u.email in ('e2e_wizard_nav@e2e.dissona.local', 'e2e_wizard_midias@e2e.dissona.local',
                   'e2e_wizard_cred@e2e.dissona.local', 'e2e_manutencao@e2e.dissona.local')
on conflict (perfil_id, papel) do nothing;

insert into perfil_curador (perfil_id, passo_cadastro, situacao, classe)
select u.id, 1, 'rascunho'::situacao_curador, 'bronze'::classe_curador
  from auth.users u
 where u.email in ('e2e_wizard_nav@e2e.dissona.local', 'e2e_wizard_midias@e2e.dissona.local',
                   'e2e_wizard_cred@e2e.dissona.local')
on conflict (perfil_id) do update set
  passo_cadastro = 1, situacao = 'rascunho', cadastro_concluido_em = null, classificado_em = null;

-- `e2e_manutencao` é Bronze aprovado com serviços — a tela 12.6 precisa de um
-- cadastro concluído para ter o que manter, e de uma classe que só ela observe:
-- a regra que o cenário prova é "alterar mídia **não** altera a classe".
insert into perfil_curador (perfil_id, passo_cadastro, situacao, classe, bio, cadastro_concluido_em, classificado_em)
select u.id, 8, 'bronze_aprovado'::situacao_curador, 'bronze'::classe_curador,
       'Conta de teste da manutencao de cadastro, com bio suficientemente longa.', now(), now()
  from auth.users u where u.email = 'e2e_manutencao@e2e.dissona.local'
on conflict (perfil_id) do update set
  passo_cadastro = 8, situacao = 'bronze_aprovado', classe = 'bronze',
  cadastro_concluido_em = now(), classificado_em = now();

insert into servico_curador (perfil_curador_id, tipo, descricao, preco_claves, ativo)
select pc.id, t.tipo::tipo_servico, t.descricao, t.preco, true
  from public.perfil_curador pc
  join auth.users u on u.id = pc.perfil_id
 cross join (values
   ('feedback', 'Parecer escrito com notas por critério', 2::numeric),
   ('playlist', 'Inclusão na playlist pública',           3)
 ) as t(tipo, descricao, preco)
 where u.email = 'e2e_manutencao@e2e.dissona.local'
on conflict (perfil_curador_id, tipo) do update
  set preco_claves = excluded.preco_claves, ativo = true;

update perfil set onboarding_visto_em = coalesce(onboarding_visto_em, now()),
                  ultimo_ambiente = coalesce(ultimo_ambiente, 'curador')
 where id in (select u.id from auth.users u where u.email = 'e2e_manutencao@e2e.dissona.local');

-- ------------------------------------------- os estados da autenticação

-- `e2e_bloqueada` é artista com a conta bloqueada: a guarda de rota a expulsa
-- para `/entrar?motivo=bloqueada` em qualquer caminho, e é o único jeito de ver
-- esse banner (RF-001). Bloquear uma persona já usada por outro cenário
-- quebraria todos eles de uma vez.
insert into papel_usuario (perfil_id, papel)
select u.id, 'artista'::papel from auth.users u
 where u.email = 'e2e_bloqueada@e2e.dissona.local'
on conflict (perfil_id, papel) do nothing;

insert into perfil_artista (perfil_id)
select u.id from auth.users u
 where u.email = 'e2e_bloqueada@e2e.dissona.local'
on conflict (perfil_id) do nothing;

update perfil set situacao = 'bloqueada'
 where id in (select u.id from auth.users u where u.email = 'e2e_bloqueada@e2e.dissona.local');

-- `e2e_dois_papeis` acumula artista e curador, com `ultimo_ambiente` gravado e
-- o onboarding já visto — é o estado que RF-008 descreve. O curador precisa
-- estar aprovado, senão a guarda o devolve ao wizard e o teste de troca de
-- papel nunca chega ao painel.
insert into papel_usuario (perfil_id, papel)
select u.id, t.papel::papel from auth.users u
 cross join (values ('artista'), ('curador')) as t(papel)
 where u.email = 'e2e_dois_papeis@e2e.dissona.local'
on conflict (perfil_id, papel) do nothing;

insert into perfil_artista (perfil_id)
select u.id from auth.users u
 where u.email = 'e2e_dois_papeis@e2e.dissona.local'
on conflict (perfil_id) do nothing;

insert into perfil_curador (perfil_id, passo_cadastro, situacao, classe, bio, cadastro_concluido_em, classificado_em)
select u.id, 8, 'bronze_aprovado'::situacao_curador, 'bronze'::classe_curador,
       'Conta de teste dos papeis acumulaveis.', now(), now()
  from auth.users u where u.email = 'e2e_dois_papeis@e2e.dissona.local'
on conflict (perfil_id) do update set
  passo_cadastro = 8, situacao = 'bronze_aprovado', classe = 'bronze',
  cadastro_concluido_em = now(), classificado_em = now();

update perfil set ultimo_ambiente = 'curador', onboarding_visto_em = coalesce(onboarding_visto_em, now())
 where id in (select u.id from auth.users u where u.email = 'e2e_dois_papeis@e2e.dissona.local');

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

-- ------------------------------------------- as faixas dos cenários

-- **Não ficam mais aqui.** Elas são criadas e **repostas** por
-- `scripts/repor-cenarios-e2e.mjs` (`pnpm e2e:semear`), por dois motivos:
--
--  * Sete cenários consomem a faixa deles — concluir e devolver são terminais.
--    A reposição é necessária **antes de cada execução** da suíte, e este
--    arquivo exige a senha das personas para rodar. Repor faixa não exige.
--  * Criar a faixa e confirmar a seleção pela RPC é ato do **artista**, e o SQL
--    só chegava lá forjando o JWT com `set_config('request.jwt.claims', …)`. O
--    script entra com a senha da persona e chama a mesma RPC que a tela chama —
--    é mais fiel, e não precisa de privilégio nenhum além do da própria conta.
--
-- Ordem numa máquina nova: este arquivo primeiro (contas, papéis, catálogo e a
-- carteira encenada), depois `pnpm e2e:semear`.


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
