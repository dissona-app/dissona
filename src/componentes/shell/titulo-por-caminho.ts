import { ROTA } from '@/lib/guarda-rota';
import type { Papel } from '@/lib/papeis';
import { CURADOR_MANUTENCAO } from '@/textos/curador';
import { ARTISTA_PERFIL } from '@/textos/prototipo';

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
  [ROTA.ADMIN_EQUIPE]: {
    titulo: 'Conta e equipe',
    sublegenda: 'Seus dados, equipe e permissões.',
  },

  // Conta e configurações (7.2/7.4 e 17.2/17.4). Título e sublegenda literais:
  // o artista lê "Configurações", e o curador "Conta e configurações" com a
  // sublegenda do recebimento — são dois blocos diferentes no protótipo, e não
  // um texto genérico servindo aos dois.
  [ROTA.ARTISTA_CONTA]: {
    titulo: 'Configurações',
    sublegenda: 'Conta, preferências e segurança.',
  },
  [ROTA.CURADOR_CONTA]: {
    titulo: 'Conta e configurações',
    sublegenda: 'Dados de recebimento, preferências e segurança.',
  },

  // 7.1 — o protótipo chama a tela de "Editar cadastro" e põe a sublegenda
  // dentro do card, não no cabeçalho. Aqui ela sobe para o cabeçalho, que é
  // onde esta aplicação põe sublegenda de tela.
  [ROTA.ARTISTA_PERFIL]: {
    titulo: ARTISTA_PERFIL.titulo,
    sublegenda: ARTISTA_PERFIL.subtitulo,
  },

  // 5 e 5.3. O extrato vem **antes** da carteira no objeto por clareza; a
  // resolução é por chave exata, então a ordem não decide nada — quem casaria
  // por prefixo é o mapa de baixo.
  [ROTA.ARTISTA_EXTRATO]: {
    titulo: 'Extrato',
    sublegenda: 'Tudo que entrou e saiu da sua carteira.',
  },
  [ROTA.ARTISTA_CARTEIRA]: {
    titulo: 'Carteira',
    sublegenda: 'Seu saldo de Claves e o que já foi usado.',
  },

  // 3 — o wizard de envio. As subrotas (`/<faixaId>/<passo>`) caem no mapa de
  // prefixo, logo abaixo, porque têm segmento dinâmico.
  [ROTA.ARTISTA_ENVIAR]: {
    titulo: 'Enviar música',
    sublegenda: 'Uma faixa por envio. O teto é o seu saldo.',
  },

  // 13 — a fila. O detalhe (13.1) tem segmento dinâmico e cai no prefixo.
  [ROTA.CURADOR_FILA]: {
    titulo: 'Fila de avaliações',
    sublegenda: 'O que está esperando você.',
  },

  // 14 — a avaliação. As cinco etapas têm segmento dinâmico e caem no prefixo;
  // esta entrada existe para a raiz `/curador/avaliar`, que redireciona.
  [ROTA.CURADOR_AVALIAR]: {
    titulo: 'Avaliação',
    sublegenda: 'Ouça, dê as notas e escreva a devolutiva.',
  },

  // 12.6 — derivada: o protótipo tem "Meu cadastro" na sidebar e o aponta para
  // o wizard. Título e sublegenda vêm do PRD §12.6.
  [ROTA.CURADOR_MEU_CADASTRO]: {
    titulo: CURADOR_MANUTENCAO.titulo,
    sublegenda: CURADOR_MANUTENCAO.subtitulo,
  },

  // Raiz dos outros dois ambientes. Sem entrada aqui elas cairiam no nome do
  // ambiente ("Artista"), que como `<h1>` de uma tela não diz o que a tela é.
  [ROTA.ARTISTA]: { titulo: 'Início', sublegenda: 'Sua música e sua carteira.' },
  [ROTA.CURADOR]: { titulo: 'Fila de avaliações', sublegenda: 'O que está esperando você.' },
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
  // Os passos 2 e 3 do envio — `/artista/enviar/<faixaId>/<passo>`. O título é
  // o mesmo do passo 1: o wizard é uma tela só, e quem diz onde a pessoa está
  // é o indicador de passo, não o cabeçalho.
  [`${ROTA.ARTISTA_ENVIAR}/`, EXATOS[ROTA.ARTISTA_ENVIAR] as TituloDeModulo],
  // 13.1 — o detalhe herda o título da fila; quem diz onde a pessoa está é o
  // "Voltar para a fila" e o próprio título da faixa no painel.
  [`${ROTA.CURADOR_FILA}/`, EXATOS[ROTA.CURADOR_FILA] as TituloDeModulo],
  // 14 · 14.1 · 14.2 · 14.3 · 14.4 — as cinco etapas, como no envio: o
  // cabeçalho não muda, e quem diz onde a pessoa está é o indicador de passo.
  [`${ROTA.CURADOR_AVALIAR}/`, EXATOS[ROTA.CURADOR_AVALIAR] as TituloDeModulo],
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
