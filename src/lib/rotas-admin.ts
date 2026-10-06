/**
 * O admin em subdomínio próprio — `admin.dissona.com.br/equipe`, e não
 * `dissona.com.br/admin/equipe`.
 *
 * Os arquivos **não** saíram de `(admin)/.../admin/*`: o caminho interno
 * continua `/admin/...`, e o middleware reescreve o caminho limpo que o
 * navegador vê para ele. É o que preserva a guarda de rota (`decidirAcesso`
 * raciocina sobre o interno), os `revalidatePath` (que pedem o caminho de
 * destino de um rewrite) e os route groups.
 *
 * O preço é uma regra só, e este arquivo existe para que ela tenha um lugar:
 * **toda URL do admin que sai para o navegador passa por `paraExterno`** — link,
 * `redirect`, `router.push`, `?proximo=` e link de e-mail. `ROTA.ADMIN*` cru
 * num `href` funciona no modo caminho e quebra no subdomínio (o middleware o
 * corrige com um 308, mas é rede de segurança, não caminho).
 *
 * ## Dois modos, decididos pelo host
 *
 * - **Subdomínio** — o host começa com `admin.` (`admin.dissona.com.br`,
 *   `admin.localhost:3000`). Base `''`: `/admin/equipe` vira `/equipe`.
 * - **Caminho** — qualquer outro host. Base `/admin`, e nada muda. É o modo dos
 *   Previews da Vercel, cujo domínio por branch não tem subdomínio.
 *
 * Função pura, sem `next/headers`: roda no middleware, no servidor e no
 * cliente. A leitura do host fica em `rotas-admin-servidor.ts` e no provedor
 * de `componentes/admin/BaseDoAdmin.tsx`.
 */

/** O prefixo interno de todo o ambiente administrativo — o mesmo de `ROTA.ADMIN`. */
export const PREFIXO_ADMIN = '/admin';

const PREFIXO_DO_HOST = 'admin.';

export type BaseDoAdmin = '' | typeof PREFIXO_ADMIN;

/**
 * Caminhos que, no subdomínio, **não** são do admin e não são reescritos.
 *
 * - `/api` — callback do OAuth, confirmação de e-mail (a recuperação de senha
 *   do admin volta por ali) e webhook.
 * - `/termos` e `/privacidade` — o rodapé das telas de acesso do admin.
 * - `/onboarding` e `/verificar-email` — o menu da conta leva o admin para lá,
 *   e a sessão dele só existe neste host: os cookies do Supabase são por host.
 */
const PASSA_DIRETO: readonly string[] = [
  '/api',
  '/termos',
  '/privacidade',
  '/onboarding',
  '/verificar-email',
];

function ehOuEstaSob(caminho: string, prefixo: string): boolean {
  return caminho === prefixo || caminho.startsWith(`${prefixo}/`);
}

/** Separa `/a/b?x=1#y` em `['/a/b', '?x=1#y']`. */
function separar(url: string): readonly [string, string] {
  const corte = url.search(/[?#]/);
  return corte === -1 ? [url, ''] : [url.slice(0, corte), url.slice(corte)];
}

function semPorta(host: string): string {
  return host.replace(/:\d+$/, '');
}

export function ehHostDoAdmin(host: string | null | undefined): boolean {
  return host !== null && host !== undefined && semPorta(host).startsWith(PREFIXO_DO_HOST);
}

/**
 * `dissona.com.br` → `admin.dissona.com.br`; `localhost:3000` →
 * `admin.localhost:3000`. O `www.` sai antes: `admin.www.` não existe.
 */
export function hostDoAdmin(host: string): string {
  return ehHostDoAdmin(host) ? host : `${PREFIXO_DO_HOST}${host.replace(/^www\./, '')}`;
}

/** O inverso de `hostDoAdmin`. */
export function hostPrincipal(host: string): string {
  return ehHostDoAdmin(host) ? host.slice(PREFIXO_DO_HOST.length) : host;
}

export function baseDoAdmin(host: string | null | undefined): BaseDoAdmin {
  return ehHostDoAdmin(host) ? '' : PREFIXO_ADMIN;
}

/** O caminho (interno) é do ambiente administrativo? `/administradores` não é. */
export function ehCaminhoDoAdmin(caminho: string): boolean {
  return ehOuEstaSob(separar(caminho)[0], PREFIXO_ADMIN);
}

/** No subdomínio, o caminho fica fora do admin e segue sem reescrita? */
export function passaDiretoNoHostDoAdmin(caminho: string): boolean {
  const [trecho] = separar(caminho);
  if (trecho.startsWith('/_next/')) return true;
  // Arquivo estático do `public/` (`/marca/dissona.png`, `/fontes/x.woff2`).
  if (/\.[a-z0-9]+$/i.test(trecho)) return true;
  return PASSA_DIRETO.some((prefixo) => ehOuEstaSob(trecho, prefixo));
}

/**
 * Interno → o que o navegador vê. Query e fragmento passam intactos.
 *
 * Caminho que não é do admin volta igual, então serve também para destinos
 * que podem ou não ser do admin (o `?proximo=` de um login, por exemplo).
 */
export function paraExterno(caminho: string, base: BaseDoAdmin): string {
  if (base === PREFIXO_ADMIN || !ehCaminhoDoAdmin(caminho)) return caminho;
  const [trecho, resto] = separar(caminho);
  const limpo = trecho.slice(PREFIXO_ADMIN.length);
  return `${limpo === '' ? '/' : limpo}${resto}`;
}

/**
 * O que o navegador vê → interno. Idempotente: um caminho que já é interno
 * volta igual, e o que passa direto no subdomínio também.
 */
export function paraInterno(caminho: string, base: BaseDoAdmin): string {
  if (base === PREFIXO_ADMIN || ehCaminhoDoAdmin(caminho) || passaDiretoNoHostDoAdmin(caminho)) {
    return caminho;
  }
  const [trecho, resto] = separar(caminho);
  return `${PREFIXO_ADMIN}${trecho === '/' ? '' : trecho}${resto}`;
}
