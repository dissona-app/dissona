import { describe, expect, it } from 'vitest';

import { deClavesInteiras, paraClavesComSinal } from '@dissona/nucleo/lib/claves';

import {
  adquiridas,
  cartaoDaResposta,
  comSaldoAcumulado,
  filtrar,
  ultimas,
  usadas,
} from '../servico';
import type { Movimentacao, TipoLancamento } from '../tipos';

/**
 * Carteira e extrato — as somas e o saldo acumulado.
 *
 * O teste que mais importa é o do acumulado sob filtro: ele é a diferença
 * entre a coluna "Saldo" contar a verdade e contar um saldo que nunca existiu.
 */

let proximoId = 1;

function mov(tipo: TipoLancamento, quantidade: string, dia: number): Movimentacao {
  return {
    id: proximoId++,
    data: new Date(Date.UTC(2026, 8, dia)),
    origem: `Origem ${tipo}`,
    tipo,
    quantidade: paraClavesComSinal(quantidade),
  };
}

describe('somas da carteira', () => {
  const ledger = [
    mov('compra', '10', 1),
    mov('consumo', '-6', 2),
    mov('devolucao', '2', 3),
    mov('compra', '30', 4),
    mov('consumo', '-4', 5),
  ];

  it('adquiridas soma só as compras', () => {
    expect(adquiridas(ledger)).toBe(deClavesInteiras(40));
  });

  it('usadas devolve número positivo, apesar de o consumo ser negativo no ledger', () => {
    // A tela escreve "10 Claves usadas", nunca "−10". O sinal é invertido no
    // serviço para ninguém ter de lembrar disso na View.
    expect(usadas(ledger)).toBe(deClavesInteiras(10));
  });

  it('estorno não entra em adquiridas — ele retira Claves, não as compra', () => {
    const comEstorno = [...ledger, mov('estorno', '-10', 6)];
    expect(adquiridas(comEstorno)).toBe(deClavesInteiras(40));
  });

  it('carteira sem movimento nenhum soma zero', () => {
    expect(adquiridas([])).toBe(deClavesInteiras(0));
    expect(usadas([])).toBe(deClavesInteiras(0));
  });
});

describe('filtrar', () => {
  const ledger = [mov('compra', '10', 1), mov('consumo', '-6', 2), mov('devolucao', '2', 3)];

  it.each([
    ['todas', 3],
    ['adquiridas', 1],
    ['usadas', 1],
    ['devolvidas', 1],
  ] as const)('%s devolve %i linha(s)', (filtro, quantas) => {
    expect(filtrar(ledger, filtro)).toHaveLength(quantas);
  });
});

describe('comSaldoAcumulado', () => {
  const ledger = [mov('compra', '10', 1), mov('consumo', '-6', 2), mov('devolucao', '2', 3)];

  it('devolve da mais recente para a mais antiga', () => {
    const linhas = comSaldoAcumulado(ledger, 'todas');
    expect(linhas.map((linha) => linha.tipo)).toEqual(['devolucao', 'consumo', 'compra']);
  });

  it('o saldo de cada linha é o saldo DEPOIS daquele lançamento', () => {
    const linhas = comSaldoAcumulado(ledger, 'todas');

    expect(linhas[0]?.saldo).toBe(deClavesInteiras(6)); // devolução: 4 + 2
    expect(linhas[1]?.saldo).toBe(deClavesInteiras(4)); // consumo: 10 − 6
    expect(linhas[2]?.saldo).toBe(deClavesInteiras(10)); // compra
  });

  it('o saldo sob filtro considera o que o filtro esconde', () => {
    // Esta é a asserção central. Filtrando por "adquiridas", a única linha é a
    // compra de 10 — e o saldo dela continua sendo 10. Se o acumulado fosse
    // calculado sobre a lista filtrada, a devolução isolada mostraria saldo 2,
    // um número que nunca existiu na conta.
    const soDevolucoes = comSaldoAcumulado(ledger, 'devolvidas');

    expect(soDevolucoes).toHaveLength(1);
    expect(soDevolucoes[0]?.saldo).toBe(deClavesInteiras(6));
  });

  it('não perde linha ao ordenar, mesmo com dois lançamentos no mesmo instante', () => {
    const mesmoDia = [mov('compra', '10', 1), mov('compra', '5', 1)];
    expect(comSaldoAcumulado(mesmoDia, 'todas')).toHaveLength(2);
  });
});

describe('ultimas', () => {
  it('devolve as N mais recentes, da mais nova para a mais velha', () => {
    const ledger = [
      mov('compra', '10', 1),
      mov('consumo', '-6', 5),
      mov('devolucao', '2', 3),
      mov('compra', '30', 9),
    ];

    const tres = ultimas(ledger, 3);

    expect(tres).toHaveLength(3);
    expect(tres.map((cada) => cada.data.getUTCDate())).toEqual([9, 5, 3]);
  });

  it('pede mais do que existe e devolve o que existe', () => {
    expect(ultimas([mov('compra', '10', 1)], 3)).toHaveLength(1);
  });
});

/**
 * O cartão que a cobrança deixa para guardar.
 *
 * O que se prova aqui é quando **não** salvar. Salvar pela metade violaria o
 * `check` da `0007e` e derrubaria uma compra já paga — e o dinheiro já entrou.
 */
describe('cartaoDaResposta', () => {
  const COMPLETA = {
    creditCard: {
      creditCardNumber: '8829',
      creditCardBrand: 'MASTERCARD',
      creditCardToken: 'a75a1d98-c52d-4a6b-a413-71e00b193c99',
    },
  };

  it('devolve token, quatro dígitos e bandeira', () => {
    expect(cartaoDaResposta(COMPLETA)).toEqual({
      token: 'a75a1d98-c52d-4a6b-a413-71e00b193c99',
      ultimosDigitos: '8829',
      bandeira: 'MASTERCARD',
    });
  });

  it('sem `creditCard` não há o que guardar', () => {
    // É o caso de pagar com um token que já tínhamos: a cobrança passa e
    // nenhum cartão novo nasce.
    expect(cartaoDaResposta({})).toBeUndefined();
  });

  it('sem token não guarda, mesmo com os dígitos', () => {
    expect(cartaoDaResposta({ creditCard: { creditCardNumber: '8829' } })).toBeUndefined();
  });

  it('dígitos fora de formato não guardam', () => {
    // `ultimos_digitos` tem `check (~ '^[0-9]{4}$')`: mandar "**29" ou o PAN
    // inteiro faria o insert estourar depois de a compra já ter sido paga.
    for (const numero of ['**29', '5162306219378829', '', '882']) {
      expect(
        cartaoDaResposta({ creditCard: { creditCardNumber: numero, creditCardToken: 'tok' } }),
        numero,
      ).toBeUndefined();
    }
  });

  it('bandeira ausente vira null, e não string vazia', () => {
    const cartao = cartaoDaResposta({
      creditCard: { creditCardNumber: '8829', creditCardToken: 'tok' },
    });
    expect(cartao?.bandeira).toBeNull();
  });
});
