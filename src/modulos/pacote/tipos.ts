/**
 * Pacotes de Claves — tipos de domínio (módulo 21 e 21.1).
 *
 * O banco guarda `quantidade_claves numeric(10,2)` e `valor_centavos bigint`.
 * Aqui os dois viram inteiros: `Claves` em centésimos e `Centavos` em
 * centavos, ambos `bigint`. Nada de `number` no caminho do dinheiro
 * (architecture.md §1.1).
 *
 * **Preço por Clave e desconto são derivados**, nunca campos. O banco tem
 * `desconto_percentual` como coluna porque a tela 21.1 permite digitar o
 * desconto e ver o valor recalculado — mas a fonte é `valor_centavos`, e é
 * dela que a lista deriva o que exibe. Duas fontes para o mesmo número é como
 * a tela do admin e a Carteira do artista passam a discordar.
 */

import type { Claves } from '@/lib/claves';
import type { Centavos } from '@/lib/dinheiro';

export type Pacote = {
  readonly id: string;
  readonly nome: string;
  readonly quantidade: Claves;
  readonly valor: Centavos;
  /** Como está gravado. A lista exibe o **derivado** de `valor`. */
  readonly descontoPercentual: number;
  readonly ativo: boolean;
  /**
   * Exclusão lógica (migration `0007b`). Distinta de `ativo === false`:
   * desativado sai da Carteira e continua na lista do admin; excluído sai das
   * duas. Sempre `null` no que a lista devolve — ela filtra.
   */
  readonly excluidoEm: Date | null;
  readonly criadoEm: Date;
  readonly atualizadoEm: Date;
};

/** O que a tela 21 mostra por linha: o gravado mais o derivado. */
export type PacoteNaLista = Pacote & {
  /** `valor / quantidade`, arredondado. */
  readonly precoPorClave: Centavos;
  /** `(1 - valor / base) × 100`, derivado de `valor` e não da coluna. */
  readonly descontoDerivado: number;
  /** `base - valor`, nunca negativo. */
  readonly economia: Centavos;
};

/** Entrada da tela 21.1, já validada. */
export type DadosDePacote = {
  readonly nome: string;
  readonly quantidade: Claves;
  readonly valor: Centavos;
  readonly ativo: boolean;
};
