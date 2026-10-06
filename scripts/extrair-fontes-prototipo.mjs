/**
 * Extrai a Inter dos protótipos da R2 — os arquivos woff2 e as regras
 * `@font-face` que os declaram.
 *
 * ## Por que isto existe
 *
 * `--dsn-font-sans` sempre nomeou `Inter` primeiro, mas nada carregava a
 * fonte. Em Windows o fallback `system-ui` é a Segoe UI, e um `font-weight:800`
 * ali resolve para **Segoe UI Black** — mais grossa e mais larga que a
 * Inter ExtraBold do protótipo. O sintoma aparecia nos títulos, que são o
 * único texto em 800; a causa afetava a tela inteira, e mudava de máquina para
 * máquina (SF no macOS, DejaVu no CI Linux).
 *
 * O protótipo embute a fonte no mesmo manifest de assets das imagens
 * (ver [`extrair-imagens-prototipo.mjs`](extrair-imagens-prototipo.mjs)): sete
 * woff2, um por subset da Inter do Google Fonts, e 35 regras `@font-face`
 * (5 pesos × 7 subsets) apontando para eles. Extrair é a única forma de ter a
 * mesma fonte — "instalar a Inter na máquina" não vale, porque o navegador de
 * quem usa o produto não tem.
 *
 * ## Por que a saída é versionada
 *
 * Igual às imagens: `next build` precisa dos bytes em disco. O script existe
 * para que eles sejam rastreáveis até o protótipo — rode de novo e os bytes
 * têm de bater — e não para rodar no CI.
 *
 * ## Por que sete regras, e não 35
 *
 * Os sete arquivos são **variáveis** (eixo `wght`): as 35 regras do protótipo
 * repetem o mesmo `src` para cada peso. Uma regra por subset com
 * `font-weight: 400 800` instancia exatamente os mesmos pesos — o que o
 * protótipo declara em 35 linhas de `src` idêntico.
 *
 * Uso: `pnpm prototipo:fontes`
 */

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

import * as prettier from 'prettier';

const ORIGEM = 'docs/R2';
const DESTINO_FONTES = 'apps/web/public/fontes';
const DESTINO_CSS = 'apps/web/src/estilos/fontes.css';
/** Caminho público das fontes, como o CSS gerado as referencia. */
const BASE_URL = '/fontes';

/**
 * Nome do subset a partir do `unicode-range`.
 *
 * São os sete subsets da Inter no Google Fonts. O primeiro intervalo de cada
 * faixa é único entre eles, e é isso que identifica o arquivo — o UUID da
 * chave do manifest muda de export para export e não serve de nome.
 */
const SUBSETS = [
  ['U+0460-052F', 'cyrillic-ext'],
  ['U+0400-045F', 'cyrillic'],
  ['U+1F00-1FFF', 'greek-ext'],
  ['U+0370-0377', 'greek'],
  ['U+0102-0103', 'vietnamese'],
  ['U+0100-02BA', 'latin-ext'],
  ['U+0000-00FF', 'latin'],
];

function nomeDoSubset(unicodeRange) {
  const casado = SUBSETS.find(([marca]) => unicodeRange.includes(marca));
  if (casado === undefined) {
    throw new Error(`unicode-range não reconhecido: ${unicodeRange.slice(0, 60)}…`);
  }
  return casado[1];
}

/** A linha do markup — a segunda maior entre as que começam com `"`. */
function markupDe(conteudo) {
  const candidatas = conteudo
    .split('\n')
    .map((linha) => linha.trim())
    .filter((linha) => linha.startsWith('"'))
    .sort((a, b) => b.length - a.length);

  if (candidatas.length === 0) throw new Error('nenhuma linha com markup encontrada');
  return JSON.parse(candidatas[0]);
}

/** A maior linha do arquivo — o manifest de assets em base64. */
function manifestoDe(conteudo) {
  const candidatas = conteudo
    .split('\n')
    .map((linha) => linha.trim())
    .filter((linha) => linha.startsWith('{"'))
    .sort((a, b) => b.length - a.length);

  if (candidatas.length === 0) throw new Error('nenhuma linha com manifest JSON encontrada');
  return JSON.parse(candidatas[0]);
}

