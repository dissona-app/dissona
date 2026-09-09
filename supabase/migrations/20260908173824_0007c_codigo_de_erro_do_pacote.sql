-- ============================================================================
-- 0007c · Código de erro da guarda de pacote  (corretiva da 0007b)
--
-- A `0007b` levantou `DS030` em `proibir_reviver_pacote()`. `DS030` já estava
-- tomado, e com outro sentido: é o código de **catálogo ou configuração
-- ausente** — `registrar_notificacao` o usa para "evento de notificação
-- desconhecido", `calcular_remuneracao` para "configuracao de remuneracao
-- incompleta", `criar_pedido_clave` para "configuracao clave_valor_centavos
-- ausente" e `expurgar_contas_excluidas` para "configuracao lgpd.dias_expurgo
-- ausente".
--
-- A colisão não aparece em teste nenhum do banco — o `sqlstate` que sobe é o
-- mesmo, e o teste da `0007b` afirma exatamente aquele código. Ela aparece uma
-- camada acima: `src/lib/supabase/erros.ts` traduz `SQLSTATE` para
-- `CodigoErro`, e um só mapa não pode devolver `CONFIGURACAO_AUSENTE` e
-- `PACOTE_EXCLUIDO` para a mesma entrada. O usuário veria "configuração
-- ausente" ao tentar reativar um pacote excluído.
--
-- `DS014` está livre e fica na faixa de regra de negócio, junto de `DS011`
-- (curador inválido), `DS012` (serviço de feedback) e `DS013` (situação da
-- faixa). Só o `raise` muda; o corpo é o da `0007b`.
-- ============================================================================

create or replace function proibir_reviver_pacote()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $funcao$
begin
  if old.excluido_em is not null and new.excluido_em is null then
    raise exception 'pacote excluido nao volta; crie um novo'
      using errcode = 'DS014';
  end if;
  return new;
end $funcao$;

comment on function proibir_reviver_pacote() is
  'Exclusao de pacote e irreversivel. Sem isto, um update que zere excluido_em traria de volta um pacote cujo preco ja saiu de circulacao. DS014, e nao DS030: DS030 e configuracao ausente (ver 0007c).';
