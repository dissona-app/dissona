/**
 * Gera a matriz RF ↔ prova, e a confere no CI.
 *
 * ## O problema que ele resolve
 *
 * "Os testes cobrem os critérios de aceite?" era pergunta de opinião. Havia
 * três menções soltas a `RF-0NN` em vinte arquivos de spec, nenhuma
 * verificável, e a correspondência real entre requisito e teste vivia na
 * cabeça de quem tinha escrito. Com a tag nativa do Playwright no `describe`,
 * a correspondência vira dado — e este script a lê.
 *
 * ## De onde vem cada coluna
 *
 * - **A lista de RFs** sai de `docs/requirements.md`, nunca daqui. Acrescentar
 *   um requisito ao documento faz a linha aparecer na matriz sozinha; é o
 *   documento que manda.
 * - **A release** sai da tabela de índice do mesmo arquivo, pelas faixas
 *   `RF-001 a RF-010`.
 * - **As provas e2e** saem de `playwright test --list --reporter=json`, que
 *   não sobe servidor nem navegador e não toca no banco: é listagem estática,
 *   roda em segundos e cabe no job de qualidade.
 * - **As outras provas** saem de uma varredura por `RF-0NN` nos testes de SQL
 *   e nos unitários. A convenção é uma linha `-- rastreabilidade: RF-066,
 *   RF-067` no cabeçalho do `.testes.sql`. Sem isso, um requisito provado no
 *   banco — como o gate de escuta do RF-058 — pareceria buraco.
 *
 * ## Por que `--conferir` tem lista de exceções
 *
 * Alguns requisitos não têm, e não devem ter, prova de tela: o gate de escuta
 * mora no banco porque o Playwright não reproduz áudio. Marcá-los como
 * descobertos treinaria todo mundo a ignorar o alerta. A exceção mora aqui,
 * versionada, com o motivo escrito — revisável em PR, ao contrário de uma
 * planilha.
 *
 * Uso: `node scripts/matriz-rastreabilidade.mjs [--conferir]`
 */

import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REQUISITOS = 'docs/requirements.md';
const SAIDA = 'docs/R2/matriz-rf-e2e.md';

/**
 * Requisitos cujo lugar de prova **não** é o e2e, com o motivo.
 *
 * Cada entrada é uma decisão, não uma dívida: se virar dívida, sai daqui e o
 * CI volta a cobrar.
 */
const SEM_E2E = {
  'RF-002':
    'login social: sem provedor externo não há o que exercer além da presença dos botões; autorizar, vincular por e-mail coincidente e o expurgo em 7 dias ficam fora ([open-questions #9](../open-questions.md))',
  'RF-009':
    'a notificação de novo cadastro ao admin é gravada em `notificacao` e **nenhuma tela a mostra** até a R5 (módulos 10 e 18)',
  'RF-058':
    'gate de escuta provado em `supabase/testes/0009_remuneracao.testes.sql` — o Playwright não reproduz áudio',
};

/**
 * Requisitos com e2e, mas cobertos **em parte** — com o motivo.
 *
 * Existe porque "coberto" sem qualificação é onde uma matriz de rastreabilidade
 * começa a mentir: o teste passa, a linha fica verde, e ninguém lembra que o
 * requisito pedia mais do que o produto faz.
 */
const RESSALVAS = {
  'RF-069':
    'a notificação é afirmada no banco: não há central de notificações até a R5 (módulos 10 e 18)',
  'RF-045':
    'prova-se que o cartão não é persistido, que não sai para terceiros e que da **segunda** compra em diante só o token trafega (`cartao_salvo`, migration 0007e); o PAN transita pelo nosso servidor na **primeira**, porque a tokenização do Asaas é posterior à cobrança — se "tokenizados" exigir que ele nunca nos toque, o caminho é o checkout hospedado deles ([open-questions #28](../open-questions.md))',
  'RF-004':
    'o token é gerado por `auth.admin.generateLink` e entregue ao mesmo route handler; que o e-mail **saia e chegue** depende de provedor transacional dedicado ([open-questions #10](../open-questions.md)) e não é observável da suíte',
  'RF-005': 'idem RF-004: o mecanismo do link é exercido de ponta a ponta, o transporte não',
  'RF-026':
    'a tela declara a pendência (`CONTA.pendenteNestaRelease`); os dados de recebimento não existem nesta release',
  'RF-020':
    'a tela declara a pendência (`CONTA.pendenteNestaRelease`); os dados de cobrança não existem nesta release',
};

