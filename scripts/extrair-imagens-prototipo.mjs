/**
 * Extrai as imagens da marca dos protótipos da R2.
 *
 * Os `.html` de `docs/R2/` embutem um manifest de assets — o mesmo descrito em
 * [`extrair-prototipo.mjs`](extrair-prototipo.mjs), na **maior** linha do
 * arquivo, e não na segunda. Cada entrada é `{ mime, compressed, data }` com o
 * conteúdo em base64, e o `src` das `<img>` do markup é a chave do manifest.
 *
 * Três PNGs interessam, e os três aparecem **byte a byte iguais** nos três
 * ambientes (só a chave muda):
 *
 * | Arquivo | Onde o protótipo usa |
 * |---|---|
 * | `dissona-horizontal.png` | telas de autenticação, sobre fundo claro |
 * | `dissona-horizontal-branco.png` | topo da sidebar, sobre o gradiente escuro |
 * | `dissona-simbolo.png` | `<link rel="icon">` — o favicon |
 *
 * Ao contrário de `extrair-prototipo.mjs`, **a saída daqui é versionada**: são
 * assets que o `next build` precisa ter em disco, não material de leitura. O
 * script existe para que eles sejam rastreáveis até o protótipo — rode de novo
 * e os bytes têm de bater — e não para rodar no CI.
 *
 * Uso: `pnpm prototipo:imagens`
 */

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const ORIGEM = 'docs/R2';
const DESTINO_MARCA = 'apps/web/public/marca';
/** O favicon vive aqui pela convenção de `icon.png` do App Router do Next. */
const DESTINO_ICONE = 'apps/web/src/app/icon.png';

/**
 * Os três assets, identificados pelo SHA-256 do PNG.
 *
 * A chave do manifest muda de ambiente para ambiente (é um UUID gerado por
 * export), então o hash é o único identificador estável. Fixá-lo aqui também
 * serve de trava: se um protótipo novo trouxer outra arte, o script falha em
 * vez de sobrescrever a marca silenciosamente.
 */
const ASSETS = new Map([
  [
    '9ca4f37f4fb82a3682ba9ab923b12202c125092aa8aacfbf85db5bc10aa260ef',
    { destino: join(DESTINO_MARCA, 'dissona-horizontal.png'), descricao: 'logo horizontal' },
  ],
  [
    '48b15daac0a6f746fcdd94c7b1d42a64284fdfd9beae1a6c375b16aa1130f955',
    { destino: join(DESTINO_MARCA, 'dissona-horizontal-branco.png'), descricao: 'logo branco' },
  ],
  [
    'b27506efd980d43800578d4983f0b679603786e9eb1c33c3b30bbed1f1411791',
    { destino: join(DESTINO_MARCA, 'dissona-simbolo.png'), descricao: 'símbolo (favicon)' },
  ],
]);

/** A maior linha do arquivo — o manifest de assets em base64. */
function manifestoDe(conteudo) {
  const candidatas = conteudo
    .split('\n')
    .map((linha) => linha.trim())
    .filter((linha) => linha.startsWith('{"'))
    .sort((a, b) => b.length - a.length);

  if (candidatas.length === 0) {
    throw new Error('nenhuma linha com manifest JSON encontrada');
  }
  return JSON.parse(candidatas[0]);
}

const arquivos = readdirSync(ORIGEM).filter((nome) => nome.endsWith('.html'));
if (arquivos.length === 0) {
  console.error(`Nenhum .html em ${ORIGEM}/ — os protótipos da R2 deveriam estar aqui.`);
  process.exit(1);
}

/** hash → { buffer, ambientes: [{ ambiente, chave }] } */
const encontrados = new Map();

for (const arquivo of arquivos) {
  const ambiente = /Ambiente (\w+)/.exec(basename(arquivo))?.[1] ?? basename(arquivo, '.html');

  let manifesto;
  try {
    manifesto = manifestoDe(readFileSync(join(ORIGEM, arquivo), 'utf8'));
  } catch (erro) {
    console.error(`${ambiente}: não foi possível ler o manifest — ${erro.message}`);
    process.exit(1);
  }

  for (const [chave, asset] of Object.entries(manifesto)) {
    if (!asset.mime.startsWith('image/')) continue;

    // `compressed: true` só aparece nos `text/javascript` do protótipo; as
    // imagens são base64 cru. Se isso mudar, é melhor falhar do que gravar
    // bytes que não abrem.
    if (asset.compressed) {
      console.error(`${ambiente}/${chave}: imagem comprimida — formato não previsto.`);
      process.exit(1);
    }

    const buffer = Buffer.from(asset.data, 'base64');
    const hash = createHash('sha256').update(buffer).digest('hex');
    const registro = encontrados.get(hash) ?? { buffer, ambientes: [] };
    registro.ambientes.push({ ambiente, chave });
    encontrados.set(hash, registro);
  }
}

let faltando = 0;
for (const [hash, { destino, descricao }] of ASSETS) {
  const registro = encontrados.get(hash);
  if (registro === undefined) {
    console.error(`${descricao}: nenhum asset com sha256 ${hash.slice(0, 16)}… nos protótipos.`);
    faltando += 1;
    continue;
  }

  mkdirSync(join(destino, '..'), { recursive: true });
  writeFileSync(destino, registro.buffer);

  const ambientes = registro.ambientes.map(({ ambiente }) => ambiente).join(', ');
  console.log(
    `${descricao.padEnd(18)} → ${destino.padEnd(42)} ` +
      `${String(registro.buffer.length).padStart(7)} bytes · ${ambientes}`,
  );
}

if (faltando > 0) {
  process.exit(1);
}

// O favicon é o mesmo símbolo: o protótipo aponta o `<link rel="icon">` para
// ele, e duplicar o arquivo é o que a convenção do App Router pede.
const simbolo = join(DESTINO_MARCA, 'dissona-simbolo.png');
writeFileSync(DESTINO_ICONE, readFileSync(simbolo));
console.log(`${'favicon'.padEnd(18)} → ${DESTINO_ICONE.padEnd(42)} (cópia do símbolo)`);