/** As regras `@font-face` do markup, como `{ chave, peso, unicodeRange }`. */
function facesDe(markup) {
  const faces = [];
  for (const bloco of markup.matchAll(/@font-face\s*\{([\s\S]*?)\}/g)) {
    const corpo = bloco[1];
    const campo = (nome) => new RegExp(`${nome}:\\s*([^;]+);`).exec(corpo)?.[1]?.trim();
    const chave = /url\("([^"]+)"\)/.exec(corpo)?.[1];
    if (chave === undefined) continue;

    faces.push({
      chave,
      familia: (campo('font-family') ?? '').replace(/['"]/g, ''),
      estilo: campo('font-style'),
      peso: Number(campo('font-weight')),
      display: campo('font-display'),
      unicodeRange: campo('unicode-range') ?? '',
    });
  }
  return faces;
}

const arquivos = readdirSync(ORIGEM).filter((nome) => nome.endsWith('.html'));
if (arquivos.length === 0) {
  console.error(`Nenhum .html em ${ORIGEM}/ — os protótipos da R2 deveriam estar aqui.`);
  process.exit(1);
}

/** subset → { buffer, hash, pesos: Set, unicodeRange, ambientes: Set } */
const porSubset = new Map();

for (const arquivo of arquivos) {
  const ambiente = /Ambiente (\w+)/.exec(basename(arquivo))?.[1] ?? basename(arquivo, '.html');
  const conteudo = readFileSync(join(ORIGEM, arquivo), 'utf8');

  let faces;
  let manifesto;
  try {
    faces = facesDe(markupDe(conteudo));
    manifesto = manifestoDe(conteudo);
  } catch (erro) {
    console.error(`${ambiente}: não foi possível ler o protótipo — ${erro.message}`);
    process.exit(1);
  }

  for (const face of faces) {
    const asset = manifesto[face.chave];
    if (asset === undefined || !asset.mime.startsWith('font/')) {
      console.error(
        `${ambiente}: @font-face aponta para ${face.chave}, que não é fonte no manifest.`,
      );
      process.exit(1);
    }
    // `compressed: true` só aparece nos `text/javascript`; as fontes são
    // base64 cru. Se isso mudar, é melhor falhar que gravar bytes que não abrem.
    if (asset.compressed) {
      console.error(`${ambiente}/${face.chave}: fonte comprimida — formato não previsto.`);
      process.exit(1);
    }
    if (face.familia !== 'Inter' || face.estilo !== 'normal') {
      console.error(`${ambiente}: face inesperada — ${face.familia} ${face.estilo}.`);
      process.exit(1);
    }

    const buffer = Buffer.from(asset.data, 'base64');
    if (buffer.subarray(0, 4).toString('ascii') !== 'wOF2') {
      console.error(`${ambiente}/${face.chave}: não é um woff2.`);
      process.exit(1);
    }

    const subset = nomeDoSubset(face.unicodeRange);
    const hash = createHash('sha256').update(buffer).digest('hex');
    const registro = porSubset.get(subset) ?? {
      buffer,
      hash,
      unicodeRange: face.unicodeRange,
      display: face.display,
      pesos: new Set(),
      ambientes: new Set(),
    };

    // O mesmo subset tem de ser byte a byte igual nos três ambientes. Se um
    // protótipo novo trouxer outra fonte, falhar é melhor que sobrescrever.
    if (registro.hash !== hash) {
      console.error(`${subset}: bytes divergentes entre ambientes (${ambiente}).`);
      process.exit(1);
    }

    registro.pesos.add(face.peso);
    registro.ambientes.add(ambiente);
    porSubset.set(subset, registro);
  }
}

if (porSubset.size !== SUBSETS.length) {
  console.error(`Esperava ${SUBSETS.length} subsets, encontrei ${porSubset.size}.`);
  process.exit(1);
}

mkdirSync(DESTINO_FONTES, { recursive: true });

// Na ordem do Google Fonts — a mesma do protótipo, e a que deixa `latin` (o
// subset que toda tela usa) por último, como lá.
const ordem = SUBSETS.map(([, nome]) => nome);
const regras = [];

for (const subset of ordem) {
  const { buffer, pesos, unicodeRange, display, ambientes } = porSubset.get(subset);
  const nomeDoArquivo = `inter-${subset}.woff2`;
  writeFileSync(join(DESTINO_FONTES, nomeDoArquivo), buffer);

  const faixa = [Math.min(...pesos), Math.max(...pesos)];
  regras.push(
    [
      '@font-face {',
      "  font-family: 'Inter';",
      '  font-style: normal;',
      `  font-weight: ${faixa[0]} ${faixa[1]};`,
      `  font-display: ${display};`,
      `  src: url('${BASE_URL}/${nomeDoArquivo}') format('woff2');`,
      `  unicode-range: ${unicodeRange};`,
      '}',
    ].join('\n'),
  );

  console.log(
    `${subset.padEnd(13)} → ${join(DESTINO_FONTES, nomeDoArquivo).padEnd(34)} ` +
      `${String(buffer.length).padStart(7)} bytes · pesos ${[...pesos].sort().join('/')} · ` +
      `${[...ambientes].join(', ')}`,
  );
}

const cabecalho = `/*
 * Inter — extraída dos protótipos da R2 por \`pnpm prototipo:fontes\`.
 *
 * ARQUIVO GERADO. Não edite à mão: rode o script.
 *
 * Sem estas regras o navegador cai no fallback de \`--dsn-font-sans\` e os pesos
 * 700/800 dos títulos viram Segoe UI Black (Windows) ou o que cada sistema
 * tiver — foi o que deixou os títulos mais grossos que o protótipo. Os sete
 * arquivos são variáveis no eixo \`wght\`; o \`unicode-range\` é o do protótipo,
 * e é ele que faz o navegador baixar só o subset que a página usa.
 *
 * Ver \`docs/design-system.md\` §1.2 e \`scripts/extrair-fontes-prototipo.mjs\`.
 */
`;

/*
 * Passa pelo Prettier antes de gravar: as faixas de `unicode-range` são longas,
 * e sem isto `pnpm format:check` reprovaria o arquivo a cada regeneração — um
 * script que deixa o CI vermelho por gerar o que ele mesmo gera.
 */
const css = await prettier.format(`${cabecalho}\n${regras.join('\n\n')}\n`, {
  ...(await prettier.resolveConfig(DESTINO_CSS)),
  filepath: DESTINO_CSS,
});

writeFileSync(DESTINO_CSS, css, 'utf8');
console.log(`\n${'CSS'.padEnd(13)} → ${DESTINO_CSS} (${regras.length} regras)`);
