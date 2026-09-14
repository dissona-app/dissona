import type { Claves } from '@/lib/claves';
import type { Database } from '@/lib/supabase/tipos-bd';

/**
 * Carteira e extrato de Claves — módulo 5.
 *
 * O saldo é **derivado** do ledger (`lancamento_clave`), que é append-only.
 * Nada aqui guarda saldo: o que existe são somas.
 */

export type TipoLancamento = Database['public']['Enums']['tipo_lancamento_clave'];

/** Uma linha do extrato. `quantidade` tem sinal — consumo é negativo. */
export type Movimentacao = {
  readonly id: number;
  readonly data: Date;
  /** `lancamento_clave.descricao` — é a coluna "Origem" da tela 5.3. */
  readonly origem: string;
  readonly tipo: TipoLancamento;
  readonly quantidade: Claves;
};

/**
 * A carteira como a tela 5 a mostra.
 *
 * ⚠️ `disponivel` **já exclui** o comprometido: o consumo é debitado na
 * confirmação da seleção, então ele já saiu da soma do ledger. `comprometido`
 * é recorte de exibição — nunca subtraia um do outro. O comentário da própria
 * view diz isso, e é o tipo de engano que só aparece quando o saldo do cliente
 * está errado.
 */
export type Carteira = {
  readonly disponivel: Claves;
  readonly comprometido: Claves;
  readonly devolvido: Claves;
  /** Somadas do ledger, para os três cards de resumo do protótipo. */
  readonly adquiridas: Claves;
  readonly usadas: Claves;
};

/** Uma linha do extrato com o saldo acumulado até ela. */
export type LinhaDoExtrato = Movimentacao & {
  readonly saldo: Claves;
};

/** Os filtros da tela 5.3. `todas` é o estado inicial. */
export const FILTROS_DO_EXTRATO = ['todas', 'adquiridas', 'usadas', 'devolvidas'] as const;

export type FiltroDoExtrato = (typeof FILTROS_DO_EXTRATO)[number];

export function ehFiltroDoExtrato(valor: string | undefined): valor is FiltroDoExtrato {
  return (FILTROS_DO_EXTRATO as readonly string[]).includes(valor ?? '');
}
