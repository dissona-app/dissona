import { ROTA } from '@/lib/guarda-rota';
import type { Papel } from '@/lib/papeis';
import { ADMIN_NAVEGACAO, NAVEGACAO_DO_ARTISTA, NAVEGACAO_DO_CURADOR } from '@/textos/prototipo';

/**
 * Mapa de navegação por ambiente.
 *
 * Os grupos e rótulos vêm dos protótipos da R2 e são **diferentes em cada
 * ambiente** — ver `NAVEGACAO_DO_ARTISTA`, `NAVEGACAO_DO_CURADOR` e
 * `ADMIN_NAVEGACAO` em `textos/prototipo`, onde cada lista está com a copy
 * literal da sua sidebar. Os caminhos usam a constante `ROTA`, e não literais,
 * para que exista um só lugar onde uma URL é definida.
 *
 * `release` marca em qual release a tela existe de verdade. Item de release
 * futura fica visível mas desabilitado: esconder faria a navegação mudar de
 * forma a cada entrega, e o cliente perderia a noção do produto inteiro.
 */

export type ItemNavegacao = {
  readonly rotulo: string;
  readonly caminho: string;
  readonly release: 1 | 2 | 3 | 4 | 5;
  /**
   * Por que o item não é clicável, quando "Disponível na Release N" não é a
   * resposta certa. É o caso de "Notas e feedback": a tela **existe** na R2, e
   * o que não existe é um endereço para ela sem uma faixa escolhida.
   */
  readonly motivo?: string;
};

export type GrupoNavegacao = {
  /** Overline do grupo. `null` para itens soltos no topo. */
  readonly titulo: string | null;
  readonly itens: readonly ItemNavegacao[];
};

const ARTISTA: readonly GrupoNavegacao[] = [
  {
    titulo: null,
    itens: [{ rotulo: NAVEGACAO_DO_ARTISTA.inicio, caminho: ROTA.ARTISTA, release: 4 }],
  },
  {
    titulo: NAVEGACAO_DO_ARTISTA.grupoMinhaMusica,
    itens: [
      { rotulo: NAVEGACAO_DO_ARTISTA.enviar, caminho: ROTA.ARTISTA_ENVIAR, release: 2 },
      { rotulo: NAVEGACAO_DO_ARTISTA.minhasFaixas, caminho: `${ROTA.ARTISTA}/faixas`, release: 3 },
      {
        rotulo: NAVEGACAO_DO_ARTISTA.devolutivas,
        caminho: `${ROTA.ARTISTA}/devolutivas`,
        release: 4,
      },
    ],
  },
  {
    titulo: NAVEGACAO_DO_ARTISTA.grupoCuradoria,
    itens: [
      { rotulo: NAVEGACAO_DO_ARTISTA.curadores, caminho: `${ROTA.ARTISTA}/curadores`, release: 3 },
    ],
  },
  {
    titulo: NAVEGACAO_DO_ARTISTA.grupoConta,
    itens: [
      { rotulo: NAVEGACAO_DO_ARTISTA.perfil, caminho: ROTA.ARTISTA_PERFIL, release: 1 },
      { rotulo: NAVEGACAO_DO_ARTISTA.carteira, caminho: ROTA.ARTISTA_CARTEIRA, release: 2 },
      { rotulo: NAVEGACAO_DO_ARTISTA.configuracoes, caminho: ROTA.ARTISTA_CONTA, release: 1 },
    ],
  },
];

const CURADOR: readonly GrupoNavegacao[] = [
  {
    titulo: null,
    itens: [{ rotulo: NAVEGACAO_DO_CURADOR.inicio, caminho: ROTA.CURADOR, release: 4 }],
  },
  {
    titulo: NAVEGACAO_DO_CURADOR.grupoAvaliacoes,
    itens: [
      { rotulo: NAVEGACAO_DO_CURADOR.fila, caminho: ROTA.CURADOR_FILA, release: 2 },
      // O histórico das avaliações — em andamento e entregues. Cada linha leva
      // à avaliação daquele envio, que continua em `/curador/avaliar/<envio>`.
      { rotulo: NAVEGACAO_DO_CURADOR.notas, caminho: ROTA.CURADOR_AVALIAR, release: 2 },
    ],
  },
  {
    titulo: NAVEGACAO_DO_CURADOR.grupoDesempenho,
    itens: [
      { rotulo: NAVEGACAO_DO_CURADOR.metricas, caminho: `${ROTA.CURADOR}/metricas`, release: 3 },
      {
        rotulo: NAVEGACAO_DO_CURADOR.financeiro,
        caminho: `${ROTA.CURADOR}/financeiro`,
        release: 4,
      },
    ],
  },
  {
    titulo: NAVEGACAO_DO_CURADOR.grupoConta,
    itens: [{ rotulo: NAVEGACAO_DO_CURADOR.conta, caminho: ROTA.CURADOR_CONTA, release: 1 }],
  },
];

/*
 * Grupos e rótulos **literais** da sidebar do protótipo do admin
 * (`docs/R2/extraido/Admin.html`): Início solto no topo, depois Gestão,
 * Operação e Conta.
 *
 * A R0 tinha derivado outra estrutura — grupos "Gestão", "Financeiro" e
 * "Conta", com "Aprovações" e "Visão geral" que o protótipo não tem, e sem o
 * grupo "Operação". Pela precedência do AGENTS.md (protótipo > board >
 * derivação), o protótipo vence, e a navegação passa a ter os seis itens que
 * ele tem, com os nomes que ele usa: "Financeiro da plataforma", e não
 * "Financeiro"; "Moderação e antifraude", e não "Moderação"; "Conta e equipe",
 * e não "Equipe".
 */
const ADMIN: readonly GrupoNavegacao[] = [
  {
    titulo: null,
    itens: [{ rotulo: ADMIN_NAVEGACAO.inicio, caminho: ROTA.ADMIN, release: 4 }],
  },
  {
    titulo: ADMIN_NAVEGACAO.grupoGestao,
    itens: [
      {
        rotulo: ADMIN_NAVEGACAO.curadoresEArtistas,
        caminho: ROTA.ADMIN_USUARIOS,
        release: 3,
      },
      { rotulo: ADMIN_NAVEGACAO.pacotes, caminho: ROTA.ADMIN_PACOTES, release: 2 },
    ],
  },
  {
    titulo: ADMIN_NAVEGACAO.grupoOperacao,
    itens: [
      { rotulo: ADMIN_NAVEGACAO.financeiro, caminho: ROTA.ADMIN_FINANCEIRO, release: 5 },
      { rotulo: ADMIN_NAVEGACAO.moderacao, caminho: ROTA.ADMIN_MODERACAO, release: 3 },
    ],
  },
  {
    titulo: ADMIN_NAVEGACAO.grupoConta,
    itens: [{ rotulo: ADMIN_NAVEGACAO.contaEEquipe, caminho: ROTA.ADMIN_EQUIPE, release: 1 }],
  },
];

export const NAVEGACAO: Record<Papel, readonly GrupoNavegacao[]> = {
  artista: ARTISTA,
  curador: CURADOR,
  admin: ADMIN,
};

/** Título do ambiente, usado no header e no `aria-label` da navegação. */
export const NOME_AMBIENTE: Record<Papel, string> = {
  artista: 'Artista',
  curador: 'Curador',
  admin: 'Administração',
};
