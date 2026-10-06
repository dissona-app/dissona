'use server';

/**
 * Server Actions de acesso ao painel (telas 19, 19.1, 19.2, onboarding e
 * verificação de e-mail).
 *
 * Finas, como as do app principal: leem o formulário, chamam o serviço do
 * pacote e traduzem o resultado. A regra de quem entra e para onde vive em
 * `@dissona/nucleo/modulos/autenticacao/servico` — o mesmo serviço do site.
 * O que muda aqui são os endereços: limpos, porque o painel é um app próprio.
 */

import { redirect } from 'next/navigation';

import { falha, falhaDeCampos, sucesso } from '@dissona/nucleo/lib/acoes';
import type { ResultadoDeAcao } from '@dissona/nucleo/lib/acoes';
import { CodigoErro } from '@dissona/nucleo/lib/erros';
import { ROTA } from '@dissona/nucleo/lib/guarda-rota';
import { origemDaRequisicao } from '@dissona/nucleo/lib/origem';
import { Papel } from '@dissona/nucleo/lib/papeis';
import {
  esquemaCredenciais,
  esquemaEmail,
  esquemaNovaSenha,
  motivosPorCampo,
} from '@dissona/nucleo/modulos/autenticacao/esquemas';
import { encerrarSessao } from '@dissona/nucleo/modulos/autenticacao/repositorio';
import {
  concluirOnboarding,
  entrarComoAdministrador,
  pedirRecuperacao,
  redefinirSenhaComLink,
  reenviarLinkDeVerificacao,
} from '@dissona/nucleo/modulos/autenticacao/servico';

import { ROTA_PAINEL, rota } from '@/lib/rotas';

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

/** O route handler deste app — é ele que troca o token do e-mail por sessão. */
async function urlDeRetornoDoEmail(): Promise<string> {
  return `${await origemDaRequisicao()}${ROTA.API_AUTH_CONFIRMAR}`;
}

export async function entrarComoAdmin(dadosDoFormulario: FormData): Promise<ResultadoDeAcao> {
  const entrada = lerCredenciais(dadosDoFormulario);
  if (!entrada.ok) return entrada.falha;

  const { email, senha, proximo } = entrada.credenciais;
  // Base vazia: o `proximo` chega limpo e o destino sai limpo.
  const resultado = await entrarComoAdministrador(email, senha, proximo, '');

  if (resultado.estado === 'sem_acesso_admin') {
    return falha(CodigoErro.PAPEL_AUSENTE, undefined, { papel: Papel.ADMIN });
  }
  if (resultado.estado === 'conta_bloqueada') {
    return falha(CodigoErro.CONTA_BLOQUEADA);
  }
  if (resultado.estado !== 'ok') {
    return falha(CodigoErro.NAO_AUTENTICADO);
  }

  redirect(resultado.destino);
}

export async function sairDoAdmin(): Promise<never> {
  await encerrarSessao();
  redirect(ROTA_PAINEL.ENTRAR);
}

/**
 * Pede o link de recuperação (19.1). Resposta sempre neutra, como a do site.
 *
 * O link volta por `/api/auth/confirmar` **deste** app, com `proximo` para a
 * redefinição daqui — o mesmo e-mail cairia na tela do site se o retorno fosse
 * de lá.
 */
export async function recuperarSenhaAdmin(dadosDoFormulario: FormData): Promise<ResultadoDeAcao> {
  const analise = esquemaEmail.safeParse({ email: dadosDoFormulario.get('email') });
  if (!analise.success) {
    return falha(CodigoErro.ENTRADA_INVALIDA, 'email', {
      motivo: analise.error.issues[0]?.message ?? 'entrada_invalida',
    });
  }

  const retorno = `${await urlDeRetornoDoEmail()}?proximo=${encodeURIComponent(ROTA_PAINEL.REDEFINIR_SENHA)}`;
  const estado = await pedirRecuperacao(analise.data.email, retorno);

  if (estado === 'limite_de_envio') return falha(CodigoErro.LIMITE_DE_ENVIO);
  return sucesso();
}

export async function redefinirSenha(dadosDoFormulario: FormData): Promise<ResultadoDeAcao> {
  const analise = esquemaNovaSenha.safeParse({
    senha: dadosDoFormulario.get('senha'),
    confirmar: dadosDoFormulario.get('confirmar'),
  });

  if (!analise.success) {
    return falhaDeCampos(CodigoErro.ENTRADA_INVALIDA, motivosPorCampo(analise.error.issues));
  }

  const resultado = await redefinirSenhaComLink(analise.data.senha);

  if (resultado.estado === 'sem_autorizacao') return falha(CodigoErro.TOKEN_INVALIDO);
  if (resultado.estado === 'senha_fraca') return falha(CodigoErro.SENHA_FRACA, 'senha');

  return sucesso();
}

export async function reenviarVerificacao(dadosDoFormulario: FormData): Promise<ResultadoDeAcao> {
  const analise = esquemaEmail.safeParse({ email: dadosDoFormulario.get('email') });
  if (!analise.success) {
    return falha(CodigoErro.ENTRADA_INVALIDA, 'email', {
      motivo: analise.error.issues[0]?.message ?? 'entrada_invalida',
    });
  }

  const estado = await reenviarLinkDeVerificacao(analise.data.email, await urlDeRetornoDoEmail());
  if (estado === 'limite_de_envio') return falha(CodigoErro.LIMITE_DE_ENVIO);

  return sucesso();
}

export async function encerrarOnboarding(): Promise<ResultadoDeAcao> {
  const resultado = await concluirOnboarding();
  if (resultado.estado === 'sem_sessao') return falha(CodigoErro.NAO_AUTENTICADO);

  // O destino do serviço é interno (`/admin`); aqui o painel é `/`.
  redirect(rota(resultado.destino));
}
