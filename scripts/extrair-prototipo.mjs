/**
 * Extrai o markup e a copy dos protótipos da R2.
 *
 * Os três arquivos de `docs/R2/*.html` parecem binários, mas não são: cada um
 * é uma página React empacotada em que **todo o markup vive numa única linha**,
 * como uma string JSON. A linha é a segunda maior do arquivo — a maior é o
 * manifest de imagens em base64, que não interessa aqui.
 *
 * Isso importa porque o protótipo é a fonte de verdade do design
 * (AGENTS.md: "protótipo da R2 > board de discovery > derivação"), e ele é
 * legível por máquina. Portar tela é ler daqui, não olhar screenshot:
 *
 * - `.html` — markup com o estilo literal inline (`style`, `style-hover`,
 *   `style-focus`, `style-active`) e o JavaScript com o estado e os cálculos.
 * - `.txt`  — só o texto visível: a fonte de todo rótulo, placeholder, nota de
 *   rodapé e texto de modal. É o que alimenta `e2e/apoio/textos.ts`.
 *
 * A saída é **derivada** e fica fora do controle de versão. Rode
 * `pnpm prototipo` quando precisar dela.
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const ORIGEM = 'docs/R2';
const DESTINO = 'docs/R2/extraido';

/** `Dissona - Ambiente Curador - Release 2.html` → `Curador`. */
function nomeDoAmbiente(arquivo) {
  const casado = /Ambiente (\w+)/.exec(basename(arquivo));
  return casado === null ? basename(arquivo, '.html') : casado[1];
}

/**
 * A linha do payload.
 *
 * Não dá para fixar o número da linha: é 393 no Admin e no Artista, e 394 no
 * Curador. O que é estável é a posição no ranking de comprimento — a maior
 * linha é sempre o manifest de imagens, e a seguinte é o markup.
 */
function linhaDoPayload(conteudo) {
  const porTamanho = conteudo
    .split('\n')
    .filter((linha) => linha.trimStart().startsWith('"'))
    .sort((a, b) => b.length - a.length);

  if (porTamanho.length === 0) {
    throw new Error('nenhuma linha com payload JSON encontrada');
  }
  return porTamanho[0];
}

/** Texto visível: sem estilo, sem script, sem SVG e sem tag. */
function apenasTexto(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<svg[\s\S]*?<\/svg>/g, ' ')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .split('\n')
    .map((trecho) => trecho.trim())
    .filter((trecho) => trecho.length > 1)
    .join('\n');
}

mkdirSync(DESTINO, { recursive: true });

const arquivos = readdirSync(ORIGEM).filter((nome) => nome.endsWith('.html'));
if (arquivos.length === 0) {
  console.error(`Nenhum .html em ${ORIGEM}/ — os protótipos da R2 deveriam estar aqui.`);
  process.exit(1);
}

for (const arquivo of arquivos) {
  const ambiente = nomeDoAmbiente(arquivo);
  const bruto = readFileSync(join(ORIGEM, arquivo), 'utf8');

  let html;
  try {
    html = JSON.parse(linhaDoPayload(bruto));
  } catch (erro) {
    console.error(`${ambiente}: não foi possível decodificar o payload — ${erro.message}`);
    process.exit(1);
  }

  const texto = apenasTexto(html);
  writeFileSync(join(DESTINO, `${ambiente}.html`), html, 'utf8');
  writeFileSync(join(DESTINO, `${ambiente}.txt`), texto, 'utf8');

  const estilos = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1].length);
  console.log(
    `${ambiente.padEnd(8)} markup ${String(html.length).padStart(7)} · ` +
      `estilo [${estilos.join(', ')}] · ${texto.split('\n').length} trechos de texto`,
  );
}

console.log(`\nSaída em ${DESTINO}/ (derivada, fora do git).`);
