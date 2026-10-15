import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
const OUT = process.argv[2];
const contas = JSON.parse(readFileSync('qa/resultado/local-2/contas.json', 'utf8'));
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto('http://localhost:3000/artista/entrar');
await p.getByLabel('E-mail', { exact: true }).fill(contas.artista.email);
await p.getByLabel('Senha', { exact: true }).fill(contas.artista.senha);
await p.getByRole('button', { name: /^Entrar$/ }).click();
await p.waitForURL((u) => !u.pathname.endsWith('/entrar'), { timeout: 30000 }).catch(() => {});
await p.goto('http://localhost:3000/artista/enviar');
await p.getByLabel('Spotify').fill('https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT');
await p.getByRole('button', { name: 'Detectar faixa' }).click();
await p
  .getByText('Faixa encontrada')
  .waitFor({ timeout: 20000 })
  .catch((e) => console.log('sem deteccao', e.message.split('\n')[0]));
await p.waitForTimeout(800);
await p.screenshot({ path: `${OUT}/detectada.png`, fullPage: false });
await p.mouse.wheel(0, 300);
await p.waitForTimeout(400);
await p.screenshot({ path: `${OUT}/detectada2.png`, fullPage: false });
await b.close();
console.log('ok');
