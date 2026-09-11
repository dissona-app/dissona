import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { ROTA } from '@/lib/guarda-rota';
import { destinoSeguro } from '@/modulos/autenticacao/esquemas';
import { trocarCodigoPorSessao } from '@/modulos/autenticacao/repositorio';

/**
 * Callback do OAuth (Google e Facebook).
 *
 * Route handler, e não página, pelo mesmo motivo de `/api/auth/confirmar`: é
 * aqui que o cookie de sessão pode ser escrito.
 *
 * **Não** decide sobre o aceite de Termos. A conta social nasce sem aceite
 * nenhum — o provedor devolve nome e e-mail, e ninguém concordou com nada —,
 * mas quem manda a pessoa para `/cadastrar/confirmar` é a guarda de rota, que
 * já checa `aceiteTermos` em toda navegação. Duplicar a decisão aqui criaria
 * dois lugares para ela divergir, e o daqui só cobriria a primeira volta.
 *
 * `?motivo=social` no login em vez de uma tela própria: uma falha de OAuth é
 * uma falha de entrada, e o lugar de tentar de novo é a tela de entrar.
 */
export async function GET(requisicao: NextRequest) {
  const { searchParams, origin } = requisicao.nextUrl;

  const codigo = searchParams.get('code');
  const erroDoProvedor = searchParams.get('error');
  const proximo = searchParams.get('proximo') ?? undefined;

  const paraUrl = (destino: string) => NextResponse.redirect(new URL(destino, origin));

  // O provedor recusa com `?error=access_denied` quando a pessoa cancela na
  // tela dele. Não é erro nosso, e não merece banner de falha — só o retorno.
  if (erroDoProvedor !== null) return paraUrl(ROTA.ENTRAR);

  if (codigo === null) return paraUrl(`${ROTA.ENTRAR}?motivo=social`);

  const resultado = await trocarCodigoPorSessao(codigo);
  if (!resultado.ok) return paraUrl(`${ROTA.ENTRAR}?motivo=social`);

  return paraUrl(destinoSeguro(proximo, resultado.destino));
}
