import { describe, expect, it } from 'vitest';

import {
  aplicarPercentual,
  ehPositivo,
  formatar,
  limitar,
  paraCentavos,
  paraStringDecimal,
  ratear,
  somar,
  subtrair,
} from '../dinheiro';
import { CodigoErro, ErroDominio } from '../erros';

describe('paraCentavos', () => {
  it('converte formatos aceitos', () => {
    expect(paraCentavos('10')).toBe(1000n);
    expect(paraCentavos('10,50')).toBe(1050n);
    expect(paraCentavos('10.50')).toBe(1050n);
    expect(paraCentavos('10,5')).toBe(1050n);
    expect(paraCentavos('0,01')).toBe(1n);
    expect(paraCentavos('  7,05  ')).toBe(705n);
  });

  it('entende o agrupamento de milhar pt-BR', () => {
    expect(paraCentavos('1.234,56')).toBe(123456n);
    expect(paraCentavos('1.000.000,00')).toBe(100000000n);
  });

  it('aceita valor negativo', () => {
    expect(paraCentavos('-7,05')).toBe(-705n);
  });

  it('rejeita mais de duas casas decimais em vez de truncar em silêncio', () => {
    expect(() => paraCentavos('10,999')).toThrow(ErroDominio);
    try {
      paraCentavos('10,999');
    } catch (erro) {
      expect((erro as ErroDominio).codigo).toBe(CodigoErro.VALOR_INVALIDO);
    }
  });

  it('rejeita entrada não numérica', () => {
    for (const entrada of ['', '   ', 'abc', '10,,5', 'R$ 10', '1e3']) {
      expect(() => paraCentavos(entrada)).toThrow(ErroDominio);
    }
  });

  it('não perde precisão em valores acima do limite do float', () => {
    // 9.007.199.254.740.993 centavos > Number.MAX_SAFE_INTEGER
    expect(paraCentavos('90071992547409,93')).toBe(9007199254740993n);
  });
});

/**
 * O `Intl` separa o símbolo da moeda com espaço não separável (U+00A0 ou
 * U+202F), o que é o comportamento desejado na interface — evita que "R$"
 * quebre para longe do número. Normalizamos só na asserção.
 */
const semNbsp = (texto: string): string => texto.replace(/[  ]/g, ' ');

describe('paraStringDecimal e formatar', () => {
  it('produz a string decimal exata', () => {
    expect(paraStringDecimal(1050n)).toBe('10.50');
    expect(paraStringDecimal(5n)).toBe('0.05');
    expect(paraStringDecimal(0n)).toBe('0.00');
    expect(paraStringDecimal(-705n)).toBe('-7.05');
  });

  it('formata em pt-BR sem passar por ponto flutuante', () => {
    expect(semNbsp(formatar(1050n))).toBe('R$ 10,50');
    expect(semNbsp(formatar(123456n))).toBe('R$ 1.234,56');
    expect(semNbsp(formatar(0n))).toBe('R$ 0,00');
    // Exato bem acima do que um float representaria
    expect(semNbsp(formatar(9000000000000099n))).toBe('R$ 90.000.000.000.000,99');
  });
});

describe('aplicarPercentual', () => {
  it('aplica os percentuais de remuneração por classe', () => {
    // remuneracao.bronze = { atraso: 30, prazo: 38, teto: 50 }
    expect(aplicarPercentual(1000n, 30)).toBe(300n);
    expect(aplicarPercentual(1000n, 38)).toBe(380n);
    expect(aplicarPercentual(1000n, 50)).toBe(500n);
    // ouro no teto
    expect(aplicarPercentual(1000n, 62)).toBe(620n);
  });

  it('aceita percentual fracionário', () => {
    expect(aplicarPercentual(10000n, 3)).toBe(300n);
    expect(aplicarPercentual(10000n, 0.85)).toBe(85n);
    expect(aplicarPercentual(10000n, 33.33)).toBe(3333n);
  });

  it('arredonda meia unidade para cima', () => {
    // 50% de 1 centavo = 0,5 -> 1
    expect(aplicarPercentual(1n, 50)).toBe(1n);
    // 50% de 3 centavos = 1,5 -> 2
    expect(aplicarPercentual(3n, 50)).toBe(2n);
    // 33% de 100 centavos = 33 exato
    expect(aplicarPercentual(100n, 33)).toBe(33n);
  });

  it('é simétrico para valores negativos', () => {
    expect(aplicarPercentual(-3n, 50)).toBe(-2n);
  });
});

describe('ratear — invariante do gate da R2', () => {
  it('garante que repasse + comissão fecha o total, sempre', () => {
    const percentuais = [0, 15, 30, 33.33, 38, 43, 50, 55, 62, 66.67, 100];
    for (let total = 0n; total <= 2000n; total += 1n) {
      for (const percentual of percentuais) {
        const { parte, complemento } = ratear(total, percentual);
        expect(parte + complemento).toBe(total);
        expect(parte).toBeGreaterThanOrEqual(0n);
        expect(complemento).toBeGreaterThanOrEqual(0n);
      }
    }
  });

  it('aplica o rateio de 50% da plataforma', () => {
    const { parte, complemento } = ratear(paraCentavos('10,00'), 50);
    expect(parte).toBe(500n);
    expect(complemento).toBe(500n);
  });

  it('não perde o centavo ímpar', () => {
    const { parte, complemento } = ratear(101n, 50);
    expect(parte).toBe(51n); // meia unidade para cima
    expect(complemento).toBe(50n);
    expect(parte + complemento).toBe(101n);
  });

  it('rejeita percentual fora de 0–100', () => {
    expect(() => ratear(1000n, -1)).toThrow(ErroDominio);
    expect(() => ratear(1000n, 101)).toThrow(ErroDominio);
  });
});

describe('operações auxiliares', () => {
  it('soma e subtrai', () => {
    expect(somar(100n, 250n, 5n)).toBe(355n);
    expect(somar()).toBe(0n);
    expect(subtrair(1000n, 350n)).toBe(650n);
  });

  it('limita ao teto — penalidade de prazo', () => {
    expect(limitar(600n, 500n)).toBe(500n);
    expect(limitar(400n, 500n)).toBe(400n);
  });

  it('identifica valor positivo', () => {
    expect(ehPositivo(1n)).toBe(true);
    expect(ehPositivo(0n)).toBe(false);
    expect(ehPositivo(-1n)).toBe(false);
  });
});
