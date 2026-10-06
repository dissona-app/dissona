import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { ROTA } from '@dissona/nucleo/lib/guarda-rota';
import { origemDaRequisicao } from '@dissona/nucleo/lib/origem';
import { destinoSeguro } from '@dissona/nucleo/modulos/autenticacao/esquemas';
import { marcarRecuperacaoEmCurso } from '@dissona/nucleo/modulos/autenticacao/marcador-de-recuperacao';
import {
  confirmarPorToken,
  trocarCodigoPorSessao,
} from '@dissona/nucleo/modulos/autenticacao/repositorio';

import { ROTA_PAINEL, rota } from '@/lib/rotas';

/**
 * A volta dos links de e-mail do painel — recuperação de senha (19.1) e troca
 * de e-mail do membro (27.1).
 *
 * Mesmo contrato do route handler do site: troca o `token_hash` (ou o `code`)
 * por sessão e só então redireciona. Existe **aqui** porque o cookie de sessão
 * é por host: confirmado no site, o membro ficaria autenticado lá, e não no
 * painel.
 *
 * Sem o ramo de cadastro: conta administrativa nasce por convite.
 */
export async function GET(requisicao: NextRequest) {
  const { searchParams } = requisicao.nextUrl;
  // A origem vem do cabeçalho `host`: atrás do `next start`, `nextUrl.origin`
  // é o endereço de escuta.
  const origin = await origemDaRequisicao();

  const tokenHash = searchParams.get('token_hash');
  const codigo = searchParams.get('code');
  const tipo = searchParams.get('type');
  const proximo = searchParams.get('proximo') ?? undefined;

  const paraUrl = (destino: string) => NextResponse.redirect(new URL(destino, origin));

  if (tokenHash !== null && tipo === 'recovery') {
    const resultado = await confirmarPorToken(tokenHash, 'recovery');

    // Link de 60 minutos, uso único: a tela de redefinição mostra o estado
    // "Este link expirou ou já foi usado", com o "Reiniciar recuperação".
    if (!resultado.ok) {
      return paraUrl(`${destinoSeguro(proximo, ROTA_PAINEL.REDEFINIR_SENHA)}?erro=token`);
    }

    // O marcador, e não a sessão, é o que autoriza a redefinição — ver
    // `marcador-de-recuperacao.ts`.
    await marcarRecuperacaoEmCurso();

    return paraUrl(destinoSeguro(proximo, ROTA_PAINEL.REDEFINIR_SENHA));
  }

  if (codigo !== null) {
    const resultado = await trocarCodigoPorSessao(codigo);
    if (!resultado.ok) return paraUrl(`${ROTA.VERIFICAR_EMAIL}?erro=token`);
    // O destino do serviço é interno (`/admin`); aqui o painel é `/`.
    return paraUrl(destinoSeguro(proximo, rota(resultado.destino)));
  }

  // Link truncado pelo cliente de e-mail, ou rota aberta à mão.
  return paraUrl(`${ROTA.VERIFICAR_EMAIL}?erro=token`);
}
