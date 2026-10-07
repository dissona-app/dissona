/**
 * Claves — a moeda interna.
 *
 * O banco guarda Claves em `numeric(10,2)` (data-model §Convenções). Aqui elas
 * são **centésimos de Clave** em `bigint`, pelo mesmo motivo do dinheiro: nada
 * de ponto flutuante. Este é o único módulo que converte Clave ↔ real (§8).
 *
 * O valor da Clave **não** está hardcoded — vem de `configuracao`
 * (`clave_valor_centavos`) e entra como parâmetro em toda conversão.
 */

import type { Centavos } from './dinheiro';
import { aplicarPercentual } from './dinheiro';
import { CodigoErro, falhar } from './erros';

/** Quantidade de Claves em centésimos: 2,50 Claves → 250. */
export type Claves = bigint;

const CENTESIMOS = 100n;

/** `"2,50"` ou `"2.5"` → `250n`. Rejeita mais de duas casas decimais. */
export function paraClaves(quantidade: string): Claves {
  const corpo = quantidade.trim().replace(',', '.');
  if (!/^[0-9]+([.][0-9]{1,2})?$/.test(corpo)) {
    falhar(CodigoErro.VALOR_INVALIDO, { entrada: quantidade });
  }
  const [inteiro = '0', decimal = ''] = corpo.split('.');
  return BigInt(inteiro) * CENTESIMOS + BigInt(decimal.padEnd(2, '0'));
}

/**
 * Como `paraClaves`, mas aceita sinal — é o formato do **ledger**.
 *
 * `lancamento_clave.quantidade` é assinada por desenho: o `check`
 * `lancamento_clave_sinal_coerente` exige `consumo < 0` e `compra > 0`, e é o
 * que faz o saldo ser a soma simples da coluna. `paraClaves` recusa negativo
 * de propósito — ela serve a preço e a pacote, onde negativo é erro —, então
 * ler o extrato com ela estouraria `VALOR_INVALIDO` em toda linha de consumo.
 */
export function paraClavesComSinal(quantidade: string): Claves {
  const corpo = quantidade.trim().replace(',', '.');
  const negativo = corpo.startsWith('-');
  const semSinal = negativo ? corpo.slice(1) : corpo;
  const magnitude = paraClaves(semSinal);
  return negativo ? -magnitude : magnitude;
}

/** Constrói a partir de uma quantidade inteira de Claves. */
export function deClavesInteiras(quantidade: number): Claves {
  if (!Number.isInteger(quantidade) || quantidade < 0) {
    falhar(CodigoErro.VALOR_INVALIDO, { entrada: quantidade });
  }
  return BigInt(quantidade) * CENTESIMOS;
}

/**
 * `250n` → `"2.50"`. **Com sinal**, que é o que o ledger exige.
 *
 * O sinal sai antes e a parte decimal é tirada do valor absoluto. Sem isso,
 * `-650n` viraria `"-6.-50"` — porque em `bigint` o resto herda o sinal do
 * dividendo — e `Intl.NumberFormat` sobre aquilo devolve `NaN`. Um consumo de
 * 6,50 Claves apareceria como "NaN" no extrato, que é o tipo de defeito que
 * passa despercebido enquanto todos os valores de teste forem inteiros.
 */
export function paraStringDecimal(claves: Claves): string {
  const negativo = claves < 0n;
  const absoluto = negativo ? -claves : claves;
  const inteiro = absoluto / CENTESIMOS;
  const resto = absoluto % CENTESIMOS;
  return `${negativo ? '-' : ''}${inteiro}.${resto.toString().padStart(2, '0')}`;
}

/**
 * Formata para exibição, sem sufixo — a View escolhe.
 *
 * Inteiro sai **sem** casas (`21600n` → `"216"`), como o protótipo escreve
 * ("6 Claves", "30 Claves"); fração sai com as duas (`650n` → `"6,50"`). Nunca
 * `"6,5"`: meia casa decimal parece erro de digitação num valor de moeda, e
 * nunca arredondar para inteiro, que mostraria um saldo que a conta não tem.
 */
export function formatar(claves: Claves, locale = 'pt-BR'): string {
  const casas = claves % CENTESIMOS === 0n ? 0 : 2;
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(paraStringDecimal(claves) as unknown as number);
}

/**
 * Converte Claves em centavos.
 *
 * `valorClaveCentavos` vem de `configuracao.clave_valor_centavos`.
 * Arredonda meia unidade para cima quando a quantidade tem fração.
 */
export function paraCentavos(claves: Claves, valorClaveCentavos: Centavos): Centavos {
  const produto = claves * valorClaveCentavos;
  return (produto * 2n + CENTESIMOS) / (CENTESIMOS * 2n);
}

/**
 * Preço por Clave de um pacote — derivado, nunca persistido
 * (data-model §`pacote_clave`).
 */
export function precoPorClave(valorCentavos: Centavos, quantidade: Claves): Centavos {
  if (quantidade <= 0n) falhar(CodigoErro.VALOR_INVALIDO, { quantidade: quantidade.toString() });
  const numerador = valorCentavos * CENTESIMOS;
  return (numerador * 2n + quantidade) / (quantidade * 2n);
}

/**
 * Quanto o artista economiza comprando o pacote, em vez de comprar a mesma
 * quantidade de Claves ao valor unitário cheio. É o número exibido na tela
 * de pacotes (módulo 21.1).
 */
export function economia(
  quantidade: Claves,
  valorPacoteCentavos: Centavos,
  valorClaveCentavos: Centavos,
): Centavos {
  const cheio = paraCentavos(quantidade, valorClaveCentavos);
  const diferenca = cheio - valorPacoteCentavos;
  return diferenca > 0n ? diferenca : 0n;
}

/** Aplica o desconto de um pacote sobre o valor cheio. */
export function aplicarDesconto(valorCheio: Centavos, descontoPercentual: number): Centavos {
  if (descontoPercentual < 0 || descontoPercentual > 100) {
    falhar(CodigoErro.PERCENTUAL_INVALIDO, { descontoPercentual });
  }
  return valorCheio - aplicarPercentual(valorCheio, descontoPercentual);
}

export function temSaldo(saldo: Claves, necessario: Claves): boolean {
  return saldo >= necessario;
}

export function somar(...valores: readonly Claves[]): Claves {
  return valores.reduce((acumulado, valor) => acumulado + valor, 0n);
}
