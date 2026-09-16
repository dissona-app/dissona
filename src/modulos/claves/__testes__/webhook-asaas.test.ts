import { describe, expect, it } from 'vitest';

import { lerEventoAsaas, tokenConfere } from '../webhook-asaas';

/**
 * Webhook do Asaas. A carga abaixo tem a forma da que o sandbox entregou ao
 * webhook.site em 2026-09-14 — com os ids trocados.
 */

const PEDIDO = '5b0a3c1e-8d2f-4a6b-9c7d-1e2f3a4b5c6d';

function carga(evento: string, referencia: string | null = PEDIDO) {
  return {
    id: 'evt_05b708f961d739ea7eba7e4db318f621&368604920',
    event: evento,
    dateCreated: '2026-09-14 10:00:00',
    payment: {
      object: 'payment',
      id: 'pay_080225913252',
      billingType: 'PIX',
      value: 50,
      status: 'RECEIVED',
      externalReference: referencia,
    },
  };
}

describe('lerEventoAsaas', () => {
  it('usa o id do topo como id do evento, e não o id do pagamento', () => {
    const evento = lerEventoAsaas(carga('PAYMENT_RECEIVED'));
    expect(evento?.idEvento).toMatch(/^evt_/);
    expect(evento?.cobrancaId).toBe('pay_080225913252');
  });

  it('Pix recebido e cartão confirmado aprovam', () => {
    expect(lerEventoAsaas(carga('PAYMENT_RECEIVED'))).toMatchObject({
      pedidoId: PEDIDO,
      desfecho: 'aprovado',
    });
    expect(lerEventoAsaas(carga('PAYMENT_CONFIRMED'))?.desfecho).toBe('aprovado');
  });

  it('vencido, apagado e recusado pelo cartão recusam', () => {
    for (const tipo of [
      'PAYMENT_OVERDUE',
      'PAYMENT_DELETED',
      'PAYMENT_REPROVED_BY_RISK_ANALYSIS',
      'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED',
    ]) {
      expect(lerEventoAsaas(carga(tipo))?.desfecho, tipo).toBe('recusado');
    }
  });

  it('eventos que não mudam o pedido são ignorados, mas entendidos', () => {
    expect(lerEventoAsaas(carga('PAYMENT_CREATED'))?.desfecho).toBe('ignorar');
    expect(lerEventoAsaas(carga('PAYMENT_REFUNDED'))?.desfecho).toBe('ignorar');
  });

  it('sem referência a um pedido nosso, ignora — mesmo pagamento confirmado', () => {
    expect(lerEventoAsaas(carga('PAYMENT_RECEIVED', null))?.desfecho).toBe('ignorar');
    expect(lerEventoAsaas(carga('PAYMENT_RECEIVED', 'pedido-de-outro-sistema'))).toMatchObject({
      pedidoId: null,
      desfecho: 'ignorar',
    });
  });

  it('carga que não é evento do Asaas é recusada', () => {
    expect(lerEventoAsaas(null)).toBeNull();
    expect(lerEventoAsaas({ event: 'PAYMENT_RECEIVED' })).toBeNull();
    expect(lerEventoAsaas('texto')).toBeNull();
  });
});

describe('tokenConfere', () => {
  it('confere o token exato', () => {
    expect(tokenConfere('segredo-forte', 'segredo-forte')).toBe(true);
    expect(tokenConfere('segredo-fraco', 'segredo-forte')).toBe(false);
    expect(tokenConfere('segredo', 'segredo-forte')).toBe(false);
  });

  it('sem token configurado, nada confere — nem header vazio', () => {
    expect(tokenConfere('', undefined)).toBe(false);
    expect(tokenConfere('', '')).toBe(false);
    expect(tokenConfere('qualquer', '   ')).toBe(false);
    expect(tokenConfere(null, 'segredo-forte')).toBe(false);
  });
});
