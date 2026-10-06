/**
 * Regra da seleção — **pura**, sem `server-only` e sem Supabase.
 */

import { deClavesInteiras, somar } from '@dissona/nucleo/lib/claves';
import type { Claves } from '@dissona/nucleo/lib/claves';

import { SERVICO_OBRIGATORIO } from './tipos';
import type { CuradorDisponivel, EscolhaDeCurador, TipoServico } from './tipos';

/**
 * Garante `feedback` na escolha, sem duplicar.
 *
 * A RPC faz o mesmo do lado de lá. Repetir aqui não é redundância inútil: é o
 * que faz o **total exibido** bater com o total cobrado. Sem isto, uma seleção
 * só de "playlist" mostraria 3 Claves na tela e debitaria 5.
 */
export function comServicoObrigatorio(servicos: readonly TipoServico[]): readonly TipoServico[] {
  return servicos.includes(SERVICO_OBRIGATORIO) ? servicos : [SERVICO_OBRIGATORIO, ...servicos];
}

/** O custo de um curador, dados os serviços escolhidos. */
export function custoDoCurador(
  curador: CuradorDisponivel,
  servicos: readonly TipoServico[],
): Claves {
  const escolhidos = comServicoObrigatorio(servicos);
  return somar(
    ...curador.servicos
      .filter((servico) => escolhidos.includes(servico.tipo))
      .map((servico) => servico.precoClaves),
  );
}

/** O total da seleção inteira. */
export function totalDaSelecao(
  curadores: readonly CuradorDisponivel[],
  escolhas: readonly EscolhaDeCurador[],
): Claves {
  return somar(
    ...escolhas.map((escolha) => {
      const curador = curadores.find((c) => c.perfilCuradorId === escolha.perfilCuradorId);
      return curador === undefined
        ? deClavesInteiras(0)
        : custoDoCurador(curador, escolha.servicos);
    }),
  );
}

/** Só curador que oferece `feedback` ativo pode receber envio (`DS012`). */
export function podeReceberEnvio(curador: CuradorDisponivel): boolean {
  return curador.servicos.some((servico) => servico.tipo === SERVICO_OBRIGATORIO);
}
