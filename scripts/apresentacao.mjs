/**
 * Sobe os dois apps em modo produção na máquina local — para apresentar o
 * produto quando a hospedagem não está disponível.
 *
 *   pnpm apresentacao              # build + start
 *   pnpm apresentacao --sem-build  # só start, reaproveitando o último build
 *
 * Site em http://localhost:4000, painel em http://admin.localhost:4001. Portas
 * próprias para não colidir com outro projeto na 3000; o `admin.` separa os
 * cookies de sessão dos dois apps, como em produção (cookie não distingue
 * porta). Os dois falam com o mesmo Supabase do `.env.local`.
 *
 * É build de produção (`next build` + `next start`), e não `next dev`: sem
 * compilação sob demanda, sem o indicador do Next na tela, e com os mesmos
 * tempos que a pessoa veria no site publicado.
 *
 * As URLs cruzadas (o `/admin` antigo do site leva ao painel; Termos e
 * Privacidade do painel levam ao site) são `NEXT_PUBLIC_*`, embutidas no build
 * — por isso o build daqui é próprio, e não o dos testes.
 */

import { spawn, spawnSync } from 'node:child_process';

const SITE = { porta: 4000, url: 'http://localhost:4000' };
const PAINEL = { porta: 4001, url: 'http://admin.localhost:4001' };

const ambiente = {
  ...process.env,
  NEXT_PUBLIC_URL_SITE: SITE.url,
  NEXT_PUBLIC_URL_ADMIN: PAINEL.url,
  // O `/admin` antigo do site redireciona para o painel.
  ADMIN_EM_SUBDOMINIO: 'true',
};

function rodar(app, args) {
  const resultado = spawnSync('pnpm', ['--filter', app, ...args], {
    stdio: 'inherit',
    env: ambiente,
  });
  if (resultado.status !== 0) {
    console.error(`\n✖ ${app}: \`${args.join(' ')}\` falhou.`);
    process.exit(resultado.status ?? 1);
  }
}

if (!process.argv.includes('--sem-build')) {
  console.log('▶ Build de produção do site e do painel…\n');
  rodar('@dissona/web', ['next:build']);
  rodar('@dissona/admin', ['next:build']);
}

const processos = [
  spawn(
    'pnpm',
    ['--filter', '@dissona/web', 'exec', 'next', 'start', '--port', String(SITE.porta)],
    {
      stdio: 'inherit',
      env: ambiente,
    },
  ),
  spawn(
    'pnpm',
    ['--filter', '@dissona/admin', 'exec', 'next', 'start', '--port', String(PAINEL.porta)],
    {
      stdio: 'inherit',
      env: ambiente,
    },
  ),
];

console.log(`
✓ Dissona no ar, em modo produção:
    Site (artista e curador)   ${SITE.url}/artista/entrar
                               ${SITE.url}/curador/entrar
    Painel administrativo      ${PAINEL.url}/entrar

  Ctrl+C encerra os dois.
`);

function encerrar() {
  for (const processo of processos) processo.kill('SIGTERM');
  process.exit(0);
}
process.on('SIGINT', encerrar);
process.on('SIGTERM', encerrar);
for (const processo of processos) {
  processo.on('exit', (codigo) => {
    if (codigo !== 0 && codigo !== null) {
      console.error(`\n✖ Um dos apps parou (código ${codigo}). Encerrando o outro.`);
      encerrar();
    }
  });
}
