import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import type { LeituraDePapeis } from './lib/papeis';
import { decidirAcesso } from './lib/guarda-rota';
import { lerContextoSessao } from './lib/papeis';
import type { SessaoDaRequisicao } from './lib/supabase/middleware';
import { renovarSessao } from './lib/supabase/middleware';

const SEM_SESSAO: LeituraDePapeis = { estado: 'sem_sessao' };

/**
 * Renova a sessão e aplica a guarda de papel por route group.
 *
 * A resposta devolvida por `renovarSessao` carrega os cookies renovados — todo
 * caminho de saída daqui tem de partir dela, inclusive os redirecionamentos,
 * senão o usuário é deslogado no meio da navegação.
 *
 * **Degrada em vez de cair.** Se a configuração do Supabase estiver ausente ou
 * o serviço indisponível, não há como renovar sessão — mas isso não é razão
 * para derrubar a página inteira. As rotas públicas (`/`, `/termos`,
 * `/privacidade`) não dependem de sessão nenhuma, e uma variável de ambiente
 * faltando não deve tirá-las do ar. O middleware segue como "sem sessão": o
 * público continua servido, e o autenticado redireciona para o login.
 *
 * Aprendido na prática: sem esta guarda, um deploy sem as env vars devolvia
 * `MIDDLEWARE_INVOCATION_FAILED` em **todas** as rotas.
 */
export async function middleware(requisicao: NextRequest) {
  let sessao: SessaoDaRequisicao | null = null;

  try {
    sessao = await renovarSessao(requisicao);
  } catch (erro) {
    // Alto o suficiente para aparecer no log da função, sem repetir por asset
    // (o `matcher` já exclui estáticos).
    console.error('[middleware] não foi possível renovar a sessão:', erro);
  }

  const resposta = sessao?.resposta ?? NextResponse.next({ request: requisicao });

  let leitura: LeituraDePapeis = SEM_SESSAO;
  if (sessao !== null) {
    try {
      leitura = await lerContextoSessao(sessao.supabase, sessao.usuarioId);
    } catch (erro) {
      // Falha de leitura não pode virar 500. Sem contexto conhecido, a guarda
      // trata como sessão ausente e manda para o login.
      console.error('[middleware] não foi possível ler o contexto da sessão:', erro);
    }
  }

  const decisao = decidirAcesso({
    caminho: requisicao.nextUrl.pathname,
    codigoDeAutenticacao: requisicao.nextUrl.searchParams.get('code'),
    leitura,
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
