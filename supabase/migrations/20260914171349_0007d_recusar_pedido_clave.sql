-- ============================================================================
-- 0007d · Recusa do pedido de Claves  (R2 · tela 5.2)
--
-- A `0007` deu ao pedido o caminho feliz — `criar_pedido_clave` e
-- `confirmar_pedido_clave` — e deixou a recusa sem função nenhuma. O enum
-- `situacao_pedido` já previa `recusado` desde a `0001`, então o estado
-- existia sem ninguém que pudesse escrevê-lo: `pedido_clave` **não tem policy
-- de update**, de propósito, porque deixar o artista escrever situação
-- permitiria cunhar um pedido já aprovado.
--
-- Sem esta função, um pagamento recusado deixaria o pedido em `criado` para
-- sempre — dentro de `pedido_clave_pendentes_idx`, que é o índice da fila de
-- conciliação. A conciliação passaria a ter, misturados, os pedidos que ainda
-- vão pagar e os que o banco já negou.
--
-- Mesmo contrato de `confirmar_pedido_clave`: `security definer`, revogada até
-- de `authenticated`, e chamada pelo webhook com a service role. No fluxo
-- simulado da R2 quem chama é `modulos/claves/acoes.ts`, pelo **mesmo**
-- caminho de serviço que o webhook do Asaas vai usar.
--
-- Idempotente e **não** destrutiva: só recusa o que ainda não foi aprovado. Um
-- `recusado` chegando depois de um `aprovado` — reentrega fora de ordem do
-- provedor, que acontece — não desfaz o crédito. Estorno é outra coisa, tem
-- outro estado (`estornado`) e exige lançamento no ledger.
-- ============================================================================

create or replace function recusar_pedido_clave(p_pedido_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $funcao$
declare
  v_situacao public.situacao_pedido;
begin
  select p.situacao into v_situacao
    from public.pedido_clave p where p.id = p_pedido_id for update;

  if not found then
    raise exception 'pedido inexistente' using errcode = 'DS024';
  end if;

  -- Aprovado não regride: o ledger já tem a linha de compra, e `recusar` não
  -- credita nem debita nada. Devolve false para o chamador saber que a
  -- transição não aconteceu, sem estourar — reentrega repetida é normal.
  if v_situacao in ('aprovado', 'estornado') then
    return false;
  end if;

  update public.pedido_clave
     set situacao = 'recusado'
   where id = p_pedido_id and situacao not in ('aprovado', 'estornado');

  return true;
end;
$funcao$;

comment on function recusar_pedido_clave(uuid) is
  'Marca o pedido como recusado. Idempotente e nao destrutiva: pedido aprovado nao regride, e nada e lancado no ledger.';

revoke execute on function recusar_pedido_clave(uuid) from public, anon, authenticated;
