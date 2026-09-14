import 'server-only';

/**
 * A porta do provedor de pagamento, e a única implementação que existe hoje.
 *
 * ## Por que existe uma porta, se só há um provedor
 *
 * Porque o provedor real está **bloqueado por decisão de terceiro**: o modelo
 * de repasse do Asaas — transferência, subcontas ou split diferido — depende
 * do contador do cliente ([#6](../../../docs/open-questions.md)), e enquanto
 * ele não sai não há conta, chave nem webhook. Sem a porta, as telas 5.1 e 5.2
 * ficariam esperando por uma decisão fiscal, e é exatamente o que já
 * aconteceu: a Carteira passou a release inteira com o botão "Comprar Claves"
 * desabilitado.
 *
 * Com a porta, o que falta é **um arquivo** — `asaas.ts`, implementando
 * `ProvedorDePagamento` —, e nenhuma tela, ação ou RPC muda.
 *
 * ## O que o simulador é, e o que ele não é
 *
 * Ele é o que o protótipo da R2 desenha: a tela tem o controle "Simular
 * resultado · Aprovado / Recusado", e a nota "Pagamento simulado. Nenhuma
 * cobrança é feita". Não é um mock de teste que vazou para o código de
 * produção — é a especificação da release, e some com `PAGAMENTO_SIMULADO=false`.
 *
 * Ele **não** cobra, não fala com banco nenhum e não tem estado. O que ele
 * devolve é o desfecho que a pessoa escolheu na tela, com um id de evento
 * único — e é esse id que faz o crédito passar pelo mesmo caminho idempotente
 * do webhook real, em vez de por um atalho que só existiria na simulação.
 */

import { randomUUID } from 'node:crypto';

import { pagamentoSimulado } from '@/lib/ambiente';
import { CodigoErro, falhar } from '@/lib/erros';

import type { MeioPagamento, ResultadoSimulado } from './tipos';

/** O nome que vai para `evento_provedor.provedor` e `pedido_clave.provedor`. */
export const PROVEDOR_SIMULADO = 'simulado';

export type Cobranca = {
  readonly pedidoId: string;
  readonly meio: MeioPagamento;
  /** Só o simulador lê: com provedor real quem decide é o banco. */
  readonly desfechoDesejado?: ResultadoSimulado | undefined;
};

/**
 * O que o provedor devolve.
 *
 * `idEvento` é o que torna a confirmação idempotente: é a chave primária de
 * `evento_provedor`, e é por ela que uma segunda entrega do mesmo desfecho não
 * credita duas vezes. O provedor real o tira da carga do webhook; o simulado
 * gera um UUID, porque duas compras do mesmo pacote no mesmo segundo são
 * eventos diferentes e precisam de ids diferentes.
 */
export type RespostaDoProvedor = {
  readonly provedor: string;
  readonly idEvento: string;
  readonly tipo: string;
  readonly aprovado: boolean;
};

export type ProvedorDePagamento = {
  readonly nome: string;
  /** `true` quando a tela deve mostrar a nota de simulação e o seletor. */
  readonly simulado: boolean;
  cobrar(cobranca: Cobranca): Promise<RespostaDoProvedor>;
};

const simulador: ProvedorDePagamento = {
  nome: PROVEDOR_SIMULADO,
  simulado: true,

  cobrar(cobranca) {
    // Sem `await`: não há I/O nenhuma aqui, e fingir latência com um `setTimeout`
    // só tornaria a suíte lenta. O estado "Processando" da tela é do React, e
    // existe porque a Server Action leva tempo de verdade — ela fala com o
    // banco duas vezes.
    const aprovado = cobranca.desfechoDesejado !== 'recusado';

    return Promise.resolve({
      provedor: PROVEDOR_SIMULADO,
      idEvento: `${PROVEDOR_SIMULADO}:${randomUUID()}`,
      tipo: aprovado ? 'PAYMENT_CONFIRMED' : 'PAYMENT_REFUSED',
      aprovado,
    });
  },
};

/**
 * O provedor em vigor.
 *
 * Com `PAGAMENTO_SIMULADO=false` e nenhum provedor real implementado, isto
 * **falha** em vez de cair no simulador — creditar Clave de graça porque a
 * configuração está pela metade é o pior desfecho possível dos três.
 */
export function provedorEmVigor(): ProvedorDePagamento {
  if (!pagamentoSimulado()) {
    falhar(CodigoErro.PAGAMENTO_INDISPONIVEL, { motivo: 'provedor_nao_configurado' });
  }
  return simulador;
}

/** A tela pergunta isto para decidir se mostra o seletor de simulação. */
export function checkoutSimulado(): boolean {
  return pagamentoSimulado();
}
