/**
 * Regra de negócio dos pacotes de Claves.
 *
 * Puro: sem React, sem Supabase, sem `Date.now()`. Tudo que a tela 21.1
 * calcula ao vivo mora aqui, e é a **mesma** função que a Server Action usa
 * para validar antes de gravar. Duas implementações do mesmo cálculo — uma
 * para prever e outra para gravar — é a origem clássica de "o valor mostrado
 * não é o valor salvo".
 *
 * O algoritmo é o do protótipo, valor a valor (`patchEd`/`renderVals` de
 * `docs/R2/extraido/Admin.html`):
 *
 *     base     = quantidade × clave_valor_centavos
 *     desconto = (1 − valor / base) × 100
 *     valor    = base × (1 − desconto / 100)
 *     unitario = valor / quantidade
 *     economia = max(0, base − valor)
 *
 * `clave_valor_centavos` entra por parâmetro, de `configuracao` — o "R$ 10"
 * da copy da tela é dado, não constante de código (RNF-011).
 */

import type { Claves } from '@dissona/nucleo/lib/claves';
import { paraCentavos as clavesParaCentavos, precoPorClave } from '@dissona/nucleo/lib/claves';
import type { Centavos } from '@dissona/nucleo/lib/dinheiro';
import { CodigoErro, falhar } from '@dissona/nucleo/lib/erros';

import type { DadosDePacote, Pacote, PacoteNaLista } from './tipos';

/** Cem porcento em centésimos de ponto — a escala de `desconto_percentual`. */
const CEM_PONTOS = 10_000n;

/** Valor cheio: o que a mesma quantidade custaria sem desconto nenhum. */
export function base(quantidade: Claves, valorDaClave: Centavos): Centavos {
  return clavesParaCentavos(quantidade, valorDaClave);
}

/**
 * Desconto derivado do valor, em pontos percentuais com duas casas.
 *
 * Aritmética inteira até o último passo: `(base − valor) × 10000 / base` dá
 * centésimos de ponto, e só então divide por 100 para virar `number`. Fazer
 * `(1 - valor/base) * 100` em ponto flutuante devolve 4.999999999999996 para
 * um desconto de 5%, e a tela mostra "5%" só por sorte de arredondamento.
 */
export function descontoDerivado(valor: Centavos, valorCheio: Centavos): number {
  if (valorCheio <= 0n) falhar(CodigoErro.VALOR_INVALIDO, { motivo: 'base_nao_positiva' });
  const centesimos = ((valorCheio - valor) * CEM_PONTOS) / valorCheio;
  return Number(centesimos) / 100;
}

/** Valor a partir do desconto — o caminho inverso, que a tela 21.1 também tem. */
export function valorComDesconto(valorCheio: Centavos, descontoPercentual: number): Centavos {
  if (descontoPercentual < 0 || descontoPercentual >= 100) {
    falhar(CodigoErro.PERCENTUAL_INVALIDO, { descontoPercentual });
  }
  const restante = CEM_PONTOS - BigInt(Math.round(descontoPercentual * 100));
  // Meia unidade para cima, como todo arredondamento de dinheiro do projeto.
  return (valorCheio * restante * 2n + CEM_PONTOS) / (CEM_PONTOS * 2n);
}

/** `base − valor`, piso em zero. */
export function economia(valor: Centavos, valorCheio: Centavos): Centavos {
  const diferenca = valorCheio - valor;
  return diferenca > 0n ? diferenca : 0n;
}

/**
 * Enriquece uma linha com o que a tela 21 exibe.
 *
 * Note que `descontoDerivado` vem do valor e não de `pacote.descontoPercentual`
 * — se os dois discordarem, a tela mostra o que o artista vai pagar, que é o
 * único dos dois que tem consequência.
 */
export function paraLista(pacote: Pacote, valorDaClave: Centavos): PacoteNaLista {
  const valorCheio = base(pacote.quantidade, valorDaClave);
  return {
    ...pacote,
    precoPorClave: precoPorClave(pacote.valor, pacote.quantidade),
    descontoDerivado: descontoDerivado(pacote.valor, valorCheio),
    economia: economia(pacote.valor, valorCheio),
  };
}

/** Quantos aparecem na Carteira do artista, para o resumo do topo da tela 21. */
export function contarAtivos(pacotes: readonly Pacote[]): number {
  return pacotes.filter((pacote) => pacote.ativo).length;
}

/**
 * Guarda de coerência antes de gravar.
 *
 * O que o banco já garante por `check` — quantidade positiva, valor positivo,
 * desconto entre 0 e 100 — está repetido aqui de propósito: o `check` devolve
 * um erro de constraint que a tela não sabe traduzir num campo, e o cenário A2
 * pede a mensagem no campo certo. Esta função é a que a Server Action chama, e
 * o `check` é a rede embaixo.
 *
 * A regra que **só** existe aqui é `valor ≤ base`: um pacote mais caro que
 * comprar Clave a Clave passa em todo `check` do banco e é um erro de negócio
 * — o protótipo, sendo mock, capava em silêncio (`if (valor > qtd * 10) valor
 * = qtd * 10`).
 */
export function validarDados(dados: DadosDePacote, valorDaClave: Centavos): void {
  if (dados.nome.trim() === '') {
    falhar(CodigoErro.ENTRADA_INVALIDA, { campo: 'nome' });
  }
  if (dados.quantidade <= 0n) {
    falhar(CodigoErro.ENTRADA_INVALIDA, { campo: 'quantidade' });
  }
  if (dados.valor <= 0n) {
    falhar(CodigoErro.ENTRADA_INVALIDA, { campo: 'valor' });
  }
  if (dados.valor > base(dados.quantidade, valorDaClave)) {
    falhar(CodigoErro.ENTRADA_INVALIDA, { campo: 'valor', motivo: 'acima_da_base' });
  }
}
