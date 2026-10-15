import { createServerClient } from '@supabase/ssr';
import { isAuthApiError } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { ambiente } from '@dissona/nucleo/lib/ambiente';
import { cabecalhosDoVisitante } from '@dissona/nucleo/lib/supabase/origem-do-visitante';
import type { Database } from '@dissona/nucleo/lib/supabase/tipos-bd';

export type SessaoDaRequisicao = {
  /** Resposta já com os cookies de sessão renovados. Sempre use esta. */
  readonly resposta: NextResponse;
  readonly usuarioId: string | null;
  /**
   * A validação falhou por um motivo que **não** diz que a sessão acabou —
   * rede, timeout, 5xx do Auth, limite de CPU da borda. Com cookie de sessão
   * presente, o middleware deixa a navegação seguir em vez de mandar ao login.
   */
  readonly indeterminada: boolean;
  /** Reaproveitado para as leituras da guarda, evitando um segundo cliente. */
  readonly supabase: SupabaseClient<Database>;
};

/**
 * Renova a sessão do Supabase na borda e devolve a resposta com os cookies
 * atualizados.
 *
 * A resposta **precisa** ser a que o middleware retorna: é nela que estão os
 * cookies renovados. Devolver uma `NextResponse` nova descarta a renovação e
 * o usuário é deslogado no meio da navegação.
 */
export async function renovarSessao(requisicao: NextRequest): Promise<SessaoDaRequisicao> {
  let resposta = NextResponse.next({ request: requisicao });

  const supabase = createServerClient<Database>(
    ambiente.supabase.url,
    ambiente.supabase.chavePublica,
    {
      global: { headers: cabecalhosDoVisitante(requisicao.headers) },
      cookies: {
        getAll() {
          return requisicao.cookies.getAll();
        },
        setAll(paraDefinir) {
          for (const { name, value } of paraDefinir) {
            requisicao.cookies.set(name, value);
          }
          resposta = NextResponse.next({ request: requisicao });
          for (const { name, value, options } of paraDefinir) {
            resposta.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // `getUser()` valida o token no servidor do Supabase. Não troque por
  // `getSession()`, que só lê o cookie e confia nele.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Erro da API com status < 500 (sessão inexistente, token inválido) é "sem
  // sessão" de verdade. O resto — falha de rede, 5xx, 429 — é indeterminado:
  // deslogar por isso é o que fazia a pessoa cair no login "do nada".
  const indeterminada =
    user === null &&
    error !== null &&
    !(isAuthApiError(error) && (error.status ?? 500) < 500 && error.status !== 429);

  return { resposta, usuarioId: user?.id ?? null, supabase, indeterminada };
}

/** A requisição traz o cookie de sessão do Supabase (`sb-<ref>-auth-token`)? */
export function temCookieDeSessao(requisicao: NextRequest): boolean {
  return requisicao.cookies
    .getAll()
    .some(({ name }) => name.startsWith('sb-') && name.includes('-auth-token'));
}
