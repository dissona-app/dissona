/**
 * A guarda de rota do painel administrativo.
 *
 * As rotas do painel são limpas e reais (`/entrar`, `/equipe`, `/pacotes`),
 * mas a matriz de acesso é a mesma do produto — `decidirAcesso`, no pacote —,
 * que raciocina sobre o caminho **interno** (`/admin/equipe`). Esta função só
 * traduz: o caminho entra interno, o destino sai limpo, e o que não é do
 * painel vai para o site.
 *
 * Pura, como `decidirAcesso`: testável sem servidor.
 */

import type { ContextoDeAcesso } from '@dissona/nucleo/lib/guarda-rota';
import { decidirAcesso, ROTA } from '@dissona/nucleo/lib/guarda-rota';
import { ehCaminhoDoAdmin, paraExterno, paraInterno } from '@dissona/nucleo/lib/rotas-admin';

export type ContextoDoPainel = ContextoDeAcesso & {
  /** A query da requisição, com o `?` (ou vazia). */
  readonly busca: string;
  /** `https://dissona.com.br` — para onde vai o que não é do painel. */
  readonly urlDoSite: string;
};

export type DecisaoDoPainel =
  | { readonly tipo: 'seguir' }
  | {
      readonly tipo: 'redirecionar';
      /** Caminho no próprio painel, ou URL absoluta no site. */
      readonly para: string;
      readonly permanente: boolean;
    };

const seguir: DecisaoDoPainel = { tipo: 'seguir' };

/** Telas do produto que o painel também serve, com a sessão dele. */
const TELAS_COMPARTILHADAS: readonly string[] = [
  ROTA.ONBOARDING,
  ROTA.VERIFICAR_EMAIL,
  ROTA.API_AUTH_CONFIRMAR,
];

/** Páginas que só o site tem — o painel não as duplica. */
const SO_NO_SITE: readonly string[] = [ROTA.TERMOS, ROTA.PRIVACIDADE];

function semQuery(caminho: string): string {
  const corte = caminho.search(/[?#]/);
  return corte === -1 ? caminho : caminho.slice(0, corte);
}

function doPainel(destino: string): boolean {
  const trecho = semQuery(destino);
  return ehCaminhoDoAdmin(trecho) || TELAS_COMPARTILHADAS.includes(trecho);
}

/** O destino interno, na forma limpa — inclusive o `?proximo=`. */
export function limpo(destino: string): string {
  const externo = paraExterno(destino, '');
  const indice = externo.indexOf('?');
  if (indice === -1) return externo;

  const parametros = new URLSearchParams(externo.slice(indice + 1));
  const proximo = parametros.get('proximo');
  if (proximo === null || !ehCaminhoDoAdmin(proximo)) return externo;

  parametros.set('proximo', paraExterno(proximo, ''));
  return `${externo.slice(0, indice)}?${parametros.toString()}`;
}

export function decidirNoPainel(contexto: ContextoDoPainel): DecisaoDoPainel {
  const { caminho, busca, urlDoSite } = contexto;

  if (caminho.startsWith('/api/') && caminho !== ROTA.API_AUTH_CONFIRMAR) return seguir;

  // Endereço antigo (`/admin/equipe`) aberto no painel: corrige.
  if (ehCaminhoDoAdmin(caminho)) {
    return { tipo: 'redirecionar', para: `${limpo(caminho)}${busca}`, permanente: true };
  }

  if (SO_NO_SITE.includes(caminho)) {
    return { tipo: 'redirecionar', para: `${urlDoSite}${caminho}${busca}`, permanente: true };
  }

  const interno = paraInterno(caminho, '');
  const decisao = decidirAcesso({ ...contexto, caminho: interno });
  if (decisao.tipo === 'seguir') return seguir;

  const para = doPainel(decisao.para) ? limpo(decisao.para) : `${urlDoSite}${decisao.para}`;
  return { tipo: 'redirecionar', para, permanente: false };
}
