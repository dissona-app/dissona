/**
 * O painel administrativo é um app próprio (`apps/admin`).
 *
 * Local, a suíte o sobe em `admin.localhost:3101` (`playwright.config.ts`): o
 * `admin.` separa os cookies de sessão do site, porque cookie não distingue
 * porta — e o Chromium resolve `*.localhost` sem configuração. Contra
 * produção, `BASE_URL_ADMIN` (`https://painel.dissona.com.br`).
 *
 * Os specs continuam escrevendo o caminho **interno** (`/admin/equipe`), o
 * mesmo de `ROTA`: quem traduz para a rota limpa do painel é `noAdmin`. Assim
 * o teste diz qual tela abre, e não como o endereço dela é soletrado.
 */

import { ehCaminhoDoAdmin, paraExterno } from '@dissona/nucleo/lib/rotas-admin';

function urlDoPainel(): string {
  const explicita = process.env.BASE_URL_ADMIN;
  if (explicita !== undefined && explicita !== '') return explicita.replace(/\/$/, '');

  const base = process.env.BASE_URL;
  if (base === undefined || base === '') return 'http://admin.localhost:3101';

  // Fora do local o painel não segue um padrão de host (em produção é
  // `painel.dissona.com.br`): o endereço tem de vir explícito.
  throw new Error(
    'BASE_URL_ADMIN não está definida. Contra um ambiente remoto, informe o painel junto: ' +
      'BASE_URL=https://dissona.com.br BASE_URL_ADMIN=https://painel.dissona.com.br pnpm e2e',
  );
}

/** `http://admin.localhost:3101`, sem barra final. */
export const URL_ADMIN = urlDoPainel();

export const HOST_ADMIN = new URL(URL_ADMIN).host;

/** Caminho interno (`/admin/equipe?aba=dados`) → URL absoluta no painel. */
export function noAdmin(caminhoInterno: string): string {
  return `${URL_ADMIN}${paraExterno(caminhoInterno, '')}`;
}

function escapar(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * A URL de uma tela do painel, para `toHaveURL`/`waitForURL`: o caminho limpo
 * no host do painel, seguido de query ou de nada.
 */
export function telaDoAdmin(
  caminhoLimpo: string,
  opcoes: { readonly exato?: boolean } = {},
): RegExp {
  const fim = opcoes.exato === true ? '$' : '(\\?|#|$)';
  return new RegExp(`^${escapar(URL_ADMIN)}${escapar(caminhoLimpo)}${fim}`);
}

/**
 * Para tabelas de cenário que misturam ambientes: caminho do admin vai ao
 * painel, o resto segue relativo ao `baseURL`.
 */
export function enderecoDe(caminhoInterno: string): string {
  return ehCaminhoDoAdmin(caminhoInterno) ? noAdmin(caminhoInterno) : caminhoInterno;
}
