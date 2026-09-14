import 'server-only';

/** Leituras da fila (13) e do detalhe (13.1). */

import { lerConfiguracao } from '@/lib/configuracao';

import { buscarItem, listarFila, servicosDoEnvio } from './repositorio';
import {
  contarPrazoCurto,
  filtrar,
  generosDisponiveis,
  naFila,
  ordenar,
  statusNaTela,
} from './servico';
import type { Direcao, ItemDaFila, OrdemDaFila, ServicoContratado, StatusDaFila } from './tipos';

export type { ItemDaFila, ServicoContratado } from './tipos';

export type TelaDaFila = {
  readonly itens: readonly ItemDaFila[];
  /** Antes do filtro — o resumo conta a fila inteira, não o recorte. */
  readonly totalNaFila: number;
  readonly comPrazoCurto: number;
  readonly generos: readonly string[];
  /** Há itens na fila, mas nenhum neste recorte. */
  readonly vazioPorFiltro: boolean;
  readonly agora: Date;
};

export async function lerFila(
  status: StatusDaFila,
  genero: string | null,
  ordem: OrdemDaFila,
  direcao: Direcao,
): Promise<TelaDaFila> {
  const agora = new Date();
  // `pronto` e `devolvido` já saíram da fila; a view os traz porque serve
  // também ao histórico, e é aqui que o recorte da tela 13 acontece.
  const naFilaAgora = (await listarFila()).filter(naFila);

  const filtrados = filtrar(naFilaAgora, status, genero, agora);

  return {
    itens: ordenar(filtrados, ordem, direcao, agora),
    totalNaFila: naFilaAgora.length,
    comPrazoCurto: contarPrazoCurto(naFilaAgora, agora),
    generos: generosDisponiveis(naFilaAgora),
    vazioPorFiltro: filtrados.length === 0 && naFilaAgora.length > 0,
    agora,
  };
}

export type DetalheDoItem = {
  readonly item: ItemDaFila;
  readonly servicos: readonly ServicoContratado[];
  readonly status: ReturnType<typeof statusNaTela>;
  readonly prazoDeDevolucaoDias: number;
  readonly agora: Date;
};

/** 13.1 · o detalhe. `null` quando o envio não é do curador da sessão. */
export async function lerDetalhe(envioId: string): Promise<DetalheDoItem | null> {
  const item = await buscarItem(envioId);
  if (item === null) return null;

  const [servicos, prazoDevolucaoDias] = await Promise.all([
    servicosDoEnvio(envioId),
    lerConfiguracao('prazo_devolucao_dias'),
  ]);

  const agora = new Date();

  return {
    item,
    servicos,
    status: statusNaTela(item, agora),
    prazoDeDevolucaoDias: prazoDevolucaoDias,
    agora,
  };
}
