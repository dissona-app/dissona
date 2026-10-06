import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { urlDoSite } from '@dissona/nucleo/lib/ambiente';
import type { LeituraDePapeis } from '@dissona/nucleo/lib/papeis';
import { lerContextoSessao } from '@dissona/nucleo/lib/papeis';
import type { SessaoDaRequisicao } from '@dissona/nucleo/lib/supabase/middleware';
import { renovarSessao } from '@dissona/nucleo/lib/supabase/middleware';

import { decidirNoPainel } from './lib/decisao';

const SEM_SESSAO: LeituraDePapeis = { estado: 'sem_sessao' };

/**
 * Renova a sessão e aplica a guarda do painel (`lib/decisao.ts`).
 *
 * Mesmo contrato do middleware do app principal: toda saída parte da resposta
 * de `renovarSessao`, que carrega os cookies renovados, e falha de sessão
 * degrada para "sem sessão" em vez de derrubar a página.
 */
export async function middleware(requisicao: NextRequest) {
  let sessao: SessaoDaRequisicao | null = null;

  try {
    sessao = await renovarSessao(requisicao);
  } catch (erro) {
    console.error('[middleware] não foi possível renovar a sessão:', erro);
  }

  const resposta = sessao?.resposta ?? NextResponse.next({ request: requisicao });

  let leitura: LeituraDePapeis = SEM_SESSAO;
  if (sessao !== null) {
    try {
      leitura = await lerContextoSessao(sessao.supabase, sessao.usuarioId);
    } catch (erro) {
      console.error('[middleware] não foi possível ler o contexto da sessão:', erro);
    }
  }

  const url = requisicao.nextUrl;
  const decisao = decidirNoPainel({
    caminho: url.pathname,
    busca: url.search,
    codigoDeAutenticacao: url.searchParams.get('code'),
    leitura,
    urlDoSite: urlDoSite(),
  });

  if (decisao.tipo === 'seguir') return resposta;

  // Do cabeçalho, como `origem.ts`: atrás do `next start`, `url.origin` é o
  // endereço de escuta, e não o host que o navegador pediu.
  const host =
    requisicao.headers.get('x-forwarded-host') ?? requisicao.headers.get('host') ?? url.host;
  const redirecionamento = NextResponse.redirect(
    new URL(decisao.para, `${url.protocol}//${host}`),
    decisao.permanente ? 308 : 307,
  );
  for (const cookie of resposta.cookies.getAll()) {
    redirecionamento.cookies.set(cookie);
  }
  return redirecionamento;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};
