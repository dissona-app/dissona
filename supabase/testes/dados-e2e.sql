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
      ('e2e_artista@e2e.dissona.local', 'E2E Artista')
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

-- ----------------------------------------------------------------- conferência

select
  (select count(*) from auth.users where email like 'e2e_%@e2e.dissona.local') as contas,
  (select count(*) from membro_admin ma
     join auth.users u on u.id = ma.perfil_id
    where u.email like 'e2e_%@e2e.dissona.local') as membros_admin,
  (select count(*) from pacote_clave where excluido_em is null) as pacotes_vivos,
  (select count(*) from pacote_clave where ativo and excluido_em is null) as pacotes_ativos;

-- ============================================================================
-- Varredura do que a suíte cria durante a execução:
--
--   update pacote_clave set ativo = false, excluido_em = now()
--    where nome like 'e2e\_%' and excluido_em is null;
--
-- `update`, e não `delete`: `pedido_clave` referencia o pacote, e a exclusão é
-- lógica desde a 0007b.
-- ============================================================================
