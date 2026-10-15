import { chromium } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
const b = await chromium.launch();
for (const [amb, tela] of [
  ['Artista', 'Configurações'],
  ['Curador', 'Fila'],
  ['Admin', 'Conta e equipe'],
]) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(pathToFileURL(join(process.cwd(), 'docs/prototipo-aprovado', `${amb}.html`)).href);
  await p.locator('h1').first().waitFor();
  await p.evaluate(
    (v) => window.__dcSetProps(Object.keys(window.__dcRegistry)[0], { telaInicial: v }),
    tela,
  );
  await p.waitForTimeout(1200);
  const r = await p.evaluate(() => {
    const nav = document.querySelector('nav');
    const aside = nav.parentElement;
    const itens = [...nav.querySelectorAll('button')].map((bt) => ({
      rotulo: bt.textContent.trim(),
      svg: bt.querySelector('svg')?.innerHTML.replace(/\s+/g, ' ').trim(),
    }));
    // tudo da lateral fora do nav
    const fora = [...aside.children]
      .filter((c) => c !== nav)
      .map((c) => c.outerHTML.replace(/\s+/g, ' ').slice(0, 2500));
    const cs = getComputedStyle(aside);
    return { asidePad: cs.padding, asideW: aside.getBoundingClientRect().width, itens, fora };
  });
  console.log('=====', amb, JSON.stringify(r, null, 1));
  await p.close();
}
await b.close();
