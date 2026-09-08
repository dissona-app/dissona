-- ============================================================================
-- 0006b · Quebra a recursão mútua entre as policies de `faixa` e `envio`
--
-- A `0006` criou duas policies que se chamam:
--
--   faixa  SELECT ... or exists (select 1 from envio e where e.faixa_id = faixa.id ...)
--   envio  SELECT ... or exists (select 1 from faixa f where f.id = envio.faixa_id ...)
--
-- RLS **também se aplica às tabelas referenciadas de dentro de uma policy**.
-- Ler `faixa` avalia a policy de `faixa`, que consulta `envio`, que avalia a
-- policy de `envio`, que consulta `faixa`... e o Postgres aborta com
-- `42P17 infinite recursion detected in policy`. O `select` mais simples do
-- fluxo da R2 — a fila do curador — falhava.
--
-- A saída é a mesma que já resolveu a recursão de `tem_permissao` na `0003`:
-- mover o lado cruzado da condição para uma função `security definer`, que
-- roda como o dono e portanto **não** dispara a RLS da tabela que consulta.
-- Cada policy passa a ser uma condição local mais uma chamada de função.
--
-- Vale como regra geral para o resto do projeto: policy que precisa de outra
-- tabela protegida por RLS chama função `security definer`, nunca `exists`
-- direto.
-- ============================================================================

-- --------------------------------------------------------- helpers de acesso

-- O curador tem envio ativo nesta faixa? Consulta `envio` sem passar pela RLS
-- de `envio`, que é o que rompe o ciclo.
create or replace function curador_tem_envio_ativo_na_faixa(p_faixa_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $funcao$
  select exists (
    select 1
      from public.envio e
      join public.perfil_curador pc on pc.id = e.perfil_curador_id
     where e.faixa_id = p_faixa_id
       and pc.perfil_id = auth.uid()
       and e.situacao in ('recebeu', 'ouviu', 'avaliando')
  );
$funcao$;

comment on function curador_tem_envio_ativo_na_faixa(uuid) is
  'Para a policy de faixa. security definer para nao disparar a RLS de envio (recursao 42P17).';

-- A faixa é do artista da sessão? Consulta `faixa` sem passar pela RLS de
-- `faixa`, o outro lado do ciclo.
create or replace function sou_dono_da_faixa(p_faixa_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $funcao$
  select exists (
    select 1
      from public.faixa f
      join public.perfil_artista pa on pa.id = f.perfil_artista_id
     where f.id = p_faixa_id
       and pa.perfil_id = auth.uid()
  );
$funcao$;

comment on function sou_dono_da_faixa(uuid) is
  'Para a policy de envio. security definer para nao disparar a RLS de faixa.';

-- Quem pode ver este envio: o curador dono, o artista dono da faixa, ou o
-- admin. Concentra a regra num lugar, e é o que `servico_envio` consulta em
-- vez de repetir o `exists` aninhado.
create or replace function posso_ver_envio(p_envio_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $funcao$
  select exists (
    select 1
      from public.envio e
      join public.perfil_curador pc on pc.id = e.perfil_curador_id
     where e.id = p_envio_id
       and pc.perfil_id = auth.uid()
  )
  or exists (
    select 1
      from public.envio e
      join public.faixa f on f.id = e.faixa_id
      join public.perfil_artista pa on pa.id = f.perfil_artista_id
     where e.id = p_envio_id
       and pa.perfil_id = auth.uid()
  )
  or public.e_admin();
$funcao$;

comment on function posso_ver_envio(uuid) is
  'Regra de visibilidade do envio, num lugar so. Consumida por servico_envio.';

-- O curador tem envio ativo para o objeto deste caminho? É a versão da
-- pergunta que a policy do bucket `faixas` faz, e existe para que aquela policy
-- não dependa da RLS de `envio` nem de `faixa`.
create or replace function curador_tem_envio_ativo_no_caminho(p_caminho text)
returns boolean
language sql
security definer
stable
set search_path = ''
as $funcao$
  select exists (
    select 1
      from public.envio e
      join public.faixa f on f.id = e.faixa_id
      join public.perfil_curador pc on pc.id = e.perfil_curador_id
     where f.arquivo_caminho = p_caminho
       and pc.perfil_id = auth.uid()
       and e.situacao in ('recebeu', 'ouviu', 'avaliando')
  );
$funcao$;

comment on function curador_tem_envio_ativo_no_caminho(text) is
  'Para a policy do bucket faixas. A comparacao com arquivo_caminho e por igualdade exata, prefixo <uid>/ incluido.';

revoke execute on function curador_tem_envio_ativo_na_faixa(uuid) from public, anon;
revoke execute on function sou_dono_da_faixa(uuid) from public, anon;
revoke execute on function posso_ver_envio(uuid) from public, anon;
revoke execute on function curador_tem_envio_ativo_no_caminho(text) from public, anon;
grant execute on function curador_tem_envio_ativo_na_faixa(uuid) to authenticated;
grant execute on function sou_dono_da_faixa(uuid) to authenticated;
grant execute on function posso_ver_envio(uuid) to authenticated;
grant execute on function curador_tem_envio_ativo_no_caminho(text) to authenticated;

-- --------------------------------------------------- policies reconstruídas

drop policy "faixa: dono le, e o curador com envio ativo tambem" on faixa;

create policy "faixa: dono le, e o curador com envio ativo tambem"
  on faixa for select
  to authenticated
  using (
    perfil_artista_id = meu_perfil_artista_id()
    or e_admin()
    or curador_tem_envio_ativo_na_faixa(id)
  );

drop policy "envio: curador dono, artista dono da faixa e admin leem" on envio;

create policy "envio: curador dono, artista dono da faixa e admin leem"
  on envio for select
  to authenticated
  using (
    perfil_curador_id = meu_perfil_curador_id()
    or e_admin()
    or sou_dono_da_faixa(faixa_id)
  );

drop policy "servico_envio: quem le o envio le os servicos" on servico_envio;

create policy "servico_envio: quem le o envio le os servicos"
  on servico_envio for select
  to authenticated
  using (posso_ver_envio(envio_id));

drop policy "faixas: curador com envio ativo le" on storage.objects;

create policy "faixas: curador com envio ativo le"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'faixas'
    and curador_tem_envio_ativo_no_caminho(storage.objects.name)
  );
