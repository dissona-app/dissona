-- ============================================================================
-- 0003b · `criar_convite_admin` — a outra metade do convite  (R1)
--
-- A `0003` entregou o **aceite** (`aceitar_convite_admin`, o único caminho para
-- o papel `admin`) e deixou a emissão para a policy de `insert`. Funciona, mas
-- espalha o segredo: quem convida teria de gerar o token e calcular o
-- `sha256` no TypeScript, enquanto o aceite recalcula o hash em SQL com
-- `extensions.digest`. Duas implementações do mesmo hash, e a divergência entre
-- elas não falha em teste — falha em produção, como "convite inválido" para
-- todo mundo.
--
-- Com esta RPC o hash nasce e é conferido no mesmo arquivo, e o token em claro
-- existe uma única vez: no valor de retorno, que a Server Action põe no e-mail e
-- não persiste.
--
-- Validade: 7 dias, constante aqui e não em `configuracao`. É a mesma categoria
-- dos outros dois prazos de credencial do produto — token de senha de 60
-- minutos e link de verificação de 24 horas —, que vivem na configuração do
-- Auth e não na tabela de thresholds de negócio (architecture §5.3).
-- ============================================================================

create or replace function criar_convite_admin(
  p_email text,
  p_papel_admin papel_admin,
  p_validade_horas integer default 168
)
returns table (convite_id uuid, token text, expira_em timestamptz)
language plpgsql
security definer
set search_path = ''
as $funcao$
declare
  v_email extensions.citext;
  v_token text;
  v_expira timestamptz;
  v_id uuid;
begin
  -- Terceira camada de autorização (architecture §5.2): a policy de
  -- `convite_admin` já exige `tem_permissao('equipe', true)`, mas esta função é
  -- `security definer` e roda com a policy desligada. Sem a checagem explícita,
  -- qualquer conta autenticada emitiria convite de administrador.
  if not public.tem_permissao('equipe', true) then
    raise exception 'so quem gere equipe convida membros' using errcode = 'DS020';
  end if;

  v_email := btrim(p_email)::extensions.citext;

  if v_email = '' or position('@' in v_email::text) = 0 then
    raise exception 'e-mail de convite invalido' using errcode = 'DS021';
  end if;

  if p_validade_horas <= 0 then
    raise exception 'validade do convite tem de ser positiva' using errcode = 'DS021';
  end if;

  -- 32 bytes de aleatoriedade criptográfica em hex. O índice único parcial
  -- `convite_admin_um_pendente_por_email` só admite um pendente por endereço,
  -- então "Reenviar convite" (27.2) é substituir o pendente — e substituir
  -- **rotaciona** o token, que é o comportamento certo: o link antigo pode ter
  -- ido para a caixa errada.
  delete from public.convite_admin c
   where c.email = v_email
     and c.aceito_em is null;

  v_token := pg_catalog.encode(extensions.gen_random_bytes(32), 'hex');
  v_expira := now() + pg_catalog.make_interval(hours => p_validade_horas);

  insert into public.convite_admin (email, papel_admin, token_hash, expira_em, convidado_por)
  values (
    v_email,
    p_papel_admin,
    pg_catalog.encode(extensions.digest(v_token, 'sha256'), 'hex'),
    v_expira,
    auth.uid()
  )
  returning id into v_id;

  return query select v_id, v_token, v_expira;
end;
$funcao$;

comment on function criar_convite_admin(text, papel_admin, integer) is
  'Emite convite da equipe (27.3). Devolve o token em claro uma unica vez; o banco guarda so o sha256. Reenviar rotaciona o token.';

revoke execute on function criar_convite_admin(text, papel_admin, integer)
  from public, anon;
grant execute on function criar_convite_admin(text, papel_admin, integer) to authenticated;
