import { describe, expect, it } from 'vitest';

import {
  dentroDoPrazo,
  formatarFracaoComoPercentual,
  formatarNumero,
  formatarPercentual,
  prazoRestante,
  somarDias,
  somarHoras,
  tempoRelativo,
  truncar,
} from '../formato';

const semNbsp = (texto: string): string => texto.replace(/[  ]/g, ' ');

describe('percentuais', () => {
  it('formata fração como percentual', () => {
    expect(formatarFracaoComoPercentual(0.85)).toBe('85%');
    expect(formatarFracaoComoPercentual(0.855, 'pt-BR', 1)).toBe('85,5%');
    expect(formatarFracaoComoPercentual(0)).toBe('0%');
  });

  it('formata percentual em base 100', () => {
    expect(formatarPercentual(38)).toBe('38%');
    expect(formatarPercentual(62)).toBe('62%');
  });
});

describe('formatarNumero', () => {
  it('agrupa milhar em pt-BR', () => {
    expect(formatarNumero(1234)).toBe('1.234');
    expect(semNbsp(formatarNumero(1234.5))).toBe('1.234,5');
  });
});

describe('somarHoras e somarDias', () => {
  const base = new Date('2026-09-04T12:00:00.000Z');

  it('deriva o vencimento de 72h do envio', () => {
    expect(somarHoras(base, 72).toISOString()).toBe('2026-09-07T12:00:00.000Z');
  });

  it('deriva a devolução automática de 7 dias', () => {
    expect(somarDias(base, 7).toISOString()).toBe('2026-09-11T12:00:00.000Z');
  });

  it('não muta a data original', () => {
    somarHoras(base, 72);
    expect(base.toISOString()).toBe('2026-09-04T12:00:00.000Z');
  });
});

describe('prazoRestante', () => {
  const agora = new Date('2026-09-04T12:00:00.000Z');

  it('decompõe o tempo até vencer', () => {
    const vencimento = new Date('2026-09-07T12:00:00.000Z'); // +72h
    const restante = prazoRestante(vencimento, agora);
    expect(restante.vencido).toBe(false);
    expect(restante.dias).toBe(3);
    expect(restante.horas).toBe(0);
    expect(restante.minutos).toBe(0);
  });

  it('quebra horas e minutos', () => {
    const vencimento = new Date('2026-09-05T14:30:00.000Z'); // +26h30
    const restante = prazoRestante(vencimento, agora);
    expect(restante.dias).toBe(1);
    expect(restante.horas).toBe(2);
    expect(restante.minutos).toBe(30);
  });

  it('marca vencido com componentes positivos', () => {
    const vencimento = new Date('2026-09-04T09:15:00.000Z'); // -2h45
    const restante = prazoRestante(vencimento, agora);
    expect(restante.vencido).toBe(true);
    expect(restante.totalMs).toBeLessThan(0);
    expect(restante.dias).toBe(0);
    expect(restante.horas).toBe(2);
    expect(restante.minutos).toBe(45);
  });

  it('o instante exato do vencimento ainda não está vencido', () => {
    const restante = prazoRestante(agora, agora);
    expect(restante.vencido).toBe(false);
    expect(restante.totalMs).toBe(0);
  });
});

describe('dentroDoPrazo', () => {
  const vencimento = new Date('2026-09-07T12:00:00.000Z');

  it('aceita conclusão antes e exatamente no vencimento', () => {
    expect(dentroDoPrazo(new Date('2026-09-06T23:59:59.000Z'), vencimento)).toBe(true);
    expect(dentroDoPrazo(vencimento, vencimento)).toBe(true);
  });

  it('recusa conclusão um milissegundo depois', () => {
    expect(dentroDoPrazo(new Date(vencimento.getTime() + 1), vencimento)).toBe(false);
  });
});

describe('truncar', () => {
  it('devolve o texto quando cabe', () => {
    expect(truncar('curto', 10)).toBe('curto');
    expect(truncar('exato', 5)).toBe('exato');
  });

  it('corta na fronteira de palavra', () => {
    expect(truncar('a produção está muito limpa', 12)).toBe('a produção…');
  });

  it('corta no meio quando não há espaço', () => {
    expect(truncar('palavraenormesemespaco', 8)).toBe('palavrae…');
  });
});

describe('tempoRelativo', () => {
  const agora = new Date('2026-09-10T12:00:00.000Z');

  it('usa a maior unidade que couber', () => {
    // 90 minutos são "há 1 hora": mostrar "há 90 minutos" seria correto e
    // ilegível, e a lista de sessões é feita para bater o olho.
    expect(tempoRelativo(new Date('2026-09-10T10:30:00.000Z'), 'pt-BR', agora)).toBe('há 1 hora');
    expect(tempoRelativo(new Date('2026-09-07T12:00:00.000Z'), 'pt-BR', agora)).toBe('há 3 dias');
  });

  it("`numeric: 'auto'` dá as palavras, não os números", () => {
    // É o que faz a diferença entre "ontem" e "há 1 dia" — e a sessão que
    // aparece como "há 0 segundos" em vez de "agora" parece defeito.
    expect(tempoRelativo(agora, 'pt-BR', agora)).toBe('agora');
    expect(tempoRelativo(new Date('2026-09-09T12:00:00.000Z'), 'pt-BR', agora)).toBe('ontem');
  });

  it('mantém o sinal para data no futuro', () => {
    // Não é o uso previsto, mas relógio de servidor adiantado em relação ao do
    // banco produz futuro por alguns segundos, e formatá-lo como passado seria
    // mentir sobre a ordem dos acessos.
    expect(tempoRelativo(new Date('2026-09-15T12:00:00.000Z'), 'pt-BR', agora)).toBe('em 5 dias');
  });
});
