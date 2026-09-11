import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { Page } from '@playwright/test';

/**
 * Apoio para comparar uma tela da aplicação com a mesma tela do protótipo da
 * R2, no mesmo navegador e na mesma viewport.
 *
 * ## Por que comparar com o protótipo, e não com um screenshot nosso
 *
 * O protótipo é a fonte de verdade do design (AGENTS.md), ele é **markup**, e
 * os três `.html` estão versionados. Então dá para abri-lo num segundo tab e
 * perguntar o que ele decidiu sobre cada texto — em vez de guardar um
 * screenshot da nossa própria saída, que só detecta mudança e não detecta erro:
 * uma baseline gerada de uma tela errada carimba a tela errada.
 *
 * Não é comparação de pixel. Pixel entre duas composições diferentes nunca
 * fecha (a copy divergiu de propósito em alguns pontos, o conteúdo é dinâmico),
 * e um diff de imagem não diz *o que* está diferente. O que se compara aqui é a
 * **tipografia de cada texto que existe nos dois lados com a mesma string** —
 * peso, corpo, tracking, caixa, cor e entrelinha. Foi o que pegou os títulos em
 * Segoe UI Black, e é o que pega o próximo `--dsn-text-xs` no lugar de um `sm`.
 *
 * ## Como navegar no protótipo
 *
 * Os `.html` expõem a API de props do editor em `window.__dcSetProps(nome,
 * props)`, e `telaInicial` / `estadoToken` / `estadoInicial` levam direto à
 * tela e ao estado. É determinístico — nada de cadeia de cliques com
 * `setTimeout` de 1400 ms no meio. As telas que só existem como consequência de
 * um envio (verificação de e-mail, confirmação neutra) não estão no `routeMap`
 * do protótipo, e para essas há o `depois`.
 */

const ORIGEM = 'docs/R2';

export const PROTOTIPO = {
  ARTISTA: 'Dissona - Ambiente Artista - Release 2.html',
  CURADOR: 'Dissona - Ambiente Curador - Release 2.html',
  ADMIN: 'Dissona - Ambiente Admin - Release 2.html',
} as const;

export type Prototipo = (typeof PROTOTIPO)[keyof typeof PROTOTIPO];

/**
 * Props do protótipo — o mesmo painel que o editor mostra.
 *
 * Só as que interessam às telas de autenticação. A lista completa está no
 * atributo de props do `<script type="text/x-dc">` de cada `.html`.
 */
export type PropsDoPrototipo = {
  readonly telaInicial?: 'Login' | 'Cadastro' | 'Recuperação' | 'Redefinição' | 'Onboarding';
  readonly estadoInicial?: 'Normal' | 'Loading' | 'Erro' | 'Bloqueada' | 'Autenticado';
  readonly estadoCadastro?: 'Normal' | 'Loading' | 'Erro' | 'Sucesso';
  readonly estadoToken?: 'Válido' | 'Expirado';
  readonly passoOnboarding?: 1 | 2 | 3 | 4;
  readonly mostrarSocial?: boolean;
  readonly mostrarProvas?: boolean;
};

/** Tipografia de um texto — o que se compara entre protótipo e aplicação. */
export type Digital = {
  readonly tag: string;
  readonly peso: string;
  readonly corpo: string;
  readonly tracking: string;
  readonly entrelinha: string;
  readonly caixa: string;
  readonly cor: string;
};

export type PropriedadeDeDigital = Exclude<keyof Digital, 'tag'>;

export const PROPRIEDADES: readonly PropriedadeDeDigital[] = [
  'peso',
  'corpo',
  'tracking',
  'entrelinha',
  'caixa',
  'cor',
];

/** Abre um protótipo da R2 e leva à tela pedida pelas props. */
export async function abrirPrototipo(
  page: Page,
  prototipo: Prototipo,
  props: PropsDoPrototipo,
): Promise<void> {
  const caminho = join(process.cwd(), ORIGEM, prototipo);
  if (!existsSync(caminho)) {
    // Acontece quando `pnpm e2e` roda de outro diretório. O erro diz onde
    // procurou, para não parecer que o protótipo sumiu do repositório.
    throw new Error(`Protótipo não encontrado em ${caminho}. Rode a suíte da raiz do repositório.`);
  }

  await page.goto(pathToFileURL(caminho).href);

  // O protótipo é uma página React empacotada que se monta sozinha; o `<h1>` é
  // o primeiro sinal de que o boot acabou e as props já podem ser trocadas.
  await page.locator('h1').first().waitFor();
  await page.evaluate(
    (valores) => {
      const registro = window as unknown as {
        __dcRegistry: Record<string, unknown>;
        __dcSetProps: (nome: string, props: unknown) => void;
      };
      const nome = Object.keys(registro.__dcRegistry)[0];
      if (nome === undefined) throw new Error('protótipo sem componente registrado');
      registro.__dcSetProps(nome, valores);
    },
    props as Record<string, unknown>,
  );

  // As fontes são embutidas e carregam do próprio arquivo; sem esperar por elas
  // a primeira medida sai com métrica de fallback.
  await page.evaluate(() => document.fonts.ready);
}

/**
 * Tipografia de cada texto visível e **único** da tela, indexada pelo texto.
 *
 * Só o elemento mais interno que contém exatamente aquele texto entra, e só se
 * o texto aparecer uma vez na tela — é o que permite parear os dois lados pela
 * string, sem seletor combinado à mão para cada elemento. Texto repetido
 * ("Senha" duas vezes, "Google" no botão e na nota) fica de fora em vez de
 * casar com o elemento errado.
 */