/** As releases que o CI cobra. R3+ ainda não tem escopo em execução. */
const COBRADAS = new Set(['R1', 'R2']);

/**
 * A conferência tem **dois** níveis, e eles se ligam em momentos diferentes.
 *
 * `--conferir` (sempre, no CI): a matriz no disco bate com a gerada. Barato,
 * imediato, e impede o documento de descolar da suíte — que é o jeito clássico
 * de uma matriz de rastreabilidade virar ficção.
 *
 * `--exigir-cobertura`: nenhum RF de R1/R2 sem prova. Este é o gate de verdade,
 * e ele só pode ligar quando a cobertura estiver completa — ligá-lo antes
 * deixaria o CI vermelho por semanas, e um CI cronicamente vermelho não barra
 * nada. Até lá, o script **relata** os descobertos em toda execução, para o
 * progresso ser mensurável sem bloquear ninguém.
 */
const EXIGE_COBERTURA = process.argv.includes('--exigir-cobertura');

// --------------------------------------------------------------- requisitos

/** `### RF-035 · Envio por link com autodetecção` → id e título. */
function lerRequisitos(markdown) {
  const requisitos = [];
  for (const linha of markdown.split('\n')) {
    const casado = /^### (RF-\d{3}) · (.+?)\s*$/.exec(linha);
    if (casado !== null) requisitos.push({ id: casado[1], titulo: casado[2] });
  }
  return requisitos;
}

/**
 * A release de cada RF, pela tabela de índice.
 *
 * As linhas de R3 a R5 não têm `###` próprio — são uma tabela — então elas
 * entram pela faixa e ficam sem título individual. Isso é de propósito: a
 * matriz não deve fingir detalhe que o documento não tem.
 */
function lerReleases(markdown) {
  const porRequisito = new Map();
  for (const linha of markdown.split('\n')) {
    const casado = /\[RF-(\d{3}) a RF-(\d{3})\][^|]*\|[^|]*\|\s*([^|]+?)\s*\|/.exec(linha);
    if (casado === null) continue;

    const release = casado[3];
    for (let n = Number(casado[1]); n <= Number(casado[2]); n += 1) {
      porRequisito.set(`RF-${String(n).padStart(3, '0')}`, release);
    }
  }
  return porRequisito;
}

// ---------------------------------------------------------------- provas e2e

/** Tags do Playwright → `{ 'RF-049': ['b8-… › sem saldo, …'] }`. */
function lerProvasE2E() {
  const bruto = execFileSync('npx', ['playwright', 'test', '--list', '--reporter=json'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    shell: process.platform === 'win32',
  });

  const relatorio = JSON.parse(bruto);
  const porRequisito = new Map();

  const visitar = (suite, caminho) => {
    for (const spec of suite.specs ?? []) {
      // As tags do `describe` chegam em cada spec, já mescladas com as do
      // teste — é por isso que não é preciso subir a árvore atrás delas.
      const tags = new Set();
      for (const teste of spec.tests ?? []) for (const tag of teste.tags ?? []) tags.add(tag);
      for (const tag of spec.tags ?? []) tags.add(tag);

      for (const tag of tags) {
        // O `@` é obrigatório no código (`tag: ['@RF-049']`) e o reporter JSON
        // o **remove** ao serializar. Aceitar os dois formatos evita que a
        // matriz esvazie em silêncio se o reporter mudar de ideia.
        const casado = /^@?(RF-\d{3})$/.exec(tag);
        if (casado === null) continue;
        const lista = porRequisito.get(casado[1]) ?? [];
        lista.push(`\`${caminho}\` › ${spec.title}`);
        porRequisito.set(casado[1], lista);
      }
    }
    for (const filha of suite.suites ?? []) visitar(filha, filha.file ?? caminho);
  };

  for (const suite of relatorio.suites ?? []) visitar(suite, suite.file ?? '?');
  return porRequisito;
}

// ------------------------------------------------------------ outras provas

function arquivosEm(raiz, filtro, encontrados = []) {
  let entradas;
  try {
    entradas = readdirSync(raiz);
  } catch {
    return encontrados;
  }

  for (const entrada of entradas) {
    if (entrada === 'node_modules' || entrada === '.next') continue;
    const caminho = join(raiz, entrada);
    if (statSync(caminho).isDirectory()) arquivosEm(caminho, filtro, encontrados);
    else if (filtro(entrada)) encontrados.push(caminho);
  }
  return encontrados;
}

