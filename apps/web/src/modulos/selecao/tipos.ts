import type { Claves } from '@dissona/nucleo/lib/claves';
import type { Database } from '@dissona/nucleo/lib/supabase/tipos-bd';

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

/** Um curador como a tela de seleção o mostra, **já formatado no servidor**. */
export type CuradorNaLista = {
  readonly id: string;
  readonly nome: string;
  readonly classe: 'bronze' | 'prata' | 'ouro';
  readonly precoBase: string;
  /** O mesmo preço em Claves, como número — só para o total exibido. */
  readonly precoBaseClaves: number;
  readonly opcionais: readonly {
    readonly tipo: string;
    readonly rotulo: string;
    readonly preco: string;
    readonly precoClaves: number;
  }[];
};

/**
 * A seleção feita no passo "Escolher curador", carregada na URL até a revisão.
 *
 * Fica na URL, e não no banco, porque nada é debitado antes do "Enviar para
 * curadoria" — e uma escolha que a pessoa abandona não deve deixar rastro.
 */
export type SelecaoNaUrl = Readonly<Record<string, readonly string[]>>;

/** `?curador=a&curador=b&servico:a=playlist` → `{ a: ['playlist'], b: [] }`. */
export function lerSelecaoDaUrl(
  busca: Readonly<Record<string, string | readonly string[] | undefined>>,
): SelecaoNaUrl {
  const lista = (valor: string | readonly string[] | undefined): readonly string[] =>
    valor === undefined ? [] : typeof valor === 'string' ? [valor] : valor;

  const selecao: Record<string, readonly string[]> = {};
  for (const id of lista(busca['curador'])) {
    selecao[id] = lista(busca[`servico:${id}`]);
  }
  return selecao;
}

/** O inverso: a seleção de volta em query string, para o "Voltar" e o "Alterar". */
export function selecaoEmQuery(selecao: SelecaoNaUrl): string {
  const parametros = new URLSearchParams();
  for (const [id, servicos] of Object.entries(selecao)) {
    parametros.append('curador', id);
    for (const servico of servicos) parametros.append(`servico:${id}`, servico);
  }
  const texto = parametros.toString();
  return texto === '' ? '' : `?${texto}`;
}
