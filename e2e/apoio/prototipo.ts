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
  /**
   * A união é a soma dos três painéis: os quatro primeiros valores existem nos
   * três ambientes, e o resto pertence a um só. Passar um nome ao ambiente
   * errado não é erro — o `routeMap` do protótipo cai no login, e a guarda de
   * "poucos textos pareados" do spec acusa.
   */
  readonly telaInicial?:
    | 'Login'
    | 'Cadastro'
    | 'Recuperação'
    | 'Redefinição'
    // Artista
    | 'Onboarding'
    | 'Perfil'
    | 'Configurações'
    | 'Carteira'
    | 'Enviar'
    // Curador
    | 'Classificação'
    | 'Boas-vindas Bronze'
    | 'Cadastro em análise'
    | 'Conta e configurações'
    | 'Painel'
    | 'Fila'
    | 'Avaliação'
    // Admin
    | 'Pacotes de Claves'
    | 'Conta e equipe';
  readonly estadoInicial?:
    'Normal' | 'Loading' | 'Erro' | 'Bloqueada' | 'Autenticado' | 'Sem permissão';
  readonly estadoCadastro?: 'Normal' | 'Loading' | 'Erro' | 'Sucesso';
  readonly estadoToken?: 'Válido' | 'Expirado';
  readonly passoOnboarding?: 1 | 2 | 3 | 4;
  /** Passo do wizard do curador — 1 a 8 (ambiente Curador). */
  readonly passoInicial?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  /** `true` quando o wizard é aberto por quem já tem sessão (ambiente Curador). */
  readonly curadorLogado?: boolean;
  readonly classeCurador?: 'Bronze' | 'Prata' | 'Ouro';
  readonly classeForcada?: 'Calculada' | 'Bronze' | 'Candidato a Prata';
  readonly credenciaisMinimas?: 1 | 2 | 3 | 4;
  readonly mostrarSocial?: boolean;
  readonly mostrarProvas?: boolean;
};

/**
 * Tipografia de um texto — o que se compara entre protótipo e aplicação.
 *
 * Geometria (posição, largura, alinhamento, cor de fundo) foi tentada aqui,
 * por texto, e descartada: um botão centralizado por `justify-content` numa
 * flexbox e um botão centralizado por `text-align: center` são visualmente
 * idênticos e computam `text-align` diferente, então a comparação por texto
 * acusa "divergência" em coisa que ninguém vê. Geometria real de tela é
 * `ancoras()` (altura, largura, `gap`, `max-width` de um elemento nomeado —
 * logotipo, card, painel) e `composicao()` (presença e ordem dos blocos) —
 * as duas medem a coisa, não um proxy dela.
 */
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
 * A sequência, em ordem de documento, de todo texto visível e curto da tela.
 *
 * Ao contrário de `digitaisDeTexto`, aqui o texto repetido entra — o que
 * importa é a **presença e a ordem** dos blocos, não pareá-los um a um. É o
 * que pega o que a tipografia nunca pegaria porque não tem par para comparar:
 * um bloco ausente (o subtítulo do curador que a aplicação não tinha), um
 * bloco a mais, ou um bloco fora de ordem.
 *
 * O limite de 90 caracteres é maior que o de `digitaisDeTexto` (70) de
 * propósito: aqui não se mede tipografia de um texto longo, só se registra
 * que ele existe e onde. Textos maiores que isso costumam ser parágrafo de
 * corpo com conteúdo dinâmico (extrato, fila), e comparar a composição deles
 * é ruído — quem cobre esse caso é `digitaisDeTexto`, tela a tela, sobre o
 * texto que os dois lados têm em comum.
 */
