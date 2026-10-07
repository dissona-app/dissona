-- ============================================================================
-- 0001e · `encerrar_sessoes_da_conta` — encerrar várias sessões de uma vez
--
-- O painel "Sessões ativas" (7.4 / 17.4) passou a agrupar as sessões do mesmo
-- dispositivo e IP numa linha só. O "Encerrar" dessa linha encerra o grupo, e
-- um grupo pode ter dezenas de sessões: uma chamada de
-- `encerrar_sessao_da_conta` por sessão faria a pessoa esperar segundos.
--
-- Mesmas duas guardas da função individual da `0001d`, aplicadas ao lote:
--   - só sessões da própria conta (`user_id = auth.uid()`) — id alheio no
--     array não é erro, só não é apagado;
--   - a sessão atual nunca, mesmo que venha no array: sair deste dispositivo é
--     o "Sair".
--
-- Devolve quantas foram encerradas; zero não é erro (todas já tinham expirado).
-- ============================================================================

create or replace function encerrar_sessoes_da_conta(p_sessoes uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $funcao$
declare
  v_atual text := auth.jwt() ->> 'session_id';
  v_encerradas integer;
begin
  if auth.uid() is null then
    raise exception 'e preciso estar autenticado' using errcode = 'DS020';
  end if;

  delete from auth.sessions s
   where s.id = any (p_sessoes)
     and s.user_id = auth.uid()
     and s.id::text is distinct from v_atual;

  get diagnostics v_encerradas = row_count;
  return v_encerradas;
end;
$funcao$;

comment on function encerrar_sessoes_da_conta(uuid[]) is
  'Encerra um lote de sessoes da propria conta (7.4 / 17.4), nunca a atual.';

revoke execute on function encerrar_sessoes_da_conta(uuid[]) from public, anon;
grant execute on function encerrar_sessoes_da_conta(uuid[]) to authenticated;
