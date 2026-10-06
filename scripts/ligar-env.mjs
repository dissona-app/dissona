/**
 * Liga o `.env.local` da raiz a cada app (`apps/*\/.env.local` → `../../.env.local`).
 *
 * O Next só lê o `.env*` da pasta do app, e o monorepo tem **um** arquivo de
 * ambiente, na raiz — o mesmo que o Playwright e os scripts leem. Um link em
 * cada app mantém uma fonte só, sem cópia para dessincronizar.
 *
 * Roda no `postinstall`. Sem `.env.local` na raiz (o CI, a Vercel), não faz
 * nada: lá as variáveis vêm do ambiente. Um `.env.local` de verdade dentro do
 * app é respeitado — o link só é criado onde não há arquivo.
 */

import { existsSync, lstatSync, readdirSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = '.env.local';

if (!existsSync(RAIZ)) process.exit(0);

for (const app of readdirSync('apps')) {
  const alvo = join('apps', app, '.env.local');
  let existe = false;
  try {
    lstatSync(alvo);
    existe = true;
  } catch {
    // não existe
  }
  if (existe) continue;
  symlinkSync(join('..', '..', RAIZ), alvo);
  console.log(`✓ ${alvo} → ../../${RAIZ}`);
}
