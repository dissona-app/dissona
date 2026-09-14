import type { Claves } from '@/lib/claves';
import type { Database } from '@/lib/supabase/tipos-bd';

/**
 * Seleção de curadores — **placeholder** da R2.
 *
 * A tela real é o módulo 4 e é da R3: busca, filtros com matching de gênero,
 * card com classe e ranking. Aqui existe só o mínimo que faz a R2 ser testável
 * fim a fim — uma lista dos curadores que de fato podem receber envio, e a
 * confirmação que chama `confirmar_selecao_curadores`.
 *
 * ⚠️ A RPC **não** aceita curador qualquer: exige `perfil_curador` em
 * `bronze_aprovado` ou `prata_aprovado` (`DS011`) e com serviço `feedback`
 * ativo (`DS012`). Por isso a lista é do banco, e não inventada.
 */

export type TipoServico = Database['public']['Enums']['tipo_servico'];
export type ClasseCurador = Database['public']['Enums']['classe_curador'];

export type ServicoOferecido = {
  readonly tipo: TipoServico;
  readonly descricao: string | null;
  readonly precoClaves: Claves;
};

export type CuradorDisponivel = {
  readonly perfilCuradorId: string;
  readonly nome: string;
  readonly classe: ClasseCurador;
  readonly servicos: readonly ServicoOferecido[];
};

/** O que a tela manda para a RPC: um curador e os serviços escolhidos dele. */
export type EscolhaDeCurador = {
  readonly perfilCuradorId: string;
  readonly servicos: readonly TipoServico[];
};

/**
 * `feedback` entra sempre, mesmo que a pessoa não o marque.
 *
 * É o serviço-base da curadoria: sem ele não há devolutiva, e a própria RPC o
 * inclui à força. Deixar a interface sugerir que ele é opcional seria mostrar
 * um preço que não corresponde ao que vai ser cobrado.
 */
export const SERVICO_OBRIGATORIO: TipoServico = 'feedback';
