'use server';

/**
 * Server Actions de login e logout (telas 1 e 19).
 *
 * A tela do admin e a do artista/curador compartilham tudo menos duas coisas,
 * e as duas importam:
 *
 *  1. **Destino.** O admin cai em `/admin`; o artista e o curador caem no
 *     ambiente de quem entrou, ou na seleção de perfil se a conta ainda não
 *     escolheu.
 *  2. **Conta sem acesso.** No login do admin, credencial correta de uma conta
 *     sem papel `admin` **não** entra: a sessão é desfeita e a resposta é
 *     "Conta sem acesso administrativo" — o estado `noaccess` do protótipo. Sem
 *     desfazer a sessão, a pessoa ficaria autenticada como artista numa tela
 *     que diz que ela não tem acesso, e a próxima navegação a jogaria no
 *     ambiente do artista sem explicação.
 */

import { redirect } from 'next/navigation';

import { falha } from '@/lib/acoes';
import type { ResultadoDeAcao } from '@/lib/acoes';
import { CodigoErro } from '@/lib/erros';
import { inicioDoUsuario, ROTA } from '@/lib/guarda-rota';
import { Papel } from '@/lib/papeis';

import { destinoSeguro, esquemaCredenciais } from './esquemas';
import { autenticar, encerrarSessao } from './repositorio';

/**
 * Um modulo `'use server'` so pode exportar funcao assincrona, entao os
 * auxiliares ficam privados. Este le o formulario e devolve **ou** as
 * credenciais **ou** a falha de campo pronta.
 */
function lerCredenciais(dadosDoFormulario: FormData) {
  const analise = esquemaCredenciais.safeParse({
    email: dadosDoFormulario.get('email'),
    senha: dadosDoFormulario.get('senha'),
    proximo: dadosDoFormulario.get('proximo') ?? undefined,
  });

  if (analise.success) return { ok: true as const, credenciais: analise.data };

  const primeiro = analise.error.issues[0];
  const campo = primeiro?.path[0];
  return {
    ok: false as const,
    falha: falha(CodigoErro.ENTRADA_INVALIDA, typeof campo === 'string' ? campo : undefined, {
      motivo: primeiro?.message ?? 'entrada_invalida',
    }),
  };
}

export async function entrar(dadosDoFormulario: FormData): Promise<ResultadoDeAcao> {
  const entrada = lerCredenciais(dadosDoFormulario);
  if (!entrada.ok) return entrada.falha;

  const resultado = await autenticar(entrada.credenciais.email, entrada.credenciais.senha);

  if (resultado.estado === 'email_nao_verificado') {
    redirect(ROTA.VERIFICAR_EMAIL);
  }
  if (resultado.estado !== 'ok') {
    return falha(CodigoErro.NAO_AUTENTICADO);
  }

  const inicio = inicioDoUsuario({
    estado: 'ok',
    papeis: resultado.papeis,
    // O destino por papel não depende disto; a guarda de `(app)/curador` é que
    // decide o wizard, e ela roda no middleware do redirecionamento abaixo.
    cadastroCuradorConcluido: true,
  });

  // `redirect` lança — é assim que o Next o implementa —, então tem de ser a
  // última instrução, e fora de qualquer `try`.
  redirect(destinoSeguro(entrada.credenciais.proximo, inicio));
}

export async function entrarComoAdmin(dadosDoFormulario: FormData): Promise<ResultadoDeAcao> {
  const entrada = lerCredenciais(dadosDoFormulario);
  if (!entrada.ok) return entrada.falha;

  const resultado = await autenticar(entrada.credenciais.email, entrada.credenciais.senha);

  if (resultado.estado !== 'ok') {
    return falha(CodigoErro.NAO_AUTENTICADO);
  }

  if (!resultado.papeis.includes(Papel.ADMIN)) {
    // Desfaz a sessão que acabou de ser criada. A alternativa — deixar a
    // sessão e só mostrar o banner — deixaria a pessoa autenticada numa área
    // que lhe é negada, e a próxima navegação a levaria para o ambiente do
    // artista sem que ela entendesse por quê.
    await encerrarSessao();
    return falha(CodigoErro.PAPEL_AUSENTE, undefined, { papel: Papel.ADMIN });
  }

  redirect(destinoSeguro(entrada.credenciais.proximo, ROTA.ADMIN));
}

export async function sair(): Promise<never> {
  await encerrarSessao();
  redirect(ROTA.HOME);
}

export async function sairDoAdmin(): Promise<never> {
  await encerrarSessao();
  redirect(ROTA.ADMIN_ENTRAR);
}
