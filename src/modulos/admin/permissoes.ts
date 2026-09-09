import 'server-only';

/**
 * Terceira camada de autorização (architecture.md §5.2): a permissão de módulo
 * do admin, consultada no serviço e na página.
 *
 * **Não** entra no middleware, e a razão é medida: seria uma consulta a
 * `us-west-2` por requisição, com a função em `gru1`. A guarda de rota decide
 * "é admin?"; qual módulo esse admin pode ver e escrever é decisão de página.
 *
 * A fonte é a RPC `tem_permissao(modulo, escrita)` da migration `0003`, que é
 * a **mesma** função que as policies chamam. Um só predicado para a policy e
 * para a tela é o que impede o caso pior de todos: um botão habilitado cuja
 * ação a RLS recusa em silêncio — que, num `update`, é zero linhas afetadas
 * sem erro nenhum.
 */

import { estourarSeErro } from '@/lib/supabase/erros';
import { criarClienteServidor } from '@/lib/supabase/servidor';

/**
 * Módulos de `permissao_admin`, como a `0003` os semeia.
 *
 * A tela 27.4 do protótipo tem quatro chaves (`gestao`, `moderacao`,
 * `financeiro`, `equipe`); a tabela tem seis, com `pacotes` e `configuracao`
 * separados de `financeiro`. A divergência está registrada em
 * `docs/prd/07-pendencias-e-divergencias.md`: a granularidade maior fica, e a
 * tela do protótipo mapeia `pacotes` junto de `financeiro` até o cliente
 * decidir.
 */
export const ModuloAdmin = {
  GESTAO: 'gestao',
  MODERACAO: 'moderacao',
  FINANCEIRO: 'financeiro',
  PACOTES: 'pacotes',
  EQUIPE: 'equipe',
  CONFIGURACAO: 'configuracao',
} as const;

export type ModuloAdmin = (typeof ModuloAdmin)[keyof typeof ModuloAdmin];

export type Permissao = {
  readonly podeLer: boolean;
  readonly podeEscrever: boolean;
};

/**
 * Uma ida ao banco, não duas.
 *
 * Ler e escrever quase sempre são consultados juntos — a página precisa de
 * "posso abrir?" e de "mostro o botão Salvar?" no mesmo render.
 */
export async function lerPermissao(modulo: ModuloAdmin): Promise<Permissao> {
  const supabase = await criarClienteServidor();

  const [leitura, escrita] = await Promise.all([
    supabase.rpc('tem_permissao', { p_modulo: modulo }),
    supabase.rpc('tem_permissao', { p_modulo: modulo, p_escrita: true }),
  ]);

  estourarSeErro(leitura.error);
  estourarSeErro(escrita.error);

  return { podeLer: leitura.data === true, podeEscrever: escrita.data === true };
}
