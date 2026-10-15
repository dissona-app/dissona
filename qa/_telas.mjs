import { chromium } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
const OUT = process.argv[2];
mkdirSync(OUT, { recursive: true });
const contas = JSON.parse(readFileSync('qa/resultado/local-2/contas.json', 'utf8'));
const base = 'http://localhost:3000',
  painel = 'http://admin.localhost:3001';
const b = await chromium.launch();
async function sessao(url, c, telas, prefixo) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(
    url +
      (prefixo === 'admin'
        ? '/entrar'
        : `/${prefixo === 'curador' ? 'curador' : 'artista'}/entrar`),
  );
  await p.getByLabel('E-mail', { exact: true }).fill(c.email);
  await p.getByLabel('Senha', { exact: true }).fill(c.senha);
  await p.getByRole('button', { name: /^Entrar$/ }).click();
  await p.waitForURL((u) => !u.pathname.endsWith('/entrar'), { timeout: 30000 }).catch(() => {});
  for (const t of telas) {
    try {
      await p.goto(url + t, { timeout: 60000 });
      await p.waitForTimeout(1500);
      await p.screenshot({
        path: `${OUT}/${prefixo}${t.replaceAll('/', '_')}.png`,
        fullPage: process.env.FULL !== '0',
      });
      console.log('ok', prefixo, t);
    } catch (e) {
      console.log('ERRO', prefixo, t, e.message.split('\n')[0]);
    }
  }
  await ctx.close();
}
const alvo = process.argv[3] ?? 'todos';
const extras = process.argv.slice(4);
if (alvo === 'todos' || alvo === 'artista')
  await sessao(
    base,
    contas.artista,
    extras.length
      ? extras
      : ['/artista/carteira', '/artista/pacotes', '/artista/enviar', '/artista/conta'],
    'artista',
  );
if (alvo === 'todos' || alvo === 'curador')
  await sessao(
    base,
    contas.curador,
    extras.length
      ? extras
      : ['/curador/fila', '/curador/carteira', '/curador/meu-cadastro', '/curador/conta'],
    'curador',
  );
if (alvo === 'todos' || alvo === 'admin')
  await sessao(
    painel,
    contas.admin,
    extras.length ? extras : ['/', '/pacotes', '/pacotes/novo', '/equipe'],
    'admin',
  );
await b.close();
