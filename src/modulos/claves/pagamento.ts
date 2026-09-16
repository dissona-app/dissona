import 'server-only';

/**
 * A porta do provedor de pagamento, e as duas implementações: o **simulador**
 * do protótipo e o **Asaas**.
 *
 * ## Qual está em vigor
 *
 * `PAGAMENTO_SIMULADO=false` liga o Asaas; qualquer outro valor (inclusive a
 * ausência) mantém o simulador, que é o que o protótipo da R2 desenha — o
 * seletor "Simular resultado" e a nota de que nada é cobrado. Sem simulador e
 * sem `ASAAS_API_KEY`, a compra **falha**: creditar Clave de graça porque a
 * configuração está pela metade é o pior desfecho possível.
 *
 * ## Os três desfechos
 *
 *  - `aprovado` — cartão autorizado (ou simulação aprovada). A ação credita na
 *    hora, pelo mesmo caminho idempotente do webhook.
 *  - `recusado` — o emissor negou. Nada é cobrado.
 *  - `pendente` — Pix gerado. Quem credita é o webhook, quando o Pix cair.
 *
 * O split com curadores ([#6](../../../docs/open-questions.md)) continua fora:
 * a cobrança cai inteira na conta da Dissona.
 */

import { randomUUID } from 'node:crypto';

import { pagamentoSimulado } from '@/lib/ambiente';
import { CodigoErro, falhar } from '@/lib/erros';

import {
  buscarClientePorCpf,
  criarCliente,
  criarCobrancaCartao,
  criarCobrancaPix,
  ehRecusaDoCartao,
  lerQrCodePix,
} from './asaas';
import type { MeioPagamento, ResultadoSimulado } from './tipos';

export const PROVEDOR_SIMULADO = 'simulado';
export const PROVEDOR_ASAAS = 'asaas';

export type Comprador = {
  readonly perfilId: string;
  readonly nome: string;
  readonly email: string;
  readonly cpf: string;
};

export type Cartao = {
  readonly titular: string;
  readonly numero: string;
  readonly mes: string;
  readonly ano: string;
  readonly cvv: string;
  readonly telefone: string;
  readonly cep: string;
};

export type Cobranca = {
  readonly pedidoId: string;
  readonly meio: MeioPagamento;
  readonly valorCentavos: bigint;
  readonly descricao: string;
  readonly comprador: Comprador;
  /** Só no meio `cartao`. */
  readonly cartao?: Cartao | undefined;
  readonly ipRemoto: string | null;
  /** Só o simulador lê. */
  readonly desfechoDesejado?: ResultadoSimulado | undefined;
};

export type RespostaDoProvedor =
  | {
      readonly desfecho: 'aprovado' | 'recusado';
      readonly provedor: string;
      /**
       * A chave de `evento_provedor`. O simulador gera um UUID; o Asaas usa o
       * id da cobrança — o webhook da mesma cobrança chega com outro id
       * (`evt_…`) e cai em `confirmar_pedido_clave`, que não credita duas vezes.
       */
      readonly idEvento: string;
      readonly tipo: string;
      readonly cobrancaId: string | null;
    }
  | {
      readonly desfecho: 'pendente';
      readonly provedor: string;
      readonly cobrancaId: string;
      readonly pixPayload: string;
      readonly pixQr: string;
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
    const aprovado = cobranca.desfechoDesejado !== 'recusado';
    return Promise.resolve({
      desfecho: aprovado ? 'aprovado' : 'recusado',
      provedor: PROVEDOR_SIMULADO,
      idEvento: `${PROVEDOR_SIMULADO}:${randomUUID()}`,
      tipo: aprovado ? 'PAYMENT_CONFIRMED' : 'PAYMENT_REFUSED',
      cobrancaId: null,
    });
  },
};

/** Hoje em `YYYY-MM-DD`, no fuso do Brasil — é o que o Asaas compara. */
function hojeNoBrasil(diasAFrente = 0): string {
  const data = new Date(Date.now() + diasAFrente * 86_400_000);
  return data.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

const asaas: ProvedorDePagamento = {
  nome: PROVEDOR_ASAAS,
  simulado: false,

  async cobrar(cobranca) {
    const { comprador } = cobranca;
    const cliente =
      (await buscarClientePorCpf(comprador.cpf)) ??
      (await criarCliente({
        nome: comprador.nome,
        cpfCnpj: comprador.cpf,
        email: comprador.email,
        referencia: comprador.perfilId,
      }));

    if (cobranca.meio === 'pix') {
      const pix = await criarCobrancaPix({
        clienteId: cliente.id,
        valorCentavos: cobranca.valorCentavos,
        pedidoId: cobranca.pedidoId,
        descricao: cobranca.descricao,
        vencimento: hojeNoBrasil(1),
      });
      const qr = await lerQrCodePix(pix.id);
      return {
        desfecho: 'pendente',
        provedor: PROVEDOR_ASAAS,
        cobrancaId: pix.id,
        pixPayload: qr.payload,
        pixQr: qr.encodedImage,
      };
    }

    const cartao = cobranca.cartao;
    if (cartao === undefined) falhar(CodigoErro.ENTRADA_INVALIDA, { motivo: 'cartao_ausente' });

    try {
      const cobrado = await criarCobrancaCartao({
        clienteId: cliente.id,
        valorCentavos: cobranca.valorCentavos,
        pedidoId: cobranca.pedidoId,
        descricao: cobranca.descricao,
        vencimento: hojeNoBrasil(),
        cartao,
        titular: {
          nome: cartao.titular,
          email: comprador.email,
          cpf: comprador.cpf,
          cep: cartao.cep,
          telefone: cartao.telefone,
        },
        ipRemoto: cobranca.ipRemoto,
      });
      const aprovado = cobrado.status === 'CONFIRMED' || cobrado.status === 'RECEIVED';
      return {
        desfecho: aprovado ? 'aprovado' : 'recusado',
        provedor: PROVEDOR_ASAAS,
        idEvento: `${PROVEDOR_ASAAS}:cobranca:${cobrado.id}`,
        tipo: aprovado ? 'PAYMENT_CONFIRMED' : `PAYMENT_${cobrado.status}`,
        cobrancaId: cobrado.id,
      };
    } catch (erro) {
      if (!ehRecusaDoCartao(erro)) throw erro;
      return {
        desfecho: 'recusado',
        provedor: PROVEDOR_ASAAS,
        idEvento: `${PROVEDOR_ASAAS}:recusa:${randomUUID()}`,
        tipo: 'PAYMENT_CREDIT_CARD_REFUSED',
        cobrancaId: null,
      };
    }
  },
};

/** O provedor em vigor. Ver o cabeçalho. */
export function provedorEmVigor(): ProvedorDePagamento {
  if (pagamentoSimulado()) return simulador;
  const chave = process.env.ASAAS_API_KEY;
  if (chave === undefined || chave.trim() === '') {
    falhar(CodigoErro.PAGAMENTO_INDISPONIVEL, { motivo: 'provedor_nao_configurado' });
  }
  return asaas;
}

/** A tela pergunta isto para decidir se mostra o seletor de simulação. */
export function checkoutSimulado(): boolean {
  return pagamentoSimulado();
}
