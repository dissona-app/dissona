'use server';

/**
 * Server Actions de credencial, sessão e exclusão de conta.
 *
 * Finas: leem o `FormData`, validam e chamam o serviço. O par
 * "reautenticação + efeito" mora em `servico.ts`, porque é regra — e porque
 * repeti-lo aqui seria dar a três telas a chance de esquecer metade dele.
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { falha, falhaDeCampos, sucesso } from '@dissona/nucleo/lib/acoes';
import type { ResultadoDeAcao } from '@dissona/nucleo/lib/acoes';
import { CodigoErro } from '@dissona/nucleo/lib/erros';
import { ROTA } from '@dissona/nucleo/lib/guarda-rota';
import { origemDaRequisicao } from '@dissona/nucleo/lib/origem';

import {
  esquemaExclusao,
  esquemaSessao,
  esquemaTrocaDeEmail,
  esquemaTrocaDeSenha,
} from '@dissona/nucleo/modulos/conta/esquemas';
import {
  encerrarUmaSessao,
  excluirConta,
  exportarDados,
  trocarEmailDaConta,
  trocarSenhaDaConta,
} from '@dissona/nucleo/modulos/conta/servico';
import type { ResultadoDeCredencial } from '@dissona/nucleo/modulos/conta/servico';

/** Um motivo por campo, para o formulário mostrar todos de uma vez. */
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

/** Traduz os estados que as três ações de credencial compartilham. */
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

  // A data da última troca aparece na própria tela ("Alterada em …"), então ela
  // precisa recarregar. `revalidatePath` no caminho corrente, e não redirect: a
  // pessoa continua onde estava, com o aviso de sucesso.
  if (resultado.ok) revalidarConta();
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

/**
 * Encerra **uma** sessão de outro dispositivo (7.4 / 17.4 / 27.1).
 *
 * Devolve `void`, e não `ResultadoDeAcao`, porque o painel de sessões é um
 * `<form action={...}>` puro — funciona sem JavaScript, e nesse caminho não há
 * onde entregar um resultado. O que a pessoa vê é a lista revalidada sem a
 * linha, que é a confirmação de que a coisa aconteceu.
 *
 * `sessaoId` inválido não é erro de tela: ele vem de um `input` oculto que esta
 * própria lista renderizou. Sai em silêncio, e a revalidação corrige a lista.
 */
export async function encerrarSessaoDeOutroDispositivo(dadosDoFormulario: FormData): Promise<void> {
  const analise = esquemaSessao.safeParse({ sessaoId: dadosDoFormulario.get('sessaoId') });
  if (!analise.success) return;

  await encerrarUmaSessao(analise.data.sessaoId);

  // A lista tem de refletir a remoção. Não importa se a RPC devolveu `false`
  // (sessão já expirada): nos dois casos a lista atual está desatualizada.
  revalidarConta();
}

/**
 * Gera o `.zip` de exportação (passo 1 da exclusão).
 *
 * Devolve a URL assinada em `dados` para a tela oferecer o download. Ela não
 * redireciona: o download é um efeito do lado do navegador, e navegar para
 * outro lugar cancelaria o que a pessoa pediu.
 */
export async function exportarDadosDaConta(): Promise<
  ResultadoDeAcao<{ url: string; nome: string }>
> {
  const resultado = await exportarDados();
  if (resultado.estado === 'sem_sessao') return falha(CodigoErro.NAO_AUTENTICADO);
  return sucesso({ url: resultado.url, nome: resultado.nome });
}

export async function excluirMinhaConta(dadosDoFormulario: FormData): Promise<ResultadoDeAcao> {
  const analise = esquemaExclusao.safeParse({
    senhaAtual: dadosDoFormulario.get('senhaAtual'),
    confirmacao: dadosDoFormulario.get('confirmacao'),
  });

  if (!analise.success) {
    return falhaDeCampos(CodigoErro.ENTRADA_INVALIDA, motivosDe(analise.error.issues));
  }

  const resultado = await excluirConta(analise.data.senhaAtual);

  if (resultado.estado === 'sem_sessao') return falha(CodigoErro.NAO_AUTENTICADO);
  if (resultado.estado === 'senha_atual_invalida') {
    return falha(CodigoErro.REAUTENTICACAO_INVALIDA, 'senhaAtual');
  }

  // A sessão já foi encerrada pelo serviço. A home é o destino: a pessoa não
  // tem mais para onde ir dentro do produto, e o login diria "entre" a quem
  // acabou de sair.
  redirect(ROTA.HOME);
}

/**
 * Revalida as duas telas de Conta.
 *
 * As duas, e não a corrente: a conta é uma só, e quem tem os dois papéis vê a
 * mesma data de troca de senha nos dois lugares. Revalidar só o caminho atual
 * deixaria o outro mostrando um valor velho até a próxima navegação completa.
 */
function revalidarConta(): void {
  revalidatePath(ROTA.ARTISTA_CONTA);
  revalidatePath(ROTA.CURADOR_CONTA);
  revalidatePath(ROTA.ADMIN_EQUIPE);
}
