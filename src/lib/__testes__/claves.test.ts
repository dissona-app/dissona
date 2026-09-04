import { describe, expect, it } from 'vitest';

import {
  aplicarDesconto,
  deClavesInteiras,
  economia,
  formatar,
  paraCentavos,
  paraClaves,
  paraStringDecimal,
  precoPorClave,
  somar,
  temSaldo,
} from '../claves';
import { ErroDominio } from '../erros';

/** `configuracao.clave_valor_centavos` — 1 Clave = R$ 10,00. */
const VALOR_CLAVE = 1000n;

const semNbsp = (texto: string): string => texto.replace(/[  ]/g, ' ');

describe('paraClaves', () => {
  it('converte para centésimos de Clave', () => {
    expect(paraClaves('1')).toBe(100n);
    expect(paraClaves('2,50')).toBe(250n);
    expect(paraClaves('2.5')).toBe(250n);
    expect(paraClaves('0,01')).toBe(1n);
  });

  it('rejeita mais de duas casas e entrada inválida', () => {
    for (const entrada of ['1,234', '', 'abc', '-1']) {
      expect(() => paraClaves(entrada)).toThrow(ErroDominio);
    }
  });
});

describe('deClavesInteiras', () => {
  it('constrói a partir de inteiro', () => {
    expect(deClavesInteiras(0)).toBe(0n);
    expect(deClavesInteiras(30)).toBe(3000n);
  });

  it('rejeita fração e negativo', () => {
    expect(() => deClavesInteiras(1.5)).toThrow(ErroDominio);
    expect(() => deClavesInteiras(-1)).toThrow(ErroDominio);
  });
});

describe('formatação', () => {
  it('produz decimal exato e formatado', () => {
    expect(paraStringDecimal(250n)).toBe('2.50');
    expect(paraStringDecimal(100n)).toBe('1.00');
    expect(semNbsp(formatar(250n))).toBe('2,50');
    expect(semNbsp(formatar(150000n))).toBe('1.500,00');
  });
});

describe('paraCentavos', () => {
  it('converte Claves em reais pelo valor de configuracao', () => {
    expect(paraCentavos(deClavesInteiras(1), VALOR_CLAVE)).toBe(1000n);
    expect(paraCentavos(deClavesInteiras(30), VALOR_CLAVE)).toBe(30000n);
    expect(paraCentavos(paraClaves('2,50'), VALOR_CLAVE)).toBe(2500n);
  });

  it('não hardcoda o valor da Clave — muda com a configuração', () => {
    expect(paraCentavos(deClavesInteiras(1), 1500n)).toBe(1500n);
  });

  it('converte fração de Clave', () => {
    // 0,01 Clave a R$ 10,00 = R$ 0,10
    expect(paraCentavos(1n, 1000n)).toBe(10n);
    // 0,01 Clave a R$ 50,00 = R$ 0,50
    expect(paraCentavos(1n, 5000n)).toBe(50n);
  });

  it('arredonda meia unidade para cima quando não fecha em centavo', () => {
    // 0,01 Clave a R$ 10,50 = 10,5 centavos -> 11
    expect(paraCentavos(1n, 1050n)).toBe(11n);
    // 0,01 Clave a R$ 10,51 = 10,51 centavos -> 11
    expect(paraCentavos(1n, 1051n)).toBe(11n);
    // 0,01 Clave a R$ 10,49 = 10,49 centavos -> 10
    expect(paraCentavos(1n, 1049n)).toBe(10n);
  });
});

describe('precoPorClave', () => {
  it('deriva o preço unitário do pacote', () => {
    // 10 Claves por R$ 90,00 -> R$ 9,00 por Clave
    expect(precoPorClave(9000n, deClavesInteiras(10))).toBe(900n);
    // 30 Claves por R$ 255,00 -> R$ 8,50
    expect(precoPorClave(25500n, deClavesInteiras(30))).toBe(850n);
  });

  it('rejeita quantidade zero', () => {
    expect(() => precoPorClave(1000n, 0n)).toThrow(ErroDominio);
  });
});

describe('aplicarDesconto', () => {
  it('aplica desconto progressivo sobre o valor cheio', () => {
    expect(aplicarDesconto(10000n, 0)).toBe(10000n);
    expect(aplicarDesconto(10000n, 10)).toBe(9000n);
    expect(aplicarDesconto(10000n, 15)).toBe(8500n);
    expect(aplicarDesconto(10000n, 100)).toBe(0n);
  });

  it('rejeita desconto fora de 0–100', () => {
    expect(() => aplicarDesconto(10000n, -1)).toThrow(ErroDominio);
    expect(() => aplicarDesconto(10000n, 101)).toThrow(ErroDominio);
  });
});

describe('economia', () => {
  it('calcula quanto o artista economiza no pacote', () => {
    // 10 Claves valem R$ 100,00 cheias; o pacote custa R$ 90,00
    expect(economia(deClavesInteiras(10), 9000n, VALOR_CLAVE)).toBe(1000n);
  });

  it('nunca devolve economia negativa', () => {
    expect(economia(deClavesInteiras(10), 12000n, VALOR_CLAVE)).toBe(0n);
  });
});

describe('saldo', () => {
  it('compara saldo com o necessário', () => {
    expect(temSaldo(deClavesInteiras(5), deClavesInteiras(5))).toBe(true);
    expect(temSaldo(deClavesInteiras(5), deClavesInteiras(6))).toBe(false);
    expect(temSaldo(250n, 249n)).toBe(true);
  });

  it('soma lançamentos', () => {
    expect(somar(100n, 250n, 50n)).toBe(400n);
    expect(somar()).toBe(0n);
  });
});
