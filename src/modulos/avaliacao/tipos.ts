import type { Database } from '@/lib/supabase/tipos-bd';

/**
 * Avaliação — módulo 14.
 *
 * Wizard de cinco etapas, com `avaliacao.passo_atual` (1–5) persistido: é ele
 * que sustenta o "Salvar e sair" que o protótipo oferece em todas as telas.
 */

export type GrupoCriterio = Database['public']['Enums']['grupo_criterio'];
export type ModalidadeCompartilhamento = Database['public']['Enums']['modalidade_compartilhamento'];
export type ClasseCurador = Database['public']['Enums']['classe_curador'];

/**
 * As cinco etapas.
 *
 * `outras` (14.3) existe como passo mas **não** ganha marca própria no
 * indicador — o protótipo mostra quatro rótulos para cinco etapas, e agrupa
 * "Outras formas" sob "Compartilhamento". Ver `PASSO_NO_INDICADOR`.
 */
export const PASSOS = ['notas', 'subjetiva', 'compartilhamento', 'outras', 'remuneracao'] as const;

export type PassoDaAvaliacao = (typeof PASSOS)[number];

export function ehPassoDaAvaliacao(valor: string | undefined): valor is PassoDaAvaliacao {
  return (PASSOS as readonly string[]).includes(valor ?? '');
}

/** `passo_atual` no banco é 1–5, na ordem de `PASSOS`. */
export function numeroDoPasso(passo: PassoDaAvaliacao): number {
  return PASSOS.indexOf(passo) + 1;
}

export function passoDoNumero(numero: number): PassoDaAvaliacao {
  return PASSOS[Math.min(Math.max(numero, 1), PASSOS.length) - 1] ?? 'notas';
}

/** Qual das quatro marcas do indicador cada passo acende. */
export const PASSO_NO_INDICADOR: Readonly<Record<PassoDaAvaliacao, number>> = {
  notas: 0,
  subjetiva: 1,
  compartilhamento: 2,
  outras: 2,
  remuneracao: 3,
};

/**
 * As quatro formas de divulgação, na ordem em que `shareMeta` do protótipo as
 * lista.
 *
 * `nao_compartilhou` fica **fora** desta lista e entra separada em
 * `MODALIDADES`: no protótipo ela não é um quinto cartão, é a caixa abaixo dos
 * quatro — e é a única que o `check`
 * `compartilhamento_nao_compartilhou_e_vazio` obriga a vir sem link.
 */
export const MODALIDADES_DE_DIVULGACAO = [
  'playlist',
  'post',
  'materia',
  'outros',
] as const satisfies readonly ModalidadeCompartilhamento[];

/**
 * A escolha é **exclusiva**: `compartilhamento` tem `avaliacao_id` único e uma
 * só `modalidade`. O protótipo deixa marcar várias e somaria um acréscimo só de
 * qualquer forma; o banco decide, e o banco guarda uma.
 */
export const MODALIDADES = [
  ...MODALIDADES_DE_DIVULGACAO,
  'nao_compartilhou',
] as const satisfies readonly ModalidadeCompartilhamento[];

export function ehModalidade(valor: string | undefined): valor is ModalidadeCompartilhamento {
  return (MODALIDADES as readonly string[]).includes(valor ?? '');
}

/** Um dos 11 critérios, do catálogo `criterio` (seed da `0008`). */
export type Criterio = {
  readonly chave: string;
  readonly grupo: GrupoCriterio;
  readonly rotulo: string;
  readonly obrigatorio: boolean;
  readonly ordem: number;
};

export type NotaDeCriterio = {
  readonly criterio: string;
  readonly nota: number;
  readonly justificativa: string | null;
};

export type CompartilhamentoEmEdicao = {
  readonly modalidade: ModalidadeCompartilhamento;
  readonly descricao: string | null;
  readonly url: string | null;
};

/** O rascunho como as telas do wizard o lêem. */
export type AvaliacaoEmEdicao = {
  readonly id: string | null;
  readonly envioId: string;
  readonly notaSubjetiva: number | null;
  readonly feedback: string | null;
  readonly escutaPercentual: number;
  readonly passoAtual: number;
  readonly concluida: boolean;
  readonly notas: readonly NotaDeCriterio[];
  readonly compartilhamento: CompartilhamentoEmEdicao | null;
};

/**
 * Os números de negócio que a avaliação precisa, todos de `configuracao`.
 *
 * Nunca constantes daqui: o gate de escuta, os mínimos de caracteres e os
 * percentuais de acréscimo são decisão do cliente e mudam por `update`.
 */
export type RegrasDaAvaliacao = {
  readonly escutaMinimaPercentual: number;
  readonly feedbackMinCaracteres: number;
  readonly justificativaMinCaracteres: number;
  readonly criteriosObrigatorios: readonly string[];
  readonly acrescimoJustificativaMinItens: number;
};

/** Os quatro opcionais que `calcular_remuneracao` conhece. */
export type OpcionaisCumpridos = {
  readonly onze_criterios: boolean;
  readonly justificativas_250: boolean;
  readonly feedback_150: boolean;
  readonly compartilhou: boolean;
};

/** O que `calcular_remuneracao` devolve — a previsão da tela 14.4. */
export type Remuneracao = {
  readonly pisoPercentual: number;
  readonly percentualAplicado: number;
  readonly tetoPercentual: number;
  readonly penalidadePrazo: boolean;
  readonly baseCentavos: bigint;
  readonly valorCentavos: bigint;
  readonly comissaoCentavos: bigint;
  readonly acrescimos: readonly { readonly chave: string; readonly percentual: number }[];
};

/**
 * Uma linha do histórico em "Notas e feedback" — a avaliação e a faixa dela.
 *
 * `valorCentavos` é o de `ganho_curador`, congelado na entrega; `null` enquanto
 * a avaliação é rascunho.
 */
export type ItemDoHistorico = {
  readonly envioId: string;
  readonly titulo: string;
  readonly artista: string;
  readonly concluida: boolean;
  readonly passoAtual: number;
  readonly notaSubjetiva: number | null;
  readonly noPrazo: boolean | null;
  readonly concluidaEm: Date | null;
  readonly atualizadaEm: Date;
  readonly valorCentavos: bigint | null;
};
