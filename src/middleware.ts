import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { decidirAcesso } from './lib/guarda-rota';
import { lerPapeis } from './lib/papeis';
import { renovarSessao } from './lib/supabase/middleware';

/**
 * Renova a sessão e aplica a guarda de papel por route group.
 *
 * A resposta devolvida por `renovarSessao` carrega os cookies renovados — todo
 * caminho de saída daqui tem de partir dela, inclusive os redirecionamentos,
 * senão o usuário é deslogado no meio da navegação.
 */
export async function middleware(requisicao: NextRequest) {
  const { resposta, usuarioId, supabase } = await renovarSessao(requisicao);

  const leitura = await lerPapeis(supabase, usuarioId);

  const decisao = decidirAcesso({
    caminho: requisicao.nextUrl.pathname,
    leitura,
    // `perfil_curador.passo_cadastro` nasce na migration `0002` (R1). Até lá
    // o estado do cadastro é indeterminado.
    cadastroCuradorConcluido: null,
  });

  if (decisao.tipo === 'seguir') return resposta;

  const destino = new URL(decisao.para, requisicao.nextUrl.origin);
  const redirecionamento = NextResponse.redirect(destino);
  // Transporta os cookies renovados para a resposta de redirecionamento.
  for (const cookie of resposta.cookies.getAll()) {
    redirecionamento.cookies.set(cookie);
  }
  return redirecionamento;
}

export const config = {
  /**
   * Roda em tudo, menos arquivos estáticos e imagens. Sem isso o middleware
   * é invocado para cada asset e cada chamada gasta um `getUser()`.
   */
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};
