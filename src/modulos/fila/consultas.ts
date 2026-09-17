import 'server-only';

/** Leituras da fila (13) e do detalhe (13.1). */

import { lerConfiguracoes } from '@/lib/configuracao';
import { buscarRascunho, urlDoAudio } from '@/modulos/avaliacao/repositorio';

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
  /** URL assinada do áudio, ou `null` quando não há arquivo que o player toque. */
  readonly audioUrl: string | null;
  readonly escutaMinimaPercentual: number;
  /** O máximo já medido, de `avaliacao.escuta_percentual` — zero sem rascunho. */
  readonly escutaSalva: number;
  readonly agora: Date;
};

/** 13.1 · o detalhe. `null` quando o envio não é do curador da sessão. */
export async function lerDetalhe(envioId: string): Promise<DetalheDoItem | null> {
  const item = await buscarItem(envioId);
  if (item === null) return null;

  // RF-071: a escuta acontece **aqui**, antes de assumir a avaliação. Entrar no
  // wizard grava `avaliando`, e enquanto o único player vivia lá dentro o
  // estado `ouviu` era inalcançável — `marcarEnvioComoOuvido` existia e nunca
  // disparava.
  const [servicos, config, audioUrl, rascunho] = await Promise.all([
    servicosDoEnvio(envioId),
    lerConfiguracoes(['prazo_devolucao_dias', 'escuta_minima_percentual'] as const),
    urlDoAudio(item.arquivoCaminho),
    buscarRascunho(envioId),
  ]);

  const agora = new Date();

  return {
    item,
    servicos,
    status: statusNaTela(item, agora),
    prazoDeDevolucaoDias: config.prazo_devolucao_dias,
    audioUrl,
    escutaMinimaPercentual: config.escuta_minima_percentual,
    escutaSalva: rascunho?.escutaPercentual ?? 0,
    agora,
  };
}
