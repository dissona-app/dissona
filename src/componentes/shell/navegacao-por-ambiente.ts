import { ROTA } from '@/lib/guarda-rota';
import type { Papel } from '@/lib/papeis';

/**
 * Mapa de navegação por ambiente.
 *
 * Os grupos e rótulos vêm dos protótipos da R2 ("MINHA MÚSICA", "CURADORIA",
 * "CONTA" — design-system.md §1.1). Os caminhos usam a constante `ROTA`, e não
 * literais, para que exista um só lugar onde uma URL é definida.
 *
 * `release` marca em qual release a tela existe de verdade. Item de release
 * futura fica visível mas desabilitado: esconder faria a navegação mudar de
 * forma a cada entrega, e o cliente perderia a noção do produto inteiro.
 */

export type ItemNavegacao = {
  readonly rotulo: string;
  readonly caminho: string;
  readonly release: 1 | 2 | 3 | 4 | 5;
};

export type GrupoNavegacao = {
  /** Overline do grupo. `null` para itens soltos no topo. */
  readonly titulo: string | null;
  readonly itens: readonly ItemNavegacao[];
};

const ARTISTA: readonly GrupoNavegacao[] = [
  {
    titulo: null,
    itens: [{ rotulo: 'Início', caminho: ROTA.ARTISTA, release: 4 }],
  },
  {
    titulo: 'Minha música',
    itens: [
      { rotulo: 'Enviar música', caminho: ROTA.ARTISTA_ENVIAR, release: 2 },
      { rotulo: 'Minhas músicas', caminho: `${ROTA.ARTISTA}/musicas`, release: 3 },
      { rotulo: 'Catálogo', caminho: `${ROTA.ARTISTA}/catalogo`, release: 4 },
    ],
  },
  {
    titulo: 'Curadoria',
    itens: [
      { rotulo: 'Escolher curadores', caminho: `${ROTA.ARTISTA}/curadores`, release: 3 },
      { rotulo: 'Relatórios', caminho: `${ROTA.ARTISTA}/relatorios`, release: 4 },
    ],
  },
  {
    titulo: 'Conta',
    itens: [
      { rotulo: 'Perfil', caminho: ROTA.ARTISTA_PERFIL, release: 1 },
      { rotulo: 'Carteira', caminho: ROTA.ARTISTA_CARTEIRA, release: 2 },
      { rotulo: 'Notificações', caminho: `${ROTA.ARTISTA}/notificacoes`, release: 5 },
      { rotulo: 'Configurações', caminho: ROTA.ARTISTA_CONTA, release: 1 },
    ],
  },
];

const CURADOR: readonly GrupoNavegacao[] = [
  {
    titulo: null,
    itens: [{ rotulo: 'Início', caminho: ROTA.CURADOR, release: 4 }],
  },
  {
    titulo: 'Curadoria',
    itens: [
      { rotulo: 'Fila de avaliações', caminho: ROTA.CURADOR_FILA, release: 2 },
      { rotulo: 'Métricas', caminho: `${ROTA.CURADOR}/metricas`, release: 3 },
    ],
  },
  {
    titulo: 'Conta',
    itens: [
      { rotulo: 'Financeiro', caminho: `${ROTA.CURADOR}/financeiro`, release: 4 },
      { rotulo: 'Notificações', caminho: `${ROTA.CURADOR}/notificacoes`, release: 5 },
      { rotulo: 'Meu cadastro', caminho: ROTA.CURADOR_MEU_CADASTRO, release: 1 },
      { rotulo: 'Configurações', caminho: ROTA.CURADOR_CONTA, release: 1 },
    ],
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
    itens: [{ rotulo: 'Início', caminho: ROTA.ADMIN, release: 4 }],
  },
  {
    titulo: 'Gestão',
    itens: [
      { rotulo: 'Curadores e artistas', caminho: `${ROTA.ADMIN}/usuarios`, release: 3 },
      { rotulo: 'Pacotes de Claves', caminho: `${ROTA.ADMIN}/pacotes`, release: 2 },
    ],
  },
  {
    titulo: 'Operação',
    itens: [
      { rotulo: 'Financeiro da plataforma', caminho: `${ROTA.ADMIN}/financeiro`, release: 5 },
      { rotulo: 'Moderação e antifraude', caminho: `${ROTA.ADMIN}/moderacao`, release: 3 },
    ],
  },
  {
    titulo: 'Conta',
    itens: [{ rotulo: 'Conta e equipe', caminho: ROTA.ADMIN_EQUIPE, release: 1 }],
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
