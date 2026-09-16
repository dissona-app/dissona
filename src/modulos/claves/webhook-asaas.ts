/**
 * Leitura do webhook do Asaas — **puro**, sem I/O, para ser testado.
 *
 * Quem orquestra (token, idempotência, confirmação) é o route handler em
 * `src/app/api/webhooks/asaas/route.ts`. Aqui mora só a tradução da carga para
 * o domínio, que é onde os enganos caros acontecem:
 *
 *  - **O id do evento é o `id` do topo** (`evt_…`), e não `payment.id`. Um
 *    pagamento gera vários eventos (criado, confirmado, recebido); usar o id
 *    do pagamento faria o segundo ser descartado como duplicata, e a Clave
 *    nunca seria creditada.
 *  - **O pedido vem de `externalReference`**, que é onde a cobrança leva o
 *    `pedido_clave.id`. Sem ele, o evento não é nosso e é ignorado.
 */

import { timingSafeEqual } from 'node:crypto';

import { z } from 'zod';

/** O que fazer com o evento. `ignorar` ainda responde 2xx ao Asaas. */
export type Desfecho = 'aprovado' | 'recusado' | 'ignorar';

export type EventoAsaas = {
  readonly idEvento: string;
  readonly tipo: string;
  readonly pedidoId: string | null;
  readonly cobrancaId: string | null;
  readonly desfecho: Desfecho;
};

/**
 * Pix confirma com `PAYMENT_RECEIVED`; cartão, com `PAYMENT_CONFIRMED`. Os
 * dois creditam — `confirmar_pedido_clave` é idempotente, então receber os
 * dois para o mesmo pedido credita uma vez só.
 */
const APROVAM: ReadonlySet<string> = new Set(['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED']);

/**
 * Cobrança que não vai mais ser paga. `PAYMENT_OVERDUE` é o Pix que venceu.
 * `recusar_pedido_clave` não mexe em pedido já aprovado.
 */
const RECUSAM: ReadonlySet<string> = new Set([
  'PAYMENT_OVERDUE',
  'PAYMENT_DELETED',
  'PAYMENT_REPROVED_BY_RISK_ANALYSIS',
  'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED',
]);

const esquemaCarga = z.object({
  id: z.string().min(1),
  event: z.string().min(1),
  payment: z
    .object({
      id: z.string().min(1).optional(),
      externalReference: z.string().nullish(),
    })
    .optional(),
});

/** `null` quando a carga não é um evento do Asaas — o handler responde 400. */
export function lerEventoAsaas(carga: unknown): EventoAsaas | null {
  const analise = esquemaCarga.safeParse(carga);
  if (!analise.success) return null;

  const { id, event, payment } = analise.data;
  const referencia = payment?.externalReference ?? null;
  const pedidoId =
    referencia !== null && z.uuid().safeParse(referencia).success ? referencia : null;

  const desfecho: Desfecho =
    pedidoId === null
      ? 'ignorar'
      : APROVAM.has(event)
        ? 'aprovado'
        : RECUSAM.has(event)
          ? 'recusado'
          : 'ignorar';

  return { idEvento: id, tipo: event, pedidoId, cobrancaId: payment?.id ?? null, desfecho };
}

/**
 * Compara o header `asaas-access-token` com o token configurado, em tempo
 * constante. Token esperado vazio **nunca** confere: um deploy sem a variável
 * não pode aceitar qualquer POST como pagamento confirmado.
 */
export function tokenConfere(recebido: string | null, esperado: string | undefined): boolean {
  if (recebido === null || esperado === undefined || esperado.trim() === '') return false;
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}
