import 'server-only';

/**
 * Cliente Supabase do servidor — Server Components, Server Actions e Route
 * Handlers.
 *
 * Usa a chave publishable, e não a service role: a RLS é a fronteira real
 * (architecture.md §5.2), e um cliente que ignora RLS no caminho de request
 * anula essa fronteira. Jobs que precisem de service role virão em módulos
 * próprios, na release que os exigir.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';

import { ambiente } from '../ambiente';
import { cabecalhosDoVisitante } from './origem-do-visitante';
import type { Database } from './tipos-bd';

export async function criarClienteServidor() {
  const armazem = await cookies();
  // Navegador e IP de quem fez a requisição: é o que o Auth grava na sessão.
  const visitante = cabecalhosDoVisitante(await headers());

  return createServerClient<Database>(ambiente.supabase.url, ambiente.supabase.chavePublica, {
    global: { headers: visitante },
    cookies: {
      getAll() {
        return armazem.getAll();
      },
      setAll(paraDefinir) {
        try {
          for (const { name, value, options } of paraDefinir) {
            armazem.set(name, value, options);
          }
        } catch {
          // Um Server Component não pode escrever cookie. Ignorar é o
          // comportamento correto: a renovação da sessão é responsabilidade do
          // `middleware.ts`, que roda antes e já gravou o cookie atualizado.
        }
      },
    },
  });
}

export type ClienteServidor = Awaited<ReturnType<typeof criarClienteServidor>>;

/** Usuário da sessão corrente, ou `null`. */
export async function usuarioAtual() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
