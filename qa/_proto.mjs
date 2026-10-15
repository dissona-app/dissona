// Print de uma tela do protótipo aprovado na mesma viewport do app (1440×900).
// Uso: node qa/_proto.mjs <saida.png> <Artista|Curador|Admin> '<json de props>'
import { chromium } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
const [saida, amb, props] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(pathToFileURL(join(process.cwd(), 'docs/prototipo-aprovado', `${amb}.html`)).href);
await p.locator('h1').first().waitFor();
await p.evaluate((v) => {
  const r = window;
  r.__dcSetProps(Object.keys(r.__dcRegistry)[0], JSON.parse(v));
}, props);
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(1200);
await p.mouse.move(2, 2);
await p.screenshot({ path: saida });
await b.close();
