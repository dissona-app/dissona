import { ROTA } from '@/lib/guarda-rota';
import type { Papel } from '@/lib/papeis';
import { ehPassoDaAvaliacao, type PassoDaAvaliacao } from '@/modulos/avaliacao/tipos';
import { CURADOR_MANUTENCAO } from '@/textos/curador';
import { ARTISTA_PERFIL, ARTISTA_VITRINE, PAINEIS } from '@/textos/prototipo';

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
  [ROTA.ADMIN_USUARIOS]: {
    titulo: 'Curadores e artistas',
    sublegenda: 'Usuários, aprovações e promoções.',
  },
  [ROTA.ADMIN_PACOTES]: {
    titulo: 'Pacotes de Claves',
    sublegenda: 'Pacotes que o artista compra.',
  },
  [ROTA.ADMIN_PACOTES_NOVO]: {
    titulo: 'Novo pacote',
    sublegenda: 'Defina a quantidade, o valor e o desconto.',
  },
  [ROTA.ADMIN_FINANCEIRO]: {
    titulo: 'Financeiro da plataforma',
    sublegenda: 'Receita, repasses e conciliação.',
  },
  [ROTA.ADMIN_MODERACAO]: {
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

  // 7.1 — **duas** telas, como no protótipo: a vitrine ("Perfil", sem
  // sublegenda no cabeçalho — `appSub` é `false` ali) e o formulário ("Editar
  // cadastro", com "Atualize o que os curadores veem."). A frase
  // "Curadores veem essas informações…" é a primeira linha do corpo do
  // formulário, e continua lá, no `Painel`.
  [ROTA.ARTISTA_PERFIL]: { titulo: ARTISTA_VITRINE.titulo },
  [ROTA.ARTISTA_PERFIL_EDITAR]: {
    titulo: ARTISTA_PERFIL.titulo,
    sublegenda: 'Atualize o que os curadores veem.',
  },

  // 5 e 5.3. O extrato vem **antes** da carteira no objeto por clareza; a
  // resolução é por chave exata, então a ordem não decide nada — quem casaria
  // por prefixo é o mapa de baixo.
  [ROTA.ARTISTA_EXTRATO]: {
    titulo: 'Extrato',
    sublegenda: 'O que entrou, o que saiu e o que voltou.',
  },
  [ROTA.ARTISTA_CARTEIRA]: {
    titulo: 'Carteira',
    sublegenda: 'Seu saldo e histórico de Claves.',
  },
  [ROTA.ARTISTA_PACOTES]: {
    titulo: 'Comprar Claves',
    sublegenda: 'Quanto maior o pacote, menor o preço por Clave.',
  },

  // 3 — o wizard de envio. As subrotas (`/<faixaId>/<passo>`) caem no mapa de
  // prefixo, logo abaixo, porque têm segmento dinâmico.
  [ROTA.ARTISTA_ENVIAR]: {
    titulo: 'Enviar música',
    sublegenda: 'Comece pelo link ou pelo arquivo da faixa.',
  },

  // 13 — a fila. O detalhe (13.1) tem segmento dinâmico e cai no prefixo.
  [ROTA.CURADOR_FILA]: {
    titulo: 'Fila de avaliações',
    sublegenda: 'Faixas pendentes para avaliar.',
  },

  // 14 — a avaliação. As cinco etapas têm segmento dinâmico e caem no prefixo;
  // esta entrada existe para a raiz `/curador/avaliar`, que redireciona.
  [ROTA.CURADOR_AVALIAR]: {
    titulo: 'Avaliação',
    sublegenda: 'Ouça, dê as notas e escreva a devolutiva.',
  },

  // 12.6 — derivada: a sidebar do protótipo **não** tem "Meu cadastro", e o
  // acesso é pela aba Perfil de Conta, que leva a esta rota. Título e
  // sublegenda vêm do PRD §12.6.
  [ROTA.CURADOR_MEU_CADASTRO]: {
    titulo: CURADOR_MANUTENCAO.titulo,
    sublegenda: CURADOR_MANUTENCAO.subtitulo,
  },

  // Raiz dos outros dois ambientes — o "Início" de cada um. Sem entrada aqui
  // elas cairiam no nome do ambiente ("Artista"), que como `<h1>` de uma tela
  // não diz o que a tela é.
  //
  // ⚠️ `/curador` mostrava "Fila de avaliações", o **mesmo** título de
  // `/curador/fila`: dois `<h1>` iguais em rotas diferentes, num deles falso.
  [ROTA.ARTISTA]: { titulo: PAINEIS.artista.titulo, sublegenda: PAINEIS.artista.sublegenda },
  [ROTA.CURADOR]: { titulo: PAINEIS.curador.titulo, sublegenda: PAINEIS.curador.sublegenda },
};

