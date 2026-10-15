import type { EnvioDaFaixaNaLista, FaixaNaVitrine } from './repositorio';

/**
 * Regra da vitrine do perfil (7.1) — pura, e por isso testável sem banco.
 */

/** O status que a vitrine mostra, derivado da contagem de envios prontos. */
export type StatusNaVitrine =
  | { readonly chave: 'sem_envio' }
  | { readonly chave: 'em_analise' }
  | { readonly chave: 'lida' }
  | { readonly chave: 'lida_por'; readonly quantos: number };

/**
 * `trackData`/`tracks` do protótipo: "Lida", "Lida por 2", "Em análise".
 *
 * `sem_envio` não existe no protótipo porque lá toda faixa do mock já foi
 * enviada. Aqui existe: uma faixa em rascunho, que o artista começou e não
 * mandou, é o estado mais comum de uma conta nova.
 */
export function statusDaFaixa(faixa: FaixaNaVitrine): StatusNaVitrine {
  if (faixa.envios === 0) return { chave: 'sem_envio' };
  if (faixa.leiturasConcluidas === 0) return { chave: 'em_analise' };
  if (faixa.leiturasConcluidas === 1) return { chave: 'lida' };
  return { chave: 'lida_por', quantos: faixa.leiturasConcluidas };
}

/**
 * "Faixas" da vitrine: as que foram **para curadoria**, não as do catálogo.
 *
 * O rótulo do protótipo é explícito — "Enviadas para curadoria" —, então
 * rascunho não conta. Contá-lo faria o número subir ao abrir um envio e nunca
 * mais descer.
 */
export function faixasEnviadas(faixas: readonly FaixaNaVitrine[]): number {
  return faixas.filter((faixa) => faixa.envios > 0).length;
}

/** "Leituras": curadorias concluídas, somadas em todas as faixas. */
export function leiturasConcluidas(faixas: readonly FaixaNaVitrine[]): number {
  return faixas.reduce((total, faixa) => total + faixa.leiturasConcluidas, 0);
}

/* ------------------------------------------------- minhas faixas (3.4) --- */

/** As abas de "Minhas faixas", na ordem do protótipo aprovado. */
export const SITUACOES_DA_LISTA = [
  'na_fila',
  'em_avaliacao',
  'atrasada',
  'concluida',
  'devolvida',
] as const;
export type SituacaoNaLista = (typeof SITUACOES_DA_LISTA)[number];

const ATIVOS = new Set<EnvioDaFaixaNaLista['situacao']>(['recebeu', 'ouviu', 'avaliando']);

/**
 * A situação de uma faixa enviada, pelos envios dela (um por curador).
 *
 * - todos devolvidos → `devolvida` (a Clave voltou);
 * - nenhum em aberto e algum pronto → `concluida`;
 * - algum em aberto com o prazo vencido → `atrasada`;
 * - algum curador já ouviu → `em_avaliacao`;
 * - senão → `na_fila`.
 */
export function situacaoNaLista(
  envios: readonly EnvioDaFaixaNaLista[],
  agora: Date,
): SituacaoNaLista {
  const validos = envios.filter((envio) => envio.situacao !== 'cancelado');
  const abertos = validos.filter((envio) => ATIVOS.has(envio.situacao));
  if (validos.length > 0 && validos.every((envio) => envio.situacao === 'devolvido')) {
    return 'devolvida';
  }
  if (abertos.length === 0) return 'concluida';
  if (abertos.some((envio) => new Date(envio.prazoEm).getTime() < agora.getTime())) {
    return 'atrasada';
  }
  if (abertos.some((envio) => envio.situacao !== 'recebeu')) return 'em_avaliacao';
  return 'na_fila';
}

/**
 * Até onde a leitura chegou, de 1 a 4 (recebeu, ouviu, avaliando, pronto) — as
 * quatro barras do "Em andamento". É a etapa do curador mais adiantado entre
 * os que ainda não terminaram.
 */
export function etapaDaLeitura(envios: readonly EnvioDaFaixaNaLista[]): 1 | 2 | 3 | 4 {
  const abertos = envios.filter((envio) => ATIVOS.has(envio.situacao));
  if (abertos.length === 0) return 4;
  if (abertos.some((envio) => envio.situacao === 'avaliando')) return 3;
  if (abertos.some((envio) => envio.situacao === 'ouviu')) return 2;
  return 1;
}
