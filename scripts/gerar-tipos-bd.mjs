#!/usr/bin/env node
/**
 * Gera `src/lib/supabase/tipos-bd.ts`.
 *
 * ## Por que não é mais um `>` no package.json
 *
 * O script era:
 *
 *     supabase gen types typescript --project-id … > src/lib/supabase/tipos-bd.ts
 *
 * O `>` do shell **trunca o arquivo antes de o comando rodar**. Quando a CLI
 * falha — e ela falha sem `SUPABASE_ACCESS_TOKEN`, que não é versionável —, o
 * resultado é `tipos-bd.ts` com uma linha de JSON de erro dentro. O typecheck
 * então quebra em centenas de lugares, e a causa (um token ausente) não aparece
 * em nenhuma das mensagens.
 *
 * Aqui a saída é capturada em memória, conferida, e só então escrita. Falhou,
 * o arquivo anterior continua intacto e a mensagem diz o que fazer.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const PROJETO = 'fhqcibjzmowcjkdrqyvi';
const DESTINO = 'apps/web/src/lib/supabase/tipos-bd.ts';

function falhar(mensagem) {
  console.error(`\n✖ ${mensagem}\n`);
  console.error('  O arquivo atual foi preservado — nada foi sobrescrito.\n');
  process.exit(1);
}

if (!process.env['SUPABASE_ACCESS_TOKEN']) {
  falhar(
    'SUPABASE_ACCESS_TOKEN não está definida.\n' +
      '  Gere um token em https://supabase.com/dashboard/account/tokens e exporte-a,\n' +
      '  ou rode `npx supabase login` antes.',
  );
}

let saida;
try {
  saida = execFileSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['supabase', 'gen', 'types', 'typescript', '--project-id', PROJETO],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
  );
} catch (erro) {
  falhar(`A CLI do Supabase falhou:\n  ${erro.stderr || erro.message}`);
}

// A CLI devolve JSON de erro com status 0 em alguns casos — conferir a forma do
// que veio é o que separa "tipos" de "mensagem de erro".
if (!saida.includes('export type Database')) {
  falhar(`A saída não parece um arquivo de tipos:\n  ${saida.slice(0, 200)}`);
}

const anterior = (() => {
  try {
    return readFileSync(DESTINO, 'utf8');
  } catch {
    return null;
  }
})();

if (anterior === saida) {
  console.log('✓ tipos-bd.ts já está atualizado.');
  process.exit(0);
}

writeFileSync(DESTINO, saida, 'utf8');
console.log(`✓ ${DESTINO} regenerado (${saida.split('\n').length} linhas).`);
