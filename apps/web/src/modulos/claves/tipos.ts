import type { Claves } from '@dissona/nucleo/lib/claves';
import type { Centavos } from '@dissona/nucleo/lib/dinheiro';
import type { Database } from '@dissona/nucleo/lib/supabase/tipos-bd';

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

// ---------------------------------------------------------------------------
// Compra de Claves — pacotes (5.1) e checkout (5.2)
// ---------------------------------------------------------------------------

export type MeioPagamento = Database['public']['Enums']['meio_pagamento'];

export type SituacaoPedido = Database['public']['Enums']['situacao_pedido'];

/**
 * O resumo do pedido da tela 5.2, derivado do pacote.
 *
 * **Derivado, e nunca persistido antes do "Confirmar compra".** Quem congela
 * os valores é `criar_pedido_clave`, no banco, a partir da mesma linha de
 * `pacote_clave` — este resumo existe só para a pessoa ver o que vai pagar. Se
 * ele calculasse diferente da RPC, a tela mostraria um total e o pedido
 * gravaria outro, e o erro só apareceria na fatura.
 *
 * `bruto - desconto = total` é o mesmo invariante do check
 * `pedido_clave_desconto_fecha`.
 */
export type ResumoDoPedido = {
  readonly quantidade: Claves;
  readonly bruto: Centavos;
  readonly desconto: Centavos;
  readonly total: Centavos;
  readonly precoPorClave: Centavos;
  /** Derivado do valor, como na tela 21 — nunca a coluna `desconto_percentual`. */
  readonly descontoPercentual: number;
};

/**
 * O que o simulador do protótipo permite escolher: "Simular resultado ·
 * Aprovado / Recusado".
 *
 * Existe no **domínio**, e não só na tela, porque é o que a ação manda ao
 * provedor simulado. Quando o Asaas entrar, este tipo some junto com o
 * simulador — quem decide passa a ser o banco.
 */
export const RESULTADOS_SIMULADOS = ['aprovado', 'recusado'] as const;

export type ResultadoSimulado = (typeof RESULTADOS_SIMULADOS)[number];

/** O desfecho de uma compra, como a tela 5.2 o mostra. */
export type DesfechoDaCompra =
  | {
      readonly situacao: 'aprovado';
      readonly pedidoId: string;
      /** Claves creditadas, já formatadas — `bigint` não atravessa Server→Client. */
      readonly claves: string;
      /** O saldo depois do crédito, para o "Novo saldo: … Claves". */
      readonly saldo: string;
    }
  | {
      /**
       * Pix gerado e ainda não pago. O crédito vem do webhook do Asaas; a tela
       * mostra o QR code e acompanha o pedido até ele sair deste estado.
       */
      readonly situacao: 'aguardando_pix';
      readonly pedidoId: string;
      /** O "copia e cola". */
      readonly pixPayload: string;
      /** PNG em base64, sem o prefixo `data:`. */
      readonly pixQr: string;
    };

/** O que a tela do Pix recebe ao consultar o pedido de novo. */
export type AcompanhamentoDoPix =
  | { readonly situacao: 'aguardando' }
  | { readonly situacao: 'recusado' }
  | { readonly situacao: 'aprovado'; readonly claves: string; readonly saldo: string };
