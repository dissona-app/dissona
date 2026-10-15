import { chromium } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
const telas = {
  Artista: [
    'Configurações',
    'Perfil',
    'Editar cadastro',
    'Carteira',
    'Enviar',
    'Status de envio',
    'Curadores',
    'Minhas faixas',
    'Início',
  ],
  Curador: ['Fila', 'Avaliação', 'Meu perfil', 'Conta e configurações', 'Financeiro', 'Painel'],
  Admin: ['Pacotes de Claves', 'Conta e equipe', 'Painel', 'Curadores e artistas'],
};
const b = await chromium.launch();
for (const [amb, lista] of Object.entries(telas)) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(pathToFileURL(join(process.cwd(), 'docs/prototipo-aprovado', `${amb}.html`)).href);
  await p.locator('h1').first().waitFor();
  for (const t of lista) {
    await p.evaluate(
      (v) => window.__dcSetProps(Object.keys(window.__dcRegistry)[0], { telaInicial: v }),
      t,
    );
    await p.waitForTimeout(700);
    const r = await p.evaluate(() => {
      const h = document.querySelector('header h1');
      if (!h) return null;
      const bloco = h.parentElement;
      return [...bloco.querySelectorAll('span, h1, p')]
        .filter((e) => e.children.length === 0)
        .map((e) => e.textContent.trim())
        .filter(Boolean)
        .join(' | ');
    });
    console.log(`${amb} · ${t} => ${r}`);
  }
  await p.close();
}
await b.close();
