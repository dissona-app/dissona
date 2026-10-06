/**
 * Dinheiro em **centavos inteiros** (`bigint`). Nunca ponto flutuante.
 *
 * O rateio de 50%, os percentuais por classe e os descontos progressivos não
 * toleram erro de arredondamento (architecture.md §1.1). Este é o **único**
 * módulo que converte e formata dinheiro (§8).
 */

import { CodigoErro, falhar } from './erros';

/** Valor monetário em centavos. */
export type Centavos = bigint;

/**
 * Percentual com até duas casas decimais, expresso em centésimos de ponto
 * percentual: 38% → 3800. Mantém a aritmética inteira de ponta a ponta.
 */
const ESCALA_PERCENTUAL = 100n;
const CEM_POR_CENTO = 100n * ESCALA_PERCENTUAL; // 10000

/** Divisão inteira com arredondamento de meia unidade para cima, simétrico. */
function dividirArredondando(numerador: bigint, denominador: bigint): bigint {
  if (denominador === 0n) falhar(CodigoErro.VALOR_INVALIDO, { motivo: 'divisao_por_zero' });
  const negativo = numerador < 0n !== denominador < 0n;
  const n = numerador < 0n ? -numerador : numerador;
  const d = denominador < 0n ? -denominador : denominador;
  // floor(n/d + 1/2) === floor((2n + d) / 2d)
  const quociente = (n * 2n + d) / (d * 2n);
  return negativo ? -quociente : quociente;
}

function percentualParaEscala(percentual: number): bigint {
  if (!Number.isFinite(percentual)) {
    falhar(CodigoErro.PERCENTUAL_INVALIDO, { percentual: String(percentual) });
  }
  return BigInt(Math.round(percentual * Number(ESCALA_PERCENTUAL)));
}

/**
 * Converte uma quantia em reais para centavos.
 *
 * Aceita `"10,50"`, `"10.50"`, `"1.234,56"` (pt-BR) e `"1234.56"`. Rejeita
 * mais de duas casas decimais em vez de arredondar em silêncio — dinheiro
 * truncado sem aviso é um bug difícil de rastrear depois.
 */
export function paraCentavos(reais: string): Centavos {
  const bruto = reais.trim();
  if (bruto === '') falhar(CodigoErro.VALOR_INVALIDO, { entrada: reais });

  const negativo = bruto.startsWith('-');
  let corpo = negativo ? bruto.slice(1) : bruto;

  const temVirgula = corpo.includes(',');
  const temPonto = corpo.includes('.');

  if (temVirgula && temPonto) {
    // Formato pt-BR: ponto agrupa milhar, vírgula separa decimal.
    corpo = corpo.split('.').join('');
    corpo = corpo.replace(',', '.');
  } else if (temVirgula) {
    corpo = corpo.replace(',', '.');
  }

  if (!/^[0-9]+([.][0-9]{1,2})?$/.test(corpo)) {
    falhar(CodigoErro.VALOR_INVALIDO, { entrada: reais });
  }

  const [inteiro = '0', decimal = ''] = corpo.split('.');
  const centavos = BigInt(inteiro) * 100n + BigInt(decimal.padEnd(2, '0'));
  return negativo ? -centavos : centavos;
}

/** Converte centavos para a string decimal exata: `1050n` → `"10.50"`. */
export function paraStringDecimal(centavos: Centavos): string {
  const negativo = centavos < 0n;
  const absoluto = negativo ? -centavos : centavos;
  const inteiro = absoluto / 100n;
  const resto = absoluto % 100n;
  return `${negativo ? '-' : ''}${inteiro}.${resto.toString().padStart(2, '0')}`;
}

/**
 * Formata para exibição. Recebe a string decimal exata, e não um `Number`,
 * para que nenhum valor passe por ponto flutuante nem no caminho de display.
 */
export function formatar(centavos: Centavos, locale = 'pt-BR', moeda = 'BRL'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: moeda,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    // `Intl.NumberFormat.format` aceita string decimal em runtime desde a
    // ES2023 e a formata com precisao exata (verificado: 90000000000000.99
    // sai intacto, muito acima do limite do float). A tipagem do TS ainda
    // declara `number | bigint`, dai o cast.
  }).format(paraStringDecimal(centavos) as unknown as number);
}

/** Aplica um percentual, arredondando meia unidade para cima. */
export function aplicarPercentual(valor: Centavos, percentual: number): Centavos {
  return dividirArredondando(valor * percentualParaEscala(percentual), CEM_POR_CENTO);
}

/**
 * Divide um total entre duas partes por percentual, **garantindo que a soma
 * feche**: `parte + complemento === total`, sempre.
 *
 * É o invariante do gate da R2 ("`repasse + comissão = valor da transação` em
 * toda transação"). O complemento é obtido por subtração, e não por um segundo
 * arredondamento, justamente para não perder nem sobrar um centavo.
 */
export function ratear(
  total: Centavos,
  percentual: number,
): { readonly parte: Centavos; readonly complemento: Centavos } {
  const escala = percentualParaEscala(percentual);
  if (escala < 0n || escala > CEM_POR_CENTO) {
    falhar(CodigoErro.PERCENTUAL_INVALIDO, { percentual });
  }
  const parte = dividirArredondando(total * escala, CEM_POR_CENTO);
  return { parte, complemento: total - parte };
}

export function somar(...valores: readonly Centavos[]): Centavos {
  return valores.reduce((acumulado, valor) => acumulado + valor, 0n);
}

export function subtrair(a: Centavos, b: Centavos): Centavos {
  return a - b;
}

/** Limita um valor a um teto — usado na penalidade de prazo (teto de 50%). */
export function limitar(valor: Centavos, teto: Centavos): Centavos {
  return valor > teto ? teto : valor;
}

export function ehPositivo(valor: Centavos): boolean {
  return valor > 0n;
}