/**
 * Sublegenda por etapa da avaliação (14 → 14.4).
 *
 * É o único caso em que o protótipo troca a sublegenda **dentro** da mesma
 * rota: `appSub` indexa `s.avStep`. O título não muda — quem diz onde a pessoa
 * está é o indicador de passo.
 */
const SUBLEGENDA_DA_AVALIACAO: Readonly<Record<PassoDaAvaliacao, string>> = {
  notas: 'Escute e dê nota por critério.',
  subjetiva: 'Sua leitura por inteiro, assinada.',
  compartilhamento: 'Leve a faixa para fora da plataforma.',
  outras: 'Diga onde a faixa vai circular.',
  remuneracao: 'Como o repasse foi calculado.',
};

/**
 * Prefixo → título, para as rotas com segmento dinâmico.
 *
 * A ordem importa: o primeiro que casa vence, então o mais específico vem
 * antes. `/admin/pacotes/novo` já está em `EXATOS` e nunca chega aqui.
 */
const POR_PREFIXO: readonly (readonly [string, TituloDeModulo])[] = [
  [
    `${ROTA.ADMIN_PACOTES}/`,
    { titulo: 'Editar pacote', sublegenda: 'Defina a quantidade, o valor e o desconto.' },
  ],
  // Os passos 2 e 3 do envio — `/artista/enviar/<faixaId>/<passo>`. O título é
  // o mesmo do passo 1: o wizard é uma tela só, e quem diz onde a pessoa está
  // é o indicador de passo, não o cabeçalho.
  [`${ROTA.ARTISTA_ENVIAR}/`, EXATOS[ROTA.ARTISTA_ENVIAR] as TituloDeModulo],
  // 13.1 — o detalhe tem cabeçalho próprio no protótipo (`naFila && s.filaSel`
  // troca `appTitle` e `appSub`), e não o da fila.
  [
    `${ROTA.CURADOR_FILA}/`,
    { titulo: 'Detalhe da faixa', sublegenda: 'Contexto do artista e serviço contratado.' },
  ],
  // 14 · 14.1 · 14.2 · 14.3 · 14.4 — as cinco etapas, como no envio: o
  // cabeçalho não muda, e quem diz onde a pessoa está é o indicador de passo.
  [`${ROTA.CURADOR_AVALIAR}/`, EXATOS[ROTA.CURADOR_AVALIAR] as TituloDeModulo],
];

export function tituloDoCaminho(caminho: string, papel: Papel): TituloDeModulo {
  const semBarraFinal = caminho.length > 1 ? caminho.replace(/\/+$/, '') : caminho;

  const exato = EXATOS[semBarraFinal];
  if (exato !== undefined) return exato;

  // As cinco etapas da avaliação, antes do mapa de prefixo: é o mesmo título
  // com sublegenda por passo, e o passo é o último segmento da rota
  // (`/curador/avaliar/<envioId>/<passo>`).
  if (semBarraFinal.startsWith(`${ROTA.CURADOR_AVALIAR}/`)) {
    const ultimo = semBarraFinal.slice(semBarraFinal.lastIndexOf('/') + 1);
    if (ehPassoDaAvaliacao(ultimo)) {
      return { titulo: 'Avaliação', sublegenda: SUBLEGENDA_DA_AVALIACAO[ultimo] };
    }
  }

  for (const [prefixo, titulo] of POR_PREFIXO) {
    if (semBarraFinal.startsWith(prefixo)) return titulo;
  }

  // Rota sem entrada no mapa cai no nome do ambiente. É o que acontece com
  // as telas que ainda não existem, e é melhor que um título vazio.
  return { titulo: NOME_AMBIENTE[papel] };
}
