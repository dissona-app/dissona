import { describe, expect, it } from 'vitest';

import { deClavesInteiras, paraClaves } from '@dissona/nucleo/lib/claves';
import { paraCentavos } from '@dissona/nucleo/lib/dinheiro';

import { resumoDoPedido } from '../servico';

/**
 * O resumo do pedido da tela 5.2.
 *
 * O que estes testes fixam **não** é "a multiplicação funciona". É que o
 * número da tela e o número que `criar_pedido_clave` congela são o mesmo:
 * a RPC calcula
 *
 *     bruto    = greatest(round(quantidade × clave_valor_centavos), valor)
 *     desconto = bruto − valor
 *     total    = valor
 *
 * e o invariante `bruto − desconto = total` é `check
 * pedido_clave_desconto_fecha`. Um resumo que divergisse mostraria um total na
 * tela e gravaria outro no pedido, e o erro só apareceria na fatura.
 *
 * Os quatro pacotes usados são os do protótipo e os do seed de E2E: Ensaio
 * (10/R$ 100), Repertório (30/R$ 285), Turnê (60/R$ 540) e Catálogo
 * (100/R$ 850), com a Clave a R$ 10.
 */

const CLAVE = paraCentavos('10,00');

describe('resumoDoPedido', () => {
  it('pacote sem desconto: bruto igual ao total, desconto zero', () => {
    const resumo = resumoDoPedido(deClavesInteiras(10), paraCentavos('100,00'), CLAVE);

    expect(resumo.bruto).toBe(paraCentavos('100,00'));
    expect(resumo.desconto).toBe(0n);
    expect(resumo.total).toBe(paraCentavos('100,00'));
    expect(resumo.descontoPercentual).toBe(0);
    expect(resumo.precoPorClave).toBe(paraCentavos('10,00'));
  });

  it('pacote com desconto: o desconto é a diferença, não um segundo arredondamento', () => {
    const resumo = resumoDoPedido(deClavesInteiras(30), paraCentavos('285,00'), CLAVE);

    expect(resumo.bruto).toBe(paraCentavos('300,00'));
    expect(resumo.desconto).toBe(paraCentavos('15,00'));
    expect(resumo.total).toBe(paraCentavos('285,00'));
    expect(resumo.descontoPercentual).toBe(5);
    expect(resumo.precoPorClave).toBe(paraCentavos('9,50'));
  });

  it.each([
    ['Ensaio', 10, '100,00'],
    ['Repertório', 30, '285,00'],
    ['Turnê', 60, '540,00'],
    ['Catálogo', 100, '850,00'],
  ])('%s fecha bruto − desconto = total', (_nome, quantidade, valor) => {
    const resumo = resumoDoPedido(
      deClavesInteiras(quantidade as number),
      paraCentavos(valor as string),
      CLAVE,
    );

    expect(resumo.bruto - resumo.desconto).toBe(resumo.total);
    expect(resumo.desconto).toBeGreaterThanOrEqual(0n);
  });

  /**
   * O `greatest` da RPC, transcrito.
   *
   * Um pacote cadastrado acima do valor cheio não deveria existir — a tela
   * 21.1 o recusa com `valor > base` —, mas um cadastrado antes daquela
   * validação, ou por SQL direto, existiria. A RPC o trata como "sem
   * desconto" em vez de gravar desconto negativo, que o check
   * `pedido_clave_valores_nao_negativos` recusaria; o resumo faz o mesmo, e
   * assim a tela não mostra "-R$ 50,00 de desconto" antes de o banco recusar.
   */
  it('pacote acima do valor cheio vira sem desconto, como na RPC', () => {
    const resumo = resumoDoPedido(deClavesInteiras(10), paraCentavos('150,00'), CLAVE);

    expect(resumo.bruto).toBe(paraCentavos('150,00'));
    expect(resumo.desconto).toBe(0n);
    expect(resumo.total).toBe(paraCentavos('150,00'));
  });

  /**
   * Quantidade fracionária não existe em pacote — `esquemaDadosDePacote` só
   * aceita inteiro —, mas a coluna é `numeric(10,2)` e o cálculo tem de fechar
   * de qualquer forma, pelo mesmo motivo de sempre: o check é do banco, e ele
   * não sabe que a tela restringe.
   */
  it('fecha o invariante mesmo com quantidade fracionária', () => {
    const resumo = resumoDoPedido(paraClaves('2.50'), paraCentavos('23,00'), CLAVE);

    expect(resumo.bruto).toBe(paraCentavos('25,00'));
    expect(resumo.bruto - resumo.desconto).toBe(resumo.total);
  });
});
