/**
 * Regra da carteira e do extrato (módulo 5).
 *
 * **Puro** — sem `server-only`, sem Supabase. Quem lê o banco é o repositório;
 * quem junta as duas coisas é `consultas.ts`.
 */

import {
  deClavesInteiras,
  paraCentavos as clavesParaCentavos,
  precoPorClave,
  somar,
} from '@dissona/nucleo/lib/claves';
import type { Claves } from '@dissona/nucleo/lib/claves';
import type { Centavos } from '@dissona/nucleo/lib/dinheiro';
import { descontoDerivado } from '@dissona/nucleo/modulos/pacote/servico';

import type {
  FiltroDoExtrato,
  LinhaDoExtrato,
  Movimentacao,
  ResumoDoPedido,
  TipoLancamento,
} from './tipos';

const ZERO = deClavesInteiras(0);

/** Soma o que casa com os tipos dados. Sempre em `bigint`, nunca em float. */
function somarPorTipo(
  movimentacoes: readonly Movimentacao[],
  tipos: readonly TipoLancamento[],
): Claves {
  return somar(
    ...movimentacoes.filter((cada) => tipos.includes(cada.tipo)).map((cada) => cada.quantidade),
  );
}

/**
 * "Adquiridas" — tudo que entrou por compra.
 *
 * `estorno` fica de fora de propósito: um estorno devolve dinheiro e **retira**
 * Claves, então somá-lo aqui inflaria o total comprado. Ele aparece no extrato
 * com o próprio rótulo.
 */
export function adquiridas(movimentacoes: readonly Movimentacao[]): Claves {
  return somarPorTipo(movimentacoes, ['compra']);
}

/**
 * "Usadas" — o que saiu em envios, como número **positivo**.
 *
 * `consumo` é negativo no ledger (o `check` `lancamento_clave_sinal_coerente`
 * garante). A tela mostra "12 Claves usadas", não "−12", então o sinal é
 * invertido aqui e não na View — assim ninguém precisa lembrar disso duas
 * vezes.
 */
export function usadas(movimentacoes: readonly Movimentacao[]): Claves {
  return -somarPorTipo(movimentacoes, ['consumo']);
}

/*
 * Não há `devolvidas()` aqui de propósito: a view `saldo_carteira` já devolve
 * essa soma, e computá-la de novo daria duas fontes para o mesmo número —
 * exatamente o que o ledger derivado existe para evitar. `adquiridas` e
 * `usadas` existem porque a view **não** as tem.
 */

/** Os tipos de lançamento que cada filtro da tela 5.3 mostra. */
const TIPOS_POR_FILTRO: Record<FiltroDoExtrato, readonly TipoLancamento[] | null> = {
  todas: null,
  adquiridas: ['compra'],
  usadas: ['consumo'],
  devolvidas: ['devolucao'],
};

export function filtrar(
  movimentacoes: readonly Movimentacao[],
  filtro: FiltroDoExtrato,
): readonly Movimentacao[] {
  const tipos = TIPOS_POR_FILTRO[filtro];
  return tipos === null ? movimentacoes : movimentacoes.filter((cada) => tipos.includes(cada.tipo));
}

/**
 * O extrato com o saldo acumulado, da linha mais recente para a mais antiga.
 *
 * O acumulado é calculado **de trás para frente** — é o que o protótipo faz, e
 * é a única forma correta: a coluna "Saldo" de uma linha é o saldo **depois**
 * daquele lançamento, e a lista é exibida do mais novo para o mais velho.
 * Somar de cima para baixo daria o saldo ao contrário.
 *
 * Recebe a lista **completa**, não a filtrada: o saldo de uma linha depende de
 * tudo que veio antes dela, inclusive do que o filtro esconde. Filtrar antes de
 * acumular mostraria saldos que nunca existiram.
 */
