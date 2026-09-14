import 'server-only';

/** Leituras da Carteira (5) e do Extrato (5.3) para Server Components. */

import type { Centavos } from '@/lib/dinheiro';
import { lerConfiguracao } from '@/lib/configuracao';

import { lerMovimentacoes, lerSaldo } from './repositorio';
import { adquiridas, comSaldoAcumulado, ultimas, usadas } from './servico';
import type { Carteira, FiltroDoExtrato, LinhaDoExtrato, Movimentacao } from './tipos';

export type { Carteira, LinhaDoExtrato, Movimentacao } from './tipos';

/** Quantas linhas o bloco "Últimas movimentações" da tela 5 mostra. */
const ULTIMAS_NA_CARTEIRA = 3;

export type TelaDaCarteira = {
  readonly carteira: Carteira;
  readonly ultimas: readonly Movimentacao[];
  /** `configuracao.clave_valor_centavos` — o "Uma Clave equivale a R$ 10". */
  readonly valorDaClave: Centavos;
};

/**
 * Tudo que a tela 5 precisa, numa ida só.
 *
 * `disponivel` e `comprometido` vêm da view, porque `comprometido` depende de
 * `envio` e não é derivável do ledger. O resto vem do ledger, somado no
 * serviço.
 */
export async function lerCarteira(): Promise<TelaDaCarteira | null> {
  const [saldo, movimentacoes, valorDaClave] = await Promise.all([
    lerSaldo(),
    lerMovimentacoes(),
    lerConfiguracao('clave_valor_centavos'),
  ]);

  if (saldo === null) return null;

  return {
    carteira: {
      disponivel: saldo.disponivel,
      comprometido: saldo.comprometido,
      devolvido: saldo.devolvido,
      adquiridas: adquiridas(movimentacoes),
      usadas: usadas(movimentacoes),
    },
    ultimas: ultimas(movimentacoes, ULTIMAS_NA_CARTEIRA),
    valorDaClave,
  };
}

export type TelaDoExtrato = {
  readonly linhas: readonly LinhaDoExtrato[];
  readonly filtro: FiltroDoExtrato;
  /** Há lançamentos, mas nenhum neste filtro — o estado vazio **por recorte**. */
  readonly vazioPorFiltro: boolean;
};

export async function lerExtrato(filtro: FiltroDoExtrato): Promise<TelaDoExtrato> {
  const movimentacoes = await lerMovimentacoes();
  const linhas = comSaldoAcumulado(movimentacoes, filtro);

  return {
    linhas,
    filtro,
    vazioPorFiltro: linhas.length === 0 && movimentacoes.length > 0,
  };
}
