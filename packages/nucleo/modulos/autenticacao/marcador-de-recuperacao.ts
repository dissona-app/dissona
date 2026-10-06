import 'server-only';

/**
 * O marcador que autoriza a tela de redefinição de senha.
 *
 * ## O problema que ele resolve
 *
 * No fluxo real do Supabase, o link de recuperação **cria uma sessão** — é a
 * `verifyOtp({ type: 'recovery' })` que a estabelece, e é ela que permite
 * `updateUser({ password })` sem senha atual. Isso põe `/redefinir-senha` num
 * lugar incômodo:
 *
 *  - Ela não pode redirecionar quem tem sessão, como o resto de `(auth)` faz —
 *    a sessão de recuperação é justamente quem precisa chegar lá.
 *  - Mas se ela aceitar **qualquer** sessão, vira um desvio da reautenticação:
 *    a tela de Conta (7.4 / 17.4 / 27.1) exige a senha atual para trocar de
 *    senha, e quem tivesse uma sessão roubada trocaria a senha em
 *    `/redefinir-senha` sem apresentar nada.
 *
 * A saída é não confiar na existência da sessão, e sim em **como** ela nasceu.
 * O route handler grava este marcador ao concluir uma recuperação; a tela o
 * exige; a ação o apaga depois de trocar a senha. Sem ele, a tela mostra
 * "Este link expirou ou já foi usado", que é a leitura correta da situação.
 *
 * Não dá para ler isso da sessão do Supabase: os claims não distinguem de
 * forma estável uma sessão de recuperação de uma de login, e depender de
 * detalhe interno do provedor para uma decisão de segurança é pior que um
 * cookie que a gente controla.
 *
 * `httpOnly` e `sameSite: 'lax'`: nenhum script precisa dele, e ele só tem de
 * sobreviver ao redirecionamento que vem do clique no e-mail. Os 15 minutos
 * são bem menores que os 60 do token — o marcador cobre o tempo de digitar uma
 * senha, não o de achar o e-mail.
 */

import { cookies } from 'next/headers';

const NOME = 'dissona_recuperacao';
const VALIDADE_SEGUNDOS = 15 * 60;

export async function marcarRecuperacaoEmCurso(): Promise<void> {
  const armazem = await cookies();
  armazem.set(NOME, '1', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: VALIDADE_SEGUNDOS,
  });
}

export async function recuperacaoEmCurso(): Promise<boolean> {
  const armazem = await cookies();
  return armazem.get(NOME)?.value === '1';
}

export async function limparRecuperacao(): Promise<void> {
  const armazem = await cookies();
  armazem.delete(NOME);
}
