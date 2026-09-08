/**
 * Leitura do contexto de sessão: papéis ativos e conclusão do cadastro do
 * curador.
 *
 * Uma consulta, não duas. O `middleware.ts` roda em `gru1` e o banco está em
 * `us-west-2` — cada ida custa ~120 ms (architecture.md §9), e a guarda de
 * `(app)/curador` precisa das duas informações em toda navegação. A RPC
 * `ler_contexto_sessao()` (migration `0002`) devolve as duas de uma vez.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from './supabase/tipos-bd';

export const Papel = {
  ARTISTA: 'artista',
  CURADOR: 'curador',
  ADMIN: 'admin',
} as const;

export type Papel = (typeof Papel)[keyof typeof Papel];

export type LeituraDePapeis =
  | { readonly estado: 'sem_sessao' }
  | {
      readonly estado: 'ok';
      readonly papeis: readonly Papel[];
      /** `perfil_curador.cadastro_concluido_em is not null` — guarda da rota do curador. */
      readonly cadastroCuradorConcluido: boolean;
    };

/** Aceita qualquer cliente tipado — o do servidor e o do middleware. */
type Cliente = SupabaseClient<Database>;

export async function lerContextoSessao(
  supabase: Cliente,
  usuarioId: string | null,
): Promise<LeituraDePapeis> {
  if (usuarioId === null) return { estado: 'sem_sessao' };

  const { data, error } = await supabase.rpc('ler_contexto_sessao').single();

  if (error !== null) throw error;

  const papeis = (data.papeis ?? []).filter((papel): papel is Papel =>
    Object.values<string>(Papel).includes(papel),
  );

  return {
    estado: 'ok',
    papeis,
    cadastroCuradorConcluido: data.cadastro_curador_concluido ?? false,
  };
}

export function temPapel(leitura: LeituraDePapeis, papel: Papel): boolean {
  return leitura.estado === 'ok' && leitura.papeis.includes(papel);
}