export async function digitaisDeTexto(page: Page): Promise<Record<string, Digital>> {
  await page.evaluate(() => document.fonts.ready);

  return page.evaluate(() => {
    const normalizar = (texto: string | null): string => (texto ?? '').replace(/\s+/g, ' ').trim();

    const ocorrencias = new Map<string, number>();
    const candidatos: Array<[string, Element]> = [];

    for (const elemento of document.querySelectorAll('body *')) {
      if (elemento.tagName === 'SCRIPT' || elemento.tagName === 'STYLE') continue;
      // Ícone é desenho: o texto dentro de um `<svg>` não é tipografia de tela.
      if (elemento.closest('svg') !== null) continue;

      const caixa = elemento.getBoundingClientRect();
      if (caixa.width === 0 || caixa.height === 0) continue;
      if (getComputedStyle(elemento).visibility === 'hidden') continue;

      const texto = normalizar(elemento.textContent);
      if (texto.length < 2 || texto.length > 70) continue;

      // Elemento que embrulha outro com o mesmo texto não é o dono dele.
      const embrulha = [...elemento.children].some(
        (filho) => normalizar(filho.textContent) === texto,
      );
      if (embrulha) continue;

      ocorrencias.set(texto, (ocorrencias.get(texto) ?? 0) + 1);
      candidatos.push([texto, elemento]);
    }

    const saida: Record<string, Digital> = {};
    for (const [texto, elemento] of candidatos) {
      if (ocorrencias.get(texto) !== 1) continue;
      const estilo = getComputedStyle(elemento);
      saida[texto] = {
        tag: elemento.tagName.toLowerCase(),
        peso: estilo.fontWeight,
        corpo: estilo.fontSize,
        tracking: estilo.letterSpacing,
        entrelinha: estilo.lineHeight,
        caixa: estilo.textTransform,
        cor: estilo.color,
      };
    }
    return saida;
  });
}

/**
 * A fonte que o navegador **de fato** usou para renderizar o seletor.
 *
 * `getComputedStyle().fontFamily` devolve a lista declarada, e `Inter` primeiro
 * nela não quer dizer que a Inter carregou — foi exatamente o que escondeu os
 * títulos em Segoe UI Black por semanas. Só o CDP responde o que foi usado.
 */
export async function fonteRenderizada(page: Page, seletor: string): Promise<readonly string[]> {
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');
    const { root } = await cdp.send('DOM.getDocument');
    const { nodeId } = await cdp.send('DOM.querySelector', {
      nodeId: root.nodeId,
      selector: seletor,
    });
    if (nodeId === 0) throw new Error(`seletor sem elemento: ${seletor}`);

    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
    return fonts.map((fonte) => fonte.postScriptName);
  } finally {
    await cdp.detach();
  }
}

/** Propriedade de um texto que pode divergir do protótipo por decisão nossa. */
export type Excecao = {
  readonly texto: string;
  readonly propriedades: readonly PropriedadeDeDigital[];
  /** Por que divergir está certo. Sem motivo, não é exceção: é bug. */
  readonly motivo: string;
};

export type Divergencia = {
  readonly texto: string;
  readonly propriedade: PropriedadeDeDigital;
  readonly prototipo: string;
  readonly aplicacao: string;
};

/**
 * Divergências de tipografia entre os textos que os dois lados têm em comum.
 *
 * Duas regras de leitura do protótipo:
 *
 * - **`line-height: normal` não é decisão.** Onde o protótipo não escreve
 *   entrelinha, o navegador calcula uma a partir da fonte, e exigir o mesmo
 *   número da aplicação seria cobrar um valor que ninguém escolheu. As outras
 *   propriedades são comparadas como estão.
 * - **Texto que só existe de um lado é ignorado.** Copy que divergiu de
 *   propósito (a terceira prova social da tela 1, por exemplo) simplesmente não
 *   pareia, e não vira falso positivo.
 */
export function divergencias(
  doPrototipo: Record<string, Digital>,
  daAplicacao: Record<string, Digital>,
  excecoes: readonly Excecao[] = [],
): readonly Divergencia[] {
  const dispensada = (texto: string, propriedade: PropriedadeDeDigital): boolean =>
    excecoes.some(
      (excecao) => excecao.texto === texto && excecao.propriedades.includes(propriedade),
    );

  const saida: Divergencia[] = [];
  for (const [texto, esperada] of Object.entries(doPrototipo)) {
    const obtida = daAplicacao[texto];
    if (obtida === undefined) continue;

    for (const propriedade of PROPRIEDADES) {
      if (propriedade === 'entrelinha' && esperada.entrelinha === 'normal') continue;
      if (esperada[propriedade] === obtida[propriedade]) continue;
      if (dispensada(texto, propriedade)) continue;

      saida.push({
        texto,
        propriedade,
        prototipo: esperada[propriedade],
        aplicacao: obtida[propriedade],
      });
    }
  }
  return saida;
}

/** Uma linha por divergência, no formato que a falha do teste mostra. */
export function relatorio(lista: readonly Divergencia[]): string {
  return lista
    .map(
      ({ texto, propriedade, prototipo, aplicacao }) =>
        `  "${texto}" · ${propriedade}: protótipo ${prototipo} → aplicação ${aplicacao}`,
    )
    .join('\n');
}
