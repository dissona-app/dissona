/**
 * Regra da carteira e do extrato (módulo 5).
 *
 * **Puro** — sem `server-only`, sem Supabase. Quem lê o banco é o repositório;
 * quem junta as duas coisas é `consultas.ts`.
 */

import { deClavesInteiras, somar } from '@/lib/claves';
import type { Claves } from '@/lib/claves';

import type { FiltroDoExtrato, LinhaDoExtrato, Movimentacao, TipoLancamento } from './tipos';

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
