import type { FaixaNaVitrine } from './repositorio';

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
