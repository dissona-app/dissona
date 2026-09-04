/**
 * Leitura dos papéis da conta.
 *
 * A tabela `papel_usuario` nasce na migration `0001`, que é da **R1**
 * (data-model §11). Até ela existir, a leitura devolve `sem_esquema` — e a
 * guarda de rota trata esse estado explicitamente, em vez de assumir "sem
 * papel" e prender todo mundo na seleção de perfil.
 *
 * Não se aplica uma guarda de papel que ainda não existe. O que a R0 pode
 * exigir de verdade é sessão; o recorte por papel entra junto com a tabela.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export const Papel = {
  ARTISTA: 'artista',
  CURADOR: 'curador',
  ADMIN: 'admin',
} as const;

export type Papel = (typeof Papel)[keyof typeof Papel];

export type LeituraDePapeis =
  | { readonly estado: 'sem_esquema' }
  | { readonly estado: 'sem_sessao' }
  | { readonly estado: 'ok'; readonly papeis: readonly Papel[] };

/** Código do Postgres para "relação não existe". */
const RELACAO_INEXISTENTE = '42P01';

/**
 * O cliente é recebido como parâmetro (e tipado de forma frouxa) porque
 * `papel_usuario` ainda não está em `tipos-bd.ts`. Na R1, com os tipos
 * gerados, isto passa a usar `ClienteServidor` e some o `unknown`.
 */
export async function lerPapeis(
  supabase: SupabaseClient,
  usuarioId: string | null,
): Promise<LeituraDePapeis> {
  if (usuarioId === null) return { estado: 'sem_sessao' };

  const { data, error } = await supabase
    .from('papel_usuario')
    .select('papel, ativo')
    .eq('perfil_id', usuarioId)
    .eq('ativo', true);

  if (error !== null) {
    if (error.code === RELACAO_INEXISTENTE) return { estado: 'sem_esquema' };
    throw error;
  }

  const papeis = (data ?? [])
    .map((linha) => (linha as { papel: string }).papel)
    .filter((papel): papel is Papel => Object.values<string>(Papel).includes(papel));

  return { estado: 'ok', papeis };
}

export function temPapel(leitura: LeituraDePapeis, papel: Papel): boolean {
  return leitura.estado === 'ok' && leitura.papeis.includes(papel);
}
