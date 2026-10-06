import { ModuloAdmin } from '@dissona/nucleo/modulos/admin/modulos';
import type { Database } from '@dissona/nucleo/lib/supabase/tipos-bd';

/**
 * Tipos do módulo 27 — equipe, convites e permissões.
 *
 * Módulo próprio, e não dentro de `modulos/admin`, porque `admin/permissoes.ts`
 * é infraestrutura de autorização usada por **todas** as telas administrativas.
 * Equipe é uma tela; permissão é uma camada.
 */

export type PapelAdmin = Database['public']['Enums']['papel_admin'];
export type SituacaoMembro = Database['public']['Enums']['situacao_membro_admin'];

/**
 * Os quatro papéis, na ordem do protótipo.
 *
 * `as const satisfies` para o dia em que o enum do banco ganhar um quinto: o
 * `satisfies` falha na compilação em vez de a tela mostrar três opções de
 * quatro.
 */
export const PAPEIS_ADMIN = [
  { valor: 'administrador', rotulo: 'Administrador' },
  { valor: 'moderador', rotulo: 'Moderador' },
  { valor: 'financeiro', rotulo: 'Financeiro' },
  { valor: 'suporte', rotulo: 'Suporte' },
] as const satisfies readonly { readonly valor: PapelAdmin; readonly rotulo: string }[];

export function rotuloDoPapel(papel: PapelAdmin): string {
  return PAPEIS_ADMIN.find((cada) => cada.valor === papel)?.rotulo ?? papel;
}

/**
 * Uma linha da lista de equipe (27.2).
 *
 * Duas origens num tipo só, como a RPC `ler_equipe_admin` devolve: integrante
 * de verdade (`membroId` presente) ou convite pendente (`conviteId` presente).
 * Nunca os dois — quem já é da equipe não aparece como convite, e a RPC filtra
 * isso em SQL.
 *
 * A união discriminada seria mais precisa em teoria e pior aqui: a tela renderiza
 * as duas na **mesma** grade, com as mesmas colunas, e um `switch` por linha só
 * repetiria o mesmo JSX duas vezes.
 */
export type LinhaDaEquipe = {
  readonly membroId: string | null;
  readonly conviteId: string | null;
  readonly perfilId: string | null;
  /** `null` no convite: ninguém aceitou ainda, e não há perfil de onde tirar. */
  readonly nome: string | null;
  readonly email: string;
  readonly cargo: string | null;
  readonly papelAdmin: PapelAdmin;
  readonly situacao: SituacaoMembro;
  /** Só no convite. */
  readonly expiraEm: string | null;
  readonly souEu: boolean;
};

/**
 * Os quatro módulos da matriz da tela 27.4.
 *
 * A tabela `permissao_admin` tem **seis** — `pacotes` e `configuracao` também.
 * A divergência está registrada em `docs/prd/07-pendencias-e-divergencias.md`
 * (#7c): o protótipo tem quatro, a tabela tem seis, e a granularidade maior
 * fica disponível para quando o cliente a exercer.
 *
 * Esta lista é a da **tela**. A RPC aceita qualquer módulo existente, então
 * `pacotes` e `configuracao` seguem governados pelo seed até haver tela para
 * eles — e não são zerados por engano quando esta salva.
 */
export const MODULOS_DA_MATRIZ = [
  ModuloAdmin.GESTAO,
  ModuloAdmin.MODERACAO,
  ModuloAdmin.FINANCEIRO,
  ModuloAdmin.EQUIPE,
] as const;

export type ModuloDaMatriz = (typeof MODULOS_DA_MATRIZ)[number];

/** Nível de acesso de uma célula da matriz. */
export const NivelDeAcesso = {
  NENHUM: 'nenhum',
  LER: 'ler',
  ESCREVER: 'escrever',
} as const;

export type NivelDeAcesso = (typeof NivelDeAcesso)[keyof typeof NivelDeAcesso];

export type CelulaDaMatriz = {
  readonly papel: PapelAdmin;
  readonly modulo: string;
  readonly nivel: NivelDeAcesso;
};

export function nivelDe(podeLer: boolean, podeEscrever: boolean): NivelDeAcesso {
  if (podeEscrever) return NivelDeAcesso.ESCREVER;
  if (podeLer) return NivelDeAcesso.LER;
  return NivelDeAcesso.NENHUM;
}

export function ehNivel(valor: unknown): valor is NivelDeAcesso {
  return typeof valor === 'string' && Object.values<string>(NivelDeAcesso).includes(valor);
}

/**
 * As duas células travadas da matriz, que a tela desenha sem controle.
 *
 * A RPC `definir_permissoes_admin` recusa as duas com `DS020`; aqui elas
 * existem para a tela não **oferecer** o que o servidor vai negar — que é o
 * caso pior de todos (design-system §4.5).
 */
export function celulaTravada(papel: PapelAdmin, modulo: string): boolean {
  return papel === 'administrador' || modulo === ModuloAdmin.EQUIPE;
}

/** O que a ação de convite devolve à tela — o link aparece uma vez. */
export type DadosDoConvite = {
  readonly email: string;
  readonly link: string;
  /** A conta já existia no Auth — o convite vale, e a tela explica isso. */
  readonly jaTinhaConta: boolean;
};
