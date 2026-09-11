import type { ResultadoDeAcao } from '@/lib/acoes';
import type { PassoDoCadastro } from '@/modulos/curador/tipos';

/**
 * O que todo passo do wizard recebe.
 *
 * As três ações vêm por `props` em vez de serem importadas dentro de cada
 * passo: os componentes são de cliente, e receber a Server Action como
 * referência é o que o Next serializa através da fronteira. Importar
 * `@/modulos/curador/acoes` de um componente `'use client'` funcionaria por
 * acidente e amarraria o componente a uma ação específica — o que impediria
 * reusá-lo em 12.6, a tela de alteração de cadastro.
 */
export type PropsDoPasso = {
  readonly passo: PassoDoCadastro;
  readonly acao: (dados: FormData) => Promise<ResultadoDeAcao>;
  readonly acaoDeVoltar: (dados: FormData) => void | Promise<void>;
  readonly acaoDePular: (dados: FormData) => void | Promise<void>;
};
