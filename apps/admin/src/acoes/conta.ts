'use server';

/**
 * Troca de senha e de e-mail do membro (27.1), com reautenticação.
 *
 * O serviço é o mesmo do site (`@dissona/nucleo/modulos/conta/servico`); o que
 * é deste app é o endereço — a revalidação de `/equipe` e a volta do e-mail
 * por `/api/auth/confirmar` daqui.
 */

import { revalidatePath } from 'next/cache';

import { falha, falhaDeCampos, sucesso } from '@dissona/nucleo/lib/acoes';
import type { ResultadoDeAcao } from '@dissona/nucleo/lib/acoes';
import { CodigoErro } from '@dissona/nucleo/lib/erros';
import { ROTA } from '@dissona/nucleo/lib/guarda-rota';
import { origemDaRequisicao } from '@dissona/nucleo/lib/origem';
import { esquemaTrocaDeEmail, esquemaTrocaDeSenha } from '@dissona/nucleo/modulos/conta/esquemas';
import { trocarEmailDaConta, trocarSenhaDaConta } from '@dissona/nucleo/modulos/conta/servico';
import type { ResultadoDeCredencial } from '@dissona/nucleo/modulos/conta/servico';

import { ROTA_PAINEL } from '@/lib/rotas';

function motivosDe(
  issues: readonly { readonly path: readonly PropertyKey[]; readonly message: string }[],
): Record<string, string> {
  const motivos: Record<string, string> = {};
  for (const issue of issues) {
    const campo = issue.path[0];
    if (typeof campo !== 'string' || campo in motivos) continue;
    motivos[campo] = issue.message;
  }
  return motivos;
}

function traduzir(resultado: ResultadoDeCredencial): ResultadoDeAcao {
  if (resultado.estado === 'sem_sessao') return falha(CodigoErro.NAO_AUTENTICADO);
  if (resultado.estado === 'senha_atual_invalida') {
    return falha(CodigoErro.REAUTENTICACAO_INVALIDA, 'senhaAtual');
  }
  if (resultado.estado === 'senha_fraca') return falha(CodigoErro.SENHA_FRACA, 'senha');
  if (resultado.estado === 'email_ja_cadastrado') {
    return falha(CodigoErro.EMAIL_JA_CADASTRADO, 'email');
  }
  if (resultado.estado === 'limite_de_envio') return falha(CodigoErro.LIMITE_DE_ENVIO);
  return sucesso();
}

export async function trocarSenha(dadosDoFormulario: FormData): Promise<ResultadoDeAcao> {
  const analise = esquemaTrocaDeSenha.safeParse({
    senhaAtual: dadosDoFormulario.get('senhaAtual'),
    senha: dadosDoFormulario.get('senha'),
    confirmar: dadosDoFormulario.get('confirmar'),
  });

  if (!analise.success) {
    return falhaDeCampos(CodigoErro.ENTRADA_INVALIDA, motivosDe(analise.error.issues));
  }

  const resultado = traduzir(await trocarSenhaDaConta(analise.data.senhaAtual, analise.data.senha));
  // "Alterada em …" aparece na própria tela.
  if (resultado.ok) revalidatePath(ROTA_PAINEL.EQUIPE);
  return resultado;
}

export async function trocarEmail(dadosDoFormulario: FormData): Promise<ResultadoDeAcao> {
  const analise = esquemaTrocaDeEmail.safeParse({
    senhaAtual: dadosDoFormulario.get('senhaAtual'),
    email: dadosDoFormulario.get('email'),
  });

  if (!analise.success) {
    return falhaDeCampos(CodigoErro.ENTRADA_INVALIDA, motivosDe(analise.error.issues));
  }

  const origem = await origemDaRequisicao();
  return traduzir(
    await trocarEmailDaConta(
      analise.data.senhaAtual,
      analise.data.email,
      `${origem}${ROTA.API_AUTH_CONFIRMAR}`,
    ),
  );
}
