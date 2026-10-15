import { ROTA } from '@dissona/nucleo/lib/guarda-rota';
import type { Papel } from '@dissona/nucleo/lib/papeis';
import {
  PASSO_NO_INDICADOR,
  ehPassoDaAvaliacao,
  type PassoDaAvaliacao,
} from '@dissona/nucleo/modulos/avaliacao/tipos';
import { CURADOR_MANUTENCAO } from '@dissona/nucleo/textos/curador';
import { ARTISTA_PERFIL, ARTISTA_VITRINE, PAINEIS } from '@dissona/nucleo/textos/prototipo';

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
  /** Rótulo roxo acima do título — o protótipo aprovado usa na Fila e na Avaliação. */
  readonly sobretitulo?: string;
};

/** Rota exata → título. Consultado antes das regras de prefixo. */
const EXATOS: Readonly<Record<string, TituloDeModulo>> = {
  [ROTA.ADMIN]: {
    titulo: 'Painel administrativo',
    sublegenda: 'Envios, devolutivas, receita e o que pede decisão hoje.',
  },
  [ROTA.ADMIN_USUARIOS]: {
    titulo: 'Curadores e artistas',
    sublegenda: 'Aprovação de classes, suspensões e histórico de cada conta.',
  },
  [ROTA.ADMIN_PACOTES]: {
    titulo: 'Pacotes de Claves',
    sublegenda: 'Preço, desconto e disponibilidade dos pacotes na Carteira do artista.',
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
    sublegenda: 'Seus dados de acesso, integrantes da equipe e permissões.',
  },

  // Conta e configurações (7.2/7.4 e 17.2/17.4). Título e sublegenda literais:
  // o artista lê "Configurações", e o curador "Conta e configurações" com a
  // sublegenda do recebimento — são dois blocos diferentes no protótipo, e não
  // um texto genérico servindo aos dois.
  [ROTA.ARTISTA_CONTA]: {
    titulo: 'Configurações',
    sublegenda: 'Acesso, segurança, preferências e privacidade da conta.',
  },
  [ROTA.CURADOR_CONTA]: {
    titulo: 'Conta e configurações',
    sublegenda: 'Acesso, segurança, preferências e dados de recebimento.',
  },

  // 7.1 — **duas** telas, como no protótipo: a vitrine ("Perfil", sem
  // sublegenda no cabeçalho — `appSub` é `false` ali) e o formulário ("Editar
  // cadastro", com "Atualize o que os curadores veem."). A frase
  // "Curadores veem essas informações…" é a primeira linha do corpo do
  // formulário, e continua lá, no `Painel`.
  [ROTA.ARTISTA_PERFIL]: {
    titulo: ARTISTA_VITRINE.titulo,
    sublegenda: 'Como os curadores veem você antes de aceitar a faixa.',
  },
  [ROTA.ARTISTA_PERFIL_EDITAR]: {
    titulo: ARTISTA_PERFIL.titulo,
    sublegenda: 'Dados do artista, links e gêneros que você trabalha.',
  },

  // 5 e 5.3. O extrato vem **antes** da carteira no objeto por clareza; a
  // resolução é por chave exata, então a ordem não decide nada — quem casaria
  // por prefixo é o mapa de baixo.
  [ROTA.ARTISTA_EXTRATO]: {
    titulo: 'Extrato de Claves',
    sublegenda: 'Cada Clave que entrou e saiu da sua conta.',
  },
  [ROTA.ARTISTA_CARTEIRA]: {
    titulo: 'Carteira',
    sublegenda: 'Saldo de Claves, compras e o que já foi usado em envios.',
  },
  [ROTA.ARTISTA_PACOTES]: {
    titulo: 'Pacotes de Claves',
    sublegenda: 'Quanto mais Claves no pacote, menor o preço de cada uma.',
  },

  // 3 — o wizard de envio. As subrotas (`/<faixaId>/<passo>`) caem no mapa de
  // prefixo, logo abaixo, porque têm segmento dinâmico.
  [ROTA.ARTISTA_ENVIAR]: {
    titulo: 'Enviar faixa',
    sublegenda: 'Comece pelo link ou pelo arquivo da faixa.',
  },

  // 13 — a fila. O detalhe (13.1) tem segmento dinâmico e cai no prefixo.
  [ROTA.CURADOR_FILA]: {
    sobretitulo: 'Avaliações',
    titulo: 'Fila',
    sublegenda: 'Faixas pendentes para avaliar.',
  },

  // 14 — a avaliação. As cinco etapas têm segmento dinâmico e caem no prefixo;
  // esta entrada existe para a raiz `/curador/avaliar`, que redireciona.
  // A raiz `/curador/avaliar` é "Notas e feedback" (o histórico) no protótipo.
  [ROTA.CURADOR_AVALIAR]: {
    sobretitulo: 'Suas avaliações',
    titulo: 'Notas e feedback',
    sublegenda: 'Suas leituras em andamento e as que você já concluiu.',
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

/** Título e sublegenda de cada passo do envio, literais do protótipo aprovado. */
const TITULO_DO_PASSO_DO_ENVIO: Readonly<Record<string, TituloDeModulo>> = {
  contexto: {
    titulo: 'Enviar faixa',
    sublegenda: 'Conte ao curador o que ele precisa saber antes de ouvir.',
  },
  curadores: {
    titulo: 'Escolher curador',
    sublegenda: 'Um ou mais curadores por faixa. Feedback vem incluso em cada um.',
  },
  revisao: { titulo: 'Revisar envio', sublegenda: 'Confira os dados antes de enviar.' },
  confirmacao: {
    titulo: 'Faixa enviada',
    sublegenda: 'A faixa já está na fila dos curadores escolhidos.',
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
    `${ROTA.ADMIN_PACOTES}/`,
    { titulo: 'Editar pacote', sublegenda: 'Defina a quantidade, o valor e o desconto.' },
  ],
  // 5.2 — o checkout de um pacote (`/artista/pacotes/<pacoteId>`): "Pagamento",
  // como no protótipo aprovado (`caTitulos.checkout`).
  [
    `${ROTA.ARTISTA_PACOTES}/`,
    { titulo: 'Pagamento', sublegenda: 'Confira o pacote e escolha a forma de pagamento.' },
  ],
  // Os passos 2 e 3 do envio — `/artista/enviar/<faixaId>/<passo>`. O título é
  // o mesmo do passo 1: o wizard é uma tela só, e quem diz onde a pessoa está
  // é o indicador de passo, não o cabeçalho.
  // O status de um envio tem cabeçalho próprio no protótipo aprovado.
  // O status de um envio — `/artista/enviar/<faixaId>/status` — tem o
  // cabeçalho próprio do protótipo aprovado.
  [
    'status-do-envio',
    { titulo: 'Status do envio', sublegenda: 'Onde cada curador está na leitura da sua faixa.' },
  ],
  [`${ROTA.ARTISTA_ENVIAR}/`, EXATOS[ROTA.ARTISTA_ENVIAR] as TituloDeModulo],
  // "Editar perfil" do curador — a manutenção que sai da vitrine "Meu perfil".
  [
    `${ROTA.CURADOR_MEU_CADASTRO}/`,
    {
      titulo: 'Editar perfil',
      sublegenda: 'Mídias, serviços e preços, e a classe que você tem hoje.',
    },
  ],
  // 13.1 — o detalhe tem cabeçalho próprio no protótipo (`naFila && s.filaSel`
  // troca `appTitle` e `appSub`), e não o da fila.
  [
    `${ROTA.CURADOR_FILA}/`,
    {
      sobretitulo: 'Fila · Faixa selecionada',
      titulo: 'Detalhe da faixa',
      sublegenda: 'Contexto do artista e serviço contratado.',
    },
  ],
  // 14 · 14.1 · 14.2 · 14.3 · 14.4 — as cinco etapas, como no envio: o
  // cabeçalho não muda, e quem diz onde a pessoa está é o indicador de passo.
  [
    `${ROTA.CURADOR_AVALIAR}/`,
    { titulo: 'Avaliação', sublegenda: 'Ouça, dê as notas e escreva a devolutiva.' },
  ],
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
      return {
        sobretitulo: `Avaliação · Passo ${PASSO_NO_INDICADOR[ultimo] + 1} de 4`,
        titulo: 'Avaliação',
        sublegenda: SUBLEGENDA_DA_AVALIACAO[ultimo],
      };
    }
  }

  // Os passos do envio — `/artista/enviar/<faixaId>/<passo>`. O protótipo
  // aprovado troca título e sublegenda por passo (`enTitulos` e o mapa de
  // `appSub` de `naEnviar`).
  if (semBarraFinal.startsWith(`${ROTA.ARTISTA_ENVIAR}/`)) {
    const ultimo = semBarraFinal.slice(semBarraFinal.lastIndexOf('/') + 1);
    const doPasso = TITULO_DO_PASSO_DO_ENVIO[ultimo];
    if (doPasso !== undefined) return doPasso;
  }

  for (const [prefixo, titulo] of POR_PREFIXO) {
    if (prefixo === 'status-do-envio') {
      if (semBarraFinal.startsWith(`${ROTA.ARTISTA_ENVIAR}/`) && semBarraFinal.endsWith('/status'))
        return titulo;
      continue;
    }
    if (semBarraFinal.startsWith(prefixo)) return titulo;
  }

  // Rota sem entrada no mapa cai no nome do ambiente. É o que acontece com
  // as telas que ainda não existem, e é melhor que um título vazio.
  return { titulo: NOME_AMBIENTE[papel] };
}
