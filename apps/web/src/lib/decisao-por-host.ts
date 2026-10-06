/**
 * A guarda de rota com o host na conta — o que o middleware aplica.
 *
 * `decidirAcesso` continua raciocinando só sobre o caminho **interno**
 * (`/admin/equipe`). Esta camada fica em volta dela e resolve o resto:
 *
 * - no subdomínio do admin, traduz o caminho limpo para o interno antes de
 *   decidir, e devolve **reescrita** em vez de "seguir";
 * - traduz de volta todo destino de redirecionamento, inclusive o `?proximo=`;
 * - manda para o outro host o que não pertence a este — o artista que caiu em
 *   `admin.` volta ao site principal, e, com o subdomínio ligado, o `/admin`
 *   do site principal vai para `admin.`.
 *
 * Pura, como `decidirAcesso`: a matriz inteira é testável sem servidor.
 */

import type { ContextoDeAcesso } from '@dissona/nucleo/lib/guarda-rota';
import { decidirAcesso } from '@dissona/nucleo/lib/guarda-rota';
import {
  ehCaminhoDoAdmin,
  ehHostDoAdmin,
  hostDoAdmin,
  hostPrincipal,
  paraExterno,
  paraInterno,
  passaDiretoNoHostDoAdmin,
} from '@dissona/nucleo/lib/rotas-admin';

export type ContextoDoHost = ContextoDeAcesso & {
  readonly host: string;
  /** A query da requisição, com o `?` (ou vazia). Vai junto nos 308. */
  readonly busca: string;
  /** `ADMIN_EM_SUBDOMINIO=true`: o host principal manda o `/admin` para `admin.`. */
  readonly subdominioLigado: boolean;
  /**
   * O host do painel administrativo, quando ele é um deploy próprio
   * (`apps/admin`, `NEXT_PUBLIC_URL_ADMIN`). Sem ele, `admin.<host>`.
   */
  readonly hostDoPainel?: string;
};

export type DecisaoNoHost =
  | { readonly tipo: 'seguir' }
  | { readonly tipo: 'reescrever'; readonly caminho: string }
  | {
      readonly tipo: 'redirecionar';
      /** Caminho com query. */
      readonly para: string;
      /** Outro host; ausente quando o destino é no mesmo. */
      readonly host?: string;
      /** 308 para os endereços que mudaram de lugar; 307 para a guarda. */
      readonly permanente: boolean;
    };

const seguir: DecisaoNoHost = { tipo: 'seguir' };

/** No destino que vai para o subdomínio, o `?proximo=` também perde o `/admin`. */
function externoComProximo(destino: string): string {
  const externo = paraExterno(destino, '');
  const indice = externo.indexOf('?');
  if (indice === -1) return externo;

  const parametros = new URLSearchParams(externo.slice(indice + 1));
  const proximo = parametros.get('proximo');
  if (proximo === null || !ehCaminhoDoAdmin(proximo)) return externo;

  parametros.set('proximo', paraExterno(proximo, ''));
  return `${externo.slice(0, indice)}?${parametros.toString()}`;
}

/** Para onde vai um destino da guarda, visto de cada host. */
function traduzir(destino: string, contexto: ContextoDoHost): DecisaoNoHost {
  const noAdmin = ehHostDoAdmin(contexto.host);
  const doAdmin = ehCaminhoDoAdmin(destino);

  if (noAdmin) {
    if (doAdmin || passaDiretoNoHostDoAdmin(destino)) {
      return { tipo: 'redirecionar', para: externoComProximo(destino), permanente: false };
    }
    return {
      tipo: 'redirecionar',
      para: destino,
      host: hostPrincipal(contexto.host),
      permanente: false,
    };
  }

  if (doAdmin && contexto.subdominioLigado) {
    return {
      tipo: 'redirecionar',
      para: externoComProximo(destino),
      host: contexto.hostDoPainel ?? hostDoAdmin(contexto.host),
      permanente: false,
    };
  }
  return { tipo: 'redirecionar', para: destino, permanente: false };
}

/** No destino que vai para o painel, o `?proximo=` também perde o `/admin`. */
export { externoComProximo as paraExternoComProximo };

export function decidirNoHost(contexto: ContextoDoHost): DecisaoNoHost {
  const { caminho, busca, host, subdominioLigado } = contexto;

  if (ehHostDoAdmin(host)) {
    // Link interno esquecido (`/admin/equipe`) no subdomínio: corrige o
    // endereço em vez de servir `/admin/admin/equipe`.
    if (ehCaminhoDoAdmin(caminho)) {
      return {
        tipo: 'redirecionar',
        para: `${paraExterno(caminho, '')}${busca}`,
        permanente: true,
      };
    }

    const interno = paraInterno(caminho, '');
    const decisao = decidirAcesso({ ...contexto, caminho: interno });
    if (decisao.tipo === 'redirecionar') return traduzir(decisao.para, contexto);
    return interno === caminho ? seguir : { tipo: 'reescrever', caminho: interno };
  }

  // Host principal com o subdomínio ligado: o admin mora em outro endereço.
  if (subdominioLigado && ehCaminhoDoAdmin(caminho)) {
    return {
      tipo: 'redirecionar',
      para: `${paraExterno(caminho, '')}${busca}`,
      host: contexto.hostDoPainel ?? hostDoAdmin(host),
      permanente: true,
    };
  }

  const decisao = decidirAcesso(contexto);
  return decisao.tipo === 'redirecionar' ? traduzir(decisao.para, contexto) : seguir;
}
