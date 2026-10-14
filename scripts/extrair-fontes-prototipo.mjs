/**
 * Extrai as fontes do protótipo aprovado (Anton e Archivo) para o pacote.
 *
 *   pnpm prototipo:fontes
 *
 * Os protótipos de `docs/prototipo-aprovado/` são páginas empacotadas: o markup
 * declara os `@font-face` com chaves de um manifest, e o manifest guarda cada
 * woff2 em base64. Este script lê os dois, grava um arquivo por (família,
 * subset) em `packages/nucleo/estilos/fontes/` e escreve `fontes.css`.
 *
 * A Archivo do protótipo é **variável** no eixo `wght`: os cinco `@font-face`
 * (400 a 800) apontam para o mesmo arquivo por subset. Aqui vira uma regra só,
 * `font-weight: 400 800`. A Anton tem um peso, 400.
 *
 * Saída gerada — não edite `fontes.css` à mão.
 */

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import * as prettier from 'prettier';

const ORIGEM = 'docs/prototipo-aprovado';
const DESTINO_FONTES = 'packages/nucleo/estilos/fontes';
const DESTINO_CSS = 'packages/nucleo/estilos/fontes.css';

const SUBSETS = [
  ['U+0102-0103', 'vietnamese'],
  ['U+0100-02BA', 'latin-ext'],
  ['U+0000-00FF', 'latin'],
];

function nomeDoSubset(unicodeRange) {
  const casado = SUBSETS.find(([marca]) => unicodeRange.includes(marca));
  if (casado === undefined) throw new Error(`unicode-range não previsto: ${unicodeRange}`);
  return casado[1];
}

function linhaJson(conteudo, prefixo) {
  const candidatas = conteudo
    .split('\n')
    .map((linha) => linha.trim())
    .filter((linha) => linha.startsWith(prefixo))
    .sort((a, b) => b.length - a.length);
  if (candidatas.length === 0) throw new Error(`nenhuma linha começando com ${prefixo}`);
  return JSON.parse(candidatas[0]);
}

const registros = new Map();

for (const arquivo of readdirSync(ORIGEM).filter((nome) => nome.endsWith('.html'))) {
  const conteudo = readFileSync(join(ORIGEM, arquivo), 'utf8');
  const markup = linhaJson(conteudo, '"');
  const manifesto = linhaJson(conteudo, '{"');

  for (const bloco of markup.matchAll(/@font-face\s*\{([\s\S]*?)\}/g)) {
    const corpo = bloco[1];
    const campo = (nome) => new RegExp(`${nome}:\\s*([^;]+);`).exec(corpo)?.[1]?.trim();
    const chave = /url\("([^"]+)"\)/.exec(corpo)?.[1];
    const familia = (campo('font-family') ?? '').replace(/['"]/g, '');
    const peso = Number(campo('font-weight'));
    const unicodeRange = campo('unicode-range') ?? '';
    const asset = chave === undefined ? undefined : manifesto[chave];
    if (asset === undefined || !asset.mime.startsWith('font/') || asset.compressed) {
      throw new Error(`${arquivo}: @font-face de ${familia} sem woff2 legível`);
    }

    const buffer = Buffer.from(asset.data, 'base64');
    if (buffer.subarray(0, 4).toString('ascii') !== 'wOF2') {
      throw new Error(`${arquivo}: ${familia} não é woff2`);
    }

    const subset = nomeDoSubset(unicodeRange);
    const id = `${familia.toLowerCase()}-${subset}`;
    const hash = createHash('sha256').update(buffer).digest('hex');
    const anterior = registros.get(id);
    if (anterior !== undefined && anterior.hash !== hash) {
      throw new Error(`${id}: arquivos diferentes entre os protótipos`);
    }
    const pesos = new Set(anterior?.pesos ?? []);
    pesos.add(peso);
    registros.set(id, { id, familia, subset, unicodeRange, buffer, hash, pesos });
  }
}

rmSync(DESTINO_FONTES, { recursive: true, force: true });
mkdirSync(DESTINO_FONTES, { recursive: true });

const ordem = (r) => `${r.familia}-${SUBSETS.findIndex(([, nome]) => nome === r.subset)}`;
const regras = [...registros.values()]
  .sort((a, b) => ordem(a).localeCompare(ordem(b)))
  .map((r) => {
    writeFileSync(join(DESTINO_FONTES, `${r.id}.woff2`), r.buffer);
    const pesos = [...r.pesos].sort((a, b) => a - b);
    const peso = pesos.length === 1 ? `${pesos[0]}` : `${pesos[0]} ${pesos.at(-1)}`;
    return `@font-face {
  font-family: '${r.familia}';
  font-style: normal;
  font-weight: ${peso};
  font-display: swap;
  src: url('./fontes/${r.id}.woff2') format('woff2');
  unicode-range: ${r.unicodeRange};
}`;
  });

const css = `/*
 * Anton (títulos e números) e Archivo (texto) — extraídas do protótipo
 * aprovado por \`pnpm prototipo:fontes\`.
 *
 * ARQUIVO GERADO. Não edite à mão: rode o script.
 */

${regras.join('\n\n')}
`;

writeFileSync(DESTINO_CSS, await prettier.format(css, { parser: 'css' }));
console.log(`${registros.size} arquivos de fonte em ${DESTINO_FONTES}/ e ${DESTINO_CSS}`);