export function comSaldoAcumulado(
  todas: readonly Movimentacao[],
  filtro: FiltroDoExtrato,
): readonly LinhaDoExtrato[] {
  const doMaisAntigo = [...todas].sort((a, b) => a.data.getTime() - b.data.getTime());

  const saldoPorLancamento = new Map<number, Claves>();
  let acumulado = ZERO;
  for (const movimentacao of doMaisAntigo) {
    acumulado = somar(acumulado, movimentacao.quantidade);
    saldoPorLancamento.set(movimentacao.id, acumulado);
  }

  return filtrar(todas, filtro)
    .slice()
    .sort((a, b) => b.data.getTime() - a.data.getTime())
    .map((movimentacao) => ({
      ...movimentacao,
      saldo: saldoPorLancamento.get(movimentacao.id) ?? ZERO,
    }));
}

/** As N mais recentes, para o bloco "Últimas movimentações" da tela 5. */
export function ultimas(
  movimentacoes: readonly Movimentacao[],
  quantas: number,
): readonly Movimentacao[] {
  return [...movimentacoes].sort((a, b) => b.data.getTime() - a.data.getTime()).slice(0, quantas);
}

// ---------------------------------------------------------------------------
// Compra de Claves (5.2)
// ---------------------------------------------------------------------------

/**
 * O resumo que a tela 5.2 mostra ao lado do "Confirmar compra".
 *
 * A aritmética é a de `criar_pedido_clave`, transcrita: o **bruto** é a
 * quantidade ao valor cheio da Clave, com o mesmo `greatest` que a RPC aplica
 * (um pacote cadastrado acima do cheio vira "sem desconto" em vez de desconto
 * negativo, que o check `pedido_clave_valores_nao_negativos` recusaria); o
 * **desconto** é a diferença, e nunca um segundo arredondamento sobre o
 * percentual — é o que faz `bruto - desconto = total` fechar sem centavo
 * perdido, exatamente como o check `pedido_clave_desconto_fecha` exige.
 *
 * Duas implementações da mesma conta é o que se está evitando aqui: esta
 * mostra, a RPC grava, e o teste `pedido.test.ts` prende as duas ao mesmo
 * resultado. O `descontoPercentual` reusa `descontoDerivado` do módulo de
 * pacote, que é a função que a tela 21 do admin já usa — a vitrine do artista
 * e a lista do admin não podem discordar do mesmo pacote.
 */
export function resumoDoPedido(
  quantidade: Claves,
  valorDoPacote: Centavos,
  valorDaClave: Centavos,
): ResumoDoPedido {
  const cheio = clavesParaCentavos(quantidade, valorDaClave);
  const bruto = cheio > valorDoPacote ? cheio : valorDoPacote;

  return {
    quantidade,
    bruto,
    desconto: bruto - valorDoPacote,
    total: valorDoPacote,
    precoPorClave: precoPorClave(valorDoPacote, quantidade),
    descontoPercentual: descontoDerivado(valorDoPacote, bruto),
  };
}

/**
 * O cartão a guardar, se a resposta da cobrança trouxe token.
 *
 * Vive aqui, e não em `pagamento.ts`, pela razão de sempre neste módulo: é
 * regra pura, e regra pura precisa ser testável sem servidor.
 *
 * `undefined` quando não há o que salvar — e isso é **normal** em três
 * situações: a cobrança foi paga com um token que já tínhamos, a conta do
 * Asaas não tokeniza, ou a resposta veio sem os quatro dígitos. Na última,
 * salvar mesmo assim violaria o `check` da `0007e` e derrubaria uma compra já
 * paga por causa de um detalhe de vitrine.
 */
export function cartaoDaResposta(cobrado: {
  readonly creditCard?: {
    readonly creditCardNumber?: string;
    readonly creditCardBrand?: string;
    readonly creditCardToken?: string;
  };
}):
  | { readonly token: string; readonly ultimosDigitos: string; readonly bandeira: string | null }
  | undefined {
  const cartao = cobrado.creditCard;
  const token = cartao?.creditCardToken;
  const ultimos = cartao?.creditCardNumber;

  if (token === undefined || token === '' || ultimos === undefined || !/^[0-9]{4}$/.test(ultimos)) {
    return undefined;
  }

  return { token, ultimosDigitos: ultimos, bandeira: cartao?.creditCardBrand ?? null };
}