/** Menções a `RF-0NN` nos testes de SQL e nos unitários. */
function lerOutrasProvas() {
  const porRequisito = new Map();
  const arquivos = [
    ...arquivosEm('supabase/testes', (nome) => nome.endsWith('.testes.sql')),
    ...['apps', 'packages'].flatMap((raiz) =>
      arquivosEm(raiz, (nome) => nome.endsWith('.test.ts') || nome.endsWith('.test.tsx')),
    ),
  ];

  for (const caminho of arquivos) {
    const conteudo = readFileSync(caminho, 'utf8');
    for (const casado of conteudo.matchAll(/RF-\d{3}/g)) {
      const lista = porRequisito.get(casado[0]) ?? new Set();
      lista.add(`\`${caminho.replace(/\\/g, '/')}\``);
      porRequisito.set(casado[0], lista);
    }
  }
  return porRequisito;
}

// ------------------------------------------------------------------- matriz

function montar(requisitos, releases, e2e, outras) {
  const linhas = [
    '<!-- GERADO POR scripts/matriz-rastreabilidade.mjs — não edite à mão. -->',
    '',
    '# Matriz de rastreabilidade — RF ↔ prova',
    '',
    'Qual teste prova qual critério de aceite. Gerada das **tags** dos specs',
    "(`test.describe(..., { tag: ['@RF-049'] })`) e das menções a `RF-0NN` nos",
    'testes de SQL e unitários — nunca escrita à mão, para não descolar da suíte.',
    '',
    'Para rodar a prova de um requisito isolado: `pnpm e2e --grep @RF-070`.',
    '',
    '| RF | Título | Release | Provas e2e | Outras provas | Estado |',
    '|---|---|---|---|---|---|',
  ];

  const descobertos = [];

  for (const { id, titulo } of requisitos) {
    const release = releases.get(id) ?? '—';
    const provas = e2e.get(id) ?? [];
    const sql = [...(outras.get(id) ?? [])];

    let estado;
    if (provas.length > 0) {
      estado = RESSALVAS[id] === undefined ? 'coberto' : `coberto com ressalva — ${RESSALVAS[id]}`;
    } else if (SEM_E2E[id] !== undefined) estado = `sem e2e — ${SEM_E2E[id]}`;
    else if (sql.length > 0) estado = 'parcial — só fora do e2e';
    else estado = '**descoberto**';

    if (estado === '**descoberto**' && COBRADAS.has(release)) descobertos.push(id);

    linhas.push(
      `| ${id} | ${titulo} | ${release} | ${provas.join('<br>') || '—'} | ${sql.join('<br>') || '—'} | ${estado} |`,
    );
  }

  return { markdown: `${linhas.join('\n')}\n`, descobertos };
}

// --------------------------------------------------------------------- main

const markdown = readFileSync(REQUISITOS, 'utf8');
const { markdown: matriz, descobertos } = montar(
  lerRequisitos(markdown),
  lerReleases(markdown),
  lerProvasE2E(),
  lerOutrasProvas(),
);

const conferindo = process.argv.includes('--conferir');

if (!conferindo) {
  writeFileSync(SAIDA, matriz, 'utf8');
  console.log(`${SAIDA} gerada.`);
  if (descobertos.length > 0) {
    console.log(`Sem prova em R1/R2: ${descobertos.join(', ')}`);
  }
  process.exit(0);
}

let atual = '';
try {
  atual = readFileSync(SAIDA, 'utf8');
} catch {
  console.error(`${SAIDA} não existe. Rode: pnpm rastreabilidade`);
  process.exit(1);
}

if (atual !== matriz) {
  console.error(`${SAIDA} está desatualizada. Rode: pnpm rastreabilidade`);
  process.exit(1);
}

if (descobertos.length > 0) {
  const recado =
    `Requisitos de R1/R2 sem prova nenhuma (${descobertos.length}): ${descobertos.join(', ')}.\n` +
    'Escreva o teste e marque-o com a tag, ou registre a exceção com o motivo ' +
    'em SEM_E2E, dentro de scripts/matriz-rastreabilidade.mjs.';

  if (EXIGE_COBERTURA) {
    console.error(recado);
    process.exit(1);
  }
  console.log(`Matriz em dia.\n${recado}`);
  process.exit(0);
}

console.log('Matriz em dia, e nenhum RF de R1/R2 descoberto.');
