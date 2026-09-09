import { ROTA } from '@/lib/guarda-rota';
import type { Papel } from '@/lib/papeis';

import { NOME_AMBIENTE } from './navegacao-por-ambiente';

/**
 * Título e sublegenda do header, derivados do caminho.
 *
 * Parece um jeito indireto de resolver "cada página sabe o seu título", e a
 * razão de ser assim é dupla.
 *
 * A primeira é fidelidade: **é o que o protótipo faz**. Em
 * `docs/R2/extraido/Admin.html` o header lê `m = modulos[active]`, com
 * `active` derivado da rota, e sobrescreve para os dois casos especiais
 * (`if (isPacotes) …`, `if (isPacoteEditar) …`). O título não é propriedade da
 * tela; é propriedade da rota.
 *
 * A segunda é estrutural: o `Shell` vive no `layout.tsx`, e no App Router um
 * layout não recebe nada da página que ele envolve. As alternativas eram rotas
 * paralelas (que dobram a árvore de rotas por um `<h1>`) ou repetir o `Shell`
 * em cada `page.tsx` (que remonta a sidebar a cada navegação). Um mapa de
 * rota → título é menos maquinário que as duas, e é testável sem renderizar
 * nada.
 *
 * A sublegenda vem do mesmo mapa do protótipo, verbatim.
 */

export type TituloDeModulo = {
  readonly titulo: string;
  readonly sublegenda?: string;
};

/** Rota exata → título. Consultado antes das regras de prefixo. */
const EXATOS: Readonly<Record<string, TituloDeModulo>> = {
  [ROTA.ADMIN]: { titulo: 'Painel administrativo', sublegenda: 'Visão geral da plataforma.' },
  [`${ROTA.ADMIN}/usuarios`]: {
    titulo: 'Curadores e artistas',
    sublegenda: 'Usuários, aprovações e promoções.',
  },
  [`${ROTA.ADMIN}/pacotes`]: {
    titulo: 'Pacotes de Claves',
    sublegenda: 'Pacotes que o artista compra.',
  },
  [`${ROTA.ADMIN}/pacotes/novo`]: {
    titulo: 'Novo pacote',
    sublegenda: 'Defina a quantidade, o valor e o desconto.',
  },
  [`${ROTA.ADMIN}/financeiro`]: {
    titulo: 'Financeiro da plataforma',
    sublegenda: 'Receita, repasses e conciliação.',
  },
  [`${ROTA.ADMIN}/moderacao`]: {
    titulo: 'Moderação e antifraude',
    sublegenda: 'Denúncias, logs e bloqueios.',
  },
  [`${ROTA.ADMIN}/equipe`]: {
    titulo: 'Conta e equipe',
    sublegenda: 'Seus dados, equipe e permissões.',
  },
};

/**
 * Prefixo → título, para as rotas com segmento dinâmico.
 *
 * A ordem importa: o primeiro que casa vence, então o mais específico vem
 * antes. `/admin/pacotes/novo` já está em `EXATOS` e nunca chega aqui.
 */
const POR_PREFIXO: readonly (readonly [string, TituloDeModulo])[] = [
  [
    `${ROTA.ADMIN}/pacotes/`,
    { titulo: 'Editar pacote', sublegenda: 'Defina a quantidade, o valor e o desconto.' },
  ],
];

export function tituloDoCaminho(caminho: string, papel: Papel): TituloDeModulo {
  const semBarraFinal = caminho.length > 1 ? caminho.replace(/\/+$/, '') : caminho;

  const exato = EXATOS[semBarraFinal];
  if (exato !== undefined) return exato;

  for (const [prefixo, titulo] of POR_PREFIXO) {
    if (semBarraFinal.startsWith(prefixo)) return titulo;
  }

  // Rota sem entrada no mapa cai no nome do ambiente. É o que acontece com
  // as telas que ainda não existem, e é melhor que um título vazio.
  return { titulo: NOME_AMBIENTE[papel] };
}
