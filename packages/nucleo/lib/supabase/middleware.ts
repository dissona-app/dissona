import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { ambiente } from '@dissona/nucleo/lib/ambiente';
import type { Database } from '@dissona/nucleo/lib/supabase/tipos-bd';

export type SessaoDaRequisicao = {
  /** Resposta já com os cookies de sessão renovados. Sempre use esta. */
  readonly resposta: NextResponse;
  readonly usuarioId: string | null;
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
  } = await supabase.auth.getUser();

  return { resposta, usuarioId: user?.id ?? null, supabase };
}
