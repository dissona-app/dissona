import { chromium } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
const [amb, props, alvo] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(pathToFileURL(join(process.cwd(), 'docs/prototipo-aprovado', `${amb}.html`)).href);
await p.locator('h1').first().waitFor();
await p.evaluate(
  (v) => window.__dcSetProps(Object.keys(window.__dcRegistry)[0], JSON.parse(v)),
  props,
);
await p.waitForTimeout(1200);
const out = await p.evaluate((alvo) => {
  const raiz =
    alvo === 'nav'
      ? (document.querySelector('nav') ?? document.querySelector('aside'))
      : alvo === 'header'
        ? document.querySelector('h1').closest('div').parentElement.parentElement
        : alvo === 'body'
          ? document.body
          : (document.querySelector('main') ?? document.body);
  const linhas = [];
  const walk = (e, d) => {
    if (d > 12) return;
    const c = getComputedStyle(e);
    const r = e.getBoundingClientRect();
    if (r.width === 0) return;
    const txt = [...e.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join('')
      .slice(0, 30);
    const props = [];
    if (c.backgroundColor !== 'rgba(0, 0, 0, 0)') props.push('bg ' + c.backgroundColor);
    if (c.borderTopWidth !== '0px' || c.borderBottomWidth !== '0px')
      props.push('bd ' + c.borderTopWidth + ' ' + c.borderTopColor + ' /b ' + c.borderBottomWidth);
    if (c.borderRadius !== '0px') props.push('rad ' + c.borderRadius);
    if (c.padding !== '0px') props.push('pad ' + c.padding);
    if (c.gap !== 'normal') props.push('gap ' + c.gap);
    if (txt) props.push(`"${txt}" ${c.fontSize}/${c.fontWeight} ${c.color} ls ${c.letterSpacing}`);
    linhas.push(
      '  '.repeat(d) +
        e.tagName.toLowerCase() +
        ` [${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}] ` +
        props.join(' | '),
    );
    if (e.tagName === 'svg') {
      linhas[linhas.length - 1] +=
        ' stroke ' +
        c.stroke +
        ' sw ' +
        e.getAttribute('stroke-width') +
        ' vb ' +
        e.getAttribute('viewBox');
      return;
    }
    [...e.children].forEach((f) => walk(f, d + 1));
  };
  walk(raiz, 0);
  return linhas.join('\n');
}, alvo);
console.log(out);
await b.close();
