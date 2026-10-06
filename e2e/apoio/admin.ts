/**
 * O admin em subdomínio próprio (`src/lib/rotas-admin.ts`).
 *
 * A suíte sobe o servidor com `ADMIN_EM_SUBDOMINIO=true` (`playwright.config.ts`),
 * então o admin mora em `admin.localhost:3100` — e o Chromium resolve
 * `*.localhost` sem configuração nenhuma. Contra produção, `BASE_URL` é
 * `https://dissona.com.br` e o admin, `https://admin.dissona.com.br`.
 *
 * Os specs continuam escrevendo o caminho **interno** (`/admin/equipe`), que é
 * o mesmo de `ROTA`: quem traduz é `noAdmin`. Assim o teste diz qual tela abre,
 * e não como o endereço dela é soletrado.
 *
 * Os cookies do Supabase são por host: a sessão do admin só vale aqui.
 */

import { ehCaminhoDoAdmin, hostDoAdmin, paraExterno } from '@dissona/nucleo/lib/rotas-admin';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3100';

const base = new URL(BASE_URL);

/** `http://admin.localhost:3100`, sem barra final. */
export const URL_ADMIN = `${base.protocol}//${hostDoAdmin(base.host)}`;

export const HOST_ADMIN = hostDoAdmin(base.host);

/** Caminho interno (`/admin/equipe?aba=dados`) → URL absoluta no subdomínio. */
export function noAdmin(caminhoInterno: string): string {
  return `${URL_ADMIN}${paraExterno(caminhoInterno, '')}`;
}

function escapar(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * A URL de uma tela do admin, para `toHaveURL`/`waitForURL`: o caminho limpo
 * no host do admin, seguido de query ou de nada.
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
 * subdomínio, o resto segue relativo ao `baseURL`.
 */
export function enderecoDe(caminhoInterno: string): string {
  return ehCaminhoDoAdmin(caminhoInterno) ? noAdmin(caminhoInterno) : caminhoInterno;
}