export async function composicao(page: Page): Promise<readonly string[]> {
  return page.evaluate(() => {
    const normalizar = (texto: string | null): string => (texto ?? '').replace(/\s+/g, ' ').trim();
    const saida: string[] = [];

    for (const elemento of document.querySelectorAll('body *')) {
      if (elemento.tagName === 'SCRIPT' || elemento.tagName === 'STYLE') continue;
      if (elemento.closest('svg') !== null) continue;

      const caixa = elemento.getBoundingClientRect();
      if (caixa.width === 0 || caixa.height === 0) continue;
      if (getComputedStyle(elemento).visibility === 'hidden') continue;

      const texto = normalizar(elemento.textContent);
      if (texto.length < 2 || texto.length > 90) continue;

      const embrulha = [...elemento.children].some(
        (filho) => normalizar(filho.textContent) === texto,
      );
      if (embrulha) continue;

      saida.push(texto);
    }
    return saida;
  });
}

/**
 * Diferença entre duas composições — o que existe de um lado e não do outro,
 * e o que trocou de posição.
 *
 * Comparação por **conjunto** primeiro (ausente/a mais), e só depois por
 * índice comum (fora de ordem): duas listas de tamanho diferente sempre têm
 * índice "errado" a partir do primeiro ponto de divergência, e isso afogaria
 * o que de fato importa — um bloco que não existe do outro lado.
 */
export type DivergenciaDeComposicao =
  | { readonly tipo: 'ausente'; readonly texto: string; readonly lado: 'protótipo' | 'aplicação' }
  | {
      readonly tipo: 'fora de ordem';
      readonly texto: string;
      readonly indicePrototipo: number;
      readonly indiceAplicacao: number;
    };

export function divergenciasDeComposicao(
  doPrototipo: readonly string[],
  daAplicacao: readonly string[],
): readonly DivergenciaDeComposicao[] {
  const saida: DivergenciaDeComposicao[] = [];

  const soAplicacao = daAplicacao.filter((texto) => !doPrototipo.includes(texto));
  const soPrototipo = doPrototipo.filter((texto) => !daAplicacao.includes(texto));
  for (const texto of soPrototipo) saida.push({ tipo: 'ausente', texto, lado: 'aplicação' });
  for (const texto of soAplicacao) saida.push({ tipo: 'ausente', texto, lado: 'protótipo' });

  const comuns = doPrototipo.filter((texto) => daAplicacao.includes(texto));
  const comunsNaAplicacao = daAplicacao.filter((texto) => doPrototipo.includes(texto));
  for (const [indicePrototipo, texto] of comuns.entries()) {
    const indiceAplicacao = comunsNaAplicacao.indexOf(texto);
    if (indiceAplicacao !== indicePrototipo) {
      saida.push({ tipo: 'fora de ordem', texto, indicePrototipo, indiceAplicacao });
    }
  }

  return saida;
}

/**
 * Geometria de um punhado de elementos nomeados por `seletor` — o que
 * `digitaisDeTexto` não fecha porque eles não têm texto próprio (o logotipo é
 * uma `<img>`; o painel lateral não é um texto único). Cada valor é a altura e
 * a largura em pixels, e o `gap` quando o elemento é um flex/grid container —
 * os três números que o protótipo fixa por ambiente (altura do logotipo,
 * `gap` do card) e que só um seletor explícito por tela consegue medir.
 */
export type Ancora = {
  readonly altura: number;
  readonly largura: number;
  readonly gap: number | null;
  readonly maxWidth: string;
};

export async function ancoras(
  page: Page,
  seletores: Readonly<Record<string, string>>,
): Promise<Record<string, Ancora | null>> {
  return page.evaluate((mapa) => {
    const saida: Record<string, Ancora | null> = {};
    for (const [nome, seletor] of Object.entries(mapa)) {
      const elemento = document.querySelector(seletor);
      if (elemento === null) {
        saida[nome] = null;
        continue;
      }
      const caixa = elemento.getBoundingClientRect();
      const estilo = getComputedStyle(elemento);
      const gap = Number.parseFloat(estilo.rowGap || estilo.gap);
      saida[nome] = {
        altura: Math.round(caixa.height),
        largura: Math.round(caixa.width),
        gap: Number.isNaN(gap) ? null : Math.round(gap),
        maxWidth: estilo.maxWidth,
      };
    }
    return saida;
  }, seletores);
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
