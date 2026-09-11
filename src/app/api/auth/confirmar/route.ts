import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { ROTA } from '@/lib/guarda-rota';
import { destinoSeguro } from '@/modulos/autenticacao/esquemas';
import { marcarRecuperacaoEmCurso } from '@/modulos/autenticacao/marcador-de-recuperacao';
import { concluirVerificacaoDeEmail } from '@/modulos/autenticacao/servico';
import { confirmarPorToken, trocarCodigoPorSessao } from '@/modulos/autenticacao/repositorio';

/**
 * Onde os links de e-mail do Supabase Auth aterrissam.
 *
 * Route handler, e não página: aqui o cookie de sessão **pode** ser escrito, e
 * é isso que a troca do token exige. Um link apontado para uma tela deixaria o
 * token na URL e a sessão só no navegador.
 *
 * ## Dois formatos, porque o Supabase emite dois
 *
 *  - `token_hash` + `type` é o formato de `{{ .TokenHash }}`, e é o que os
 *    templates deste projeto usam. É o único que fecha a sessão no servidor.
 *  - `code` é o que chega quando o template usa o `{{ .ConfirmationURL }}`
 *    padrão com fluxo PKCE. Fica suportado porque é o estado de um projeto
 *    recém-configurado, antes de alguém editar os templates — e um link que
 *    não funciona no primeiro cadastro é o pior momento para descobrir isso.
 *
 * O `type` decide o destino. `signup` é o único implementado nesta fatia; os
 * outros três chegam nas fatias que os emitem, e até lá caem no destino padrão
 * da conta, que é o comportamento correto — a sessão já foi criada.
 */
export async function GET(requisicao: NextRequest) {
  const { searchParams, origin } = requisicao.nextUrl;

  const tokenHash = searchParams.get('token_hash');
  const codigo = searchParams.get('code');
  const tipo = searchParams.get('type');
  const proximo = searchParams.get('proximo') ?? undefined;

  const paraUrl = (destino: string) => NextResponse.redirect(new URL(destino, origin));

  if (tokenHash !== null && tipo === 'signup') {
    const resultado = await concluirVerificacaoDeEmail(tokenHash);

    if (resultado.estado === 'token_invalido') {
      // De volta à tela de verificação, que é onde existe "Reenviar e-mail".
      // Mandar para o login deixaria a pessoa sem o botão de que ela precisa.
      return paraUrl(`${ROTA.VERIFICAR_EMAIL}?erro=token`);
    }

    return paraUrl(destinoSeguro(proximo, resultado.destino));
  }

  if (tokenHash !== null && tipo === 'recovery') {
    const resultado = await confirmarPorToken(tokenHash, 'recovery');

    // Link de 60 minutos, uso único. A tela de redefinição sabe mostrar o
    // estado "Este link expirou ou já foi usado" — e é lá que fica o
    // "Reiniciar recuperação".
    if (!resultado.ok) {
      return paraUrl(`${destinoSeguro(proximo, ROTA.REDEFINIR_SENHA)}?erro=token`);
    }

    // O marcador é o que autoriza a tela de redefinição. A sessão sozinha não
    // serve: ela também existe num login normal, e aceitar qualquer sessão
    // transformaria a redefinição num desvio da reautenticação exigida em
    // Conta. Ver `marcador-de-recuperacao.ts`.
    await marcarRecuperacaoEmCurso();

    return paraUrl(destinoSeguro(proximo, ROTA.REDEFINIR_SENHA));
  }

  if (codigo !== null) {
    const resultado = await trocarCodigoPorSessao(codigo);
    if (!resultado.ok) return paraUrl(`${ROTA.VERIFICAR_EMAIL}?erro=token`);
    return paraUrl(destinoSeguro(proximo, resultado.destino));
  }

  // Link sem token nem código: ou foi truncado pelo cliente de e-mail, ou
  // alguém abriu a rota na mão. Nos dois casos, a tela de verificação é o lugar
  // mais útil para aterrissar.
  return paraUrl(`${ROTA.VERIFICAR_EMAIL}?erro=token`);
}
