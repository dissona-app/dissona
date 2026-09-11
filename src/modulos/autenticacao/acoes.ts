'use server';

/**
 * Server Actions de login e logout (telas 1 e 19).
 *
 * Ficaram finas de propósito: leem o formulário, chamam o serviço e traduzem o
 * estado nomeado em `ResultadoDeAcao` ou redirecionamento. A regra de quem pode
 * entrar e para onde vive em `servico.ts` — as duas telas compartilham tudo
 * menos a copy, e ter a regra num lugar só é o que garante que "conta
 * bloqueada" se comporte igual nas duas.
 */

import { redirect } from 'next/navigation';

import { falha, falhaDeCampos, sucesso } from '@/lib/acoes';
import type { ResultadoDeAcao } from '@/lib/acoes';
import { CodigoErro } from '@/lib/erros';
import { ROTA } from '@/lib/guarda-rota';
import { origemDaRequisicao } from '@/lib/origem';
import { Papel } from '@/lib/papeis';

import {
  esquemaCadastro,
  esquemaCredenciais,
  esquemaEmail,
  esquemaConfirmacaoSocial,
  esquemaNovaSenha,
  esquemaPapelEscolhivel,
  esquemaProvedorSocial,
  motivosPorCampo,
} from './esquemas';
import {
  cadastrar as cadastrarNoProduto,
  concluirOnboarding,
  confirmarCadastroSocial,
  entrarComoAdministrador,
  entrarComoUsuario,
  iniciarLoginSocial,
  pedirRecuperacao,
  redefinirSenhaComLink,
  reenviarLinkDeVerificacao,
  registrarAmbienteEmUso,
  selecionarPapel,
} from './servico';
import { encerrarSessao } from './repositorio';

/**
 * Um módulo `'use server'` só pode exportar função assíncrona, então os
 * auxiliares ficam privados. Este lê o formulário e devolve **ou** as
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

  const { email, senha, proximo } = entrada.credenciais;
  const resultado = await entrarComoUsuario(email, senha, proximo);

  if (resultado.estado === 'email_nao_verificado') {
    // A tela de verificação precisa do endereço para dizer "enviamos um link
    // para ...", e não há sessão de onde tirá-lo.
    redirect(`${ROTA.VERIFICAR_EMAIL}?email=${encodeURIComponent(email)}`);
  }
  if (resultado.estado === 'conta_bloqueada') {
    return falha(CodigoErro.CONTA_BLOQUEADA);
  }
  if (resultado.estado !== 'ok') {
    return falha(CodigoErro.NAO_AUTENTICADO);
  }

  // `redirect` lança — é assim que o Next o implementa —, então tem de ser a
  // última instrução, e fora de qualquer `try`.
  redirect(resultado.destino);
}

export async function entrarComoAdmin(dadosDoFormulario: FormData): Promise<ResultadoDeAcao> {
  const entrada = lerCredenciais(dadosDoFormulario);
  if (!entrada.ok) return entrada.falha;

  const { email, senha, proximo } = entrada.credenciais;
  const resultado = await entrarComoAdministrador(email, senha, proximo);

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

/**
 * A URL absoluta que o link do e-mail traz de volta.
 *
 * Sempre o route handler, e nunca uma tela: é ele que troca o `token_hash` por
 * sessão e só então decide para onde ir. Apontar o link direto para uma tela
 * deixaria a pessoa autenticada… no cliente, com o token na URL.
 */
async function urlDeRetornoDoEmail(): Promise<string> {
  return `${await origemDaRequisicao()}${ROTA.API_AUTH_CONFIRMAR}`;
}

export async function cadastrar(dadosDoFormulario: FormData): Promise<ResultadoDeAcao> {
  const analise = esquemaCadastro.safeParse({
    nome: dadosDoFormulario.get('nome'),
    email: dadosDoFormulario.get('email'),
    senha: dadosDoFormulario.get('senha'),
    confirmar: dadosDoFormulario.get('confirmar'),
    aceite: dadosDoFormulario.get('aceite'),
  });

  if (!analise.success) {
    // Todos os campos de uma vez — é o que o protótipo faz ao enviar, e o que
    // evita a correção em cinco rodadas.
    return falhaDeCampos(CodigoErro.ENTRADA_INVALIDA, motivosPorCampo(analise.error.issues));
  }

  const { nome, email, senha } = analise.data;
  const resultado = await cadastrarNoProduto(nome, email, senha, await urlDeRetornoDoEmail());

  if (resultado.estado === 'email_ja_cadastrado') {
    return falha(CodigoErro.EMAIL_JA_CADASTRADO, undefined, { email });
  }
  if (resultado.estado === 'senha_fraca') {
    // O Auth tem política própria e pode ser mais rigoroso que a nossa; quando
    // ele recusa, o erro é do campo da senha e não do formulário.
    return falha(CodigoErro.SENHA_FRACA, 'senha');
  }
  if (resultado.estado === 'limite_de_envio') {
    return falha(CodigoErro.LIMITE_DE_ENVIO);
  }
  if (resultado.estado === 'verificacao_enviada') {
    redirect(`${ROTA.VERIFICAR_EMAIL}?email=${encodeURIComponent(email)}`);
  }

  redirect(resultado.destino);
}

/**
 * Reenvia o link de verificação.
 *
 * Devolve sucesso mesmo quando o e-mail não existe ou já está confirmado — o
 * `resend` do Supabase distingue os casos, e propagar a distinção transformaria
 * esta tela num oráculo de contas cadastradas.
 */
export async function reenviarVerificacao(
  dadosDoFormulario: FormData,
): Promise<ResultadoDeAcao> {
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

export async function sair(): Promise<never> {
  await encerrarSessao();
  redirect(ROTA.HOME);
}

export async function sairDoAdmin(): Promise<never> {
  await encerrarSessao();
  redirect(ROTA.ADMIN_ENTRAR);
}

/**
 * Pede o link de recuperação (1.2 / 19.1).
 *
 * Devolve sucesso **sempre** — e é isso que sustenta a resposta neutra da tela.
 * Distinguir "não enviei porque a conta não existe" de "enviei" aqui anularia a
 * decisão de regras §9, e a anularia no lugar mais fácil de sondar.
 *
 * O destino da redefinição viaja no `proximo` do link porque os dois ambientes
 * têm telas próprias: um admin que redefine a senha tem de voltar para
 * `/admin/redefinir-senha`, e daí para o login administrativo. Cair na tela do
 * artista funcionaria e deixaria a pessoa no lugar errado.
 */
async function pedirLinkDeRecuperacao(
  dadosDoFormulario: FormData,
  telaDeRedefinicao: string,
): Promise<ResultadoDeAcao> {
  const analise = esquemaEmail.safeParse({ email: dadosDoFormulario.get('email') });
  if (!analise.success) {
    return falha(CodigoErro.ENTRADA_INVALIDA, 'email', {
      motivo: analise.error.issues[0]?.message ?? 'entrada_invalida',
    });
  }

  const retorno = `${await urlDeRetornoDoEmail()}?proximo=${encodeURIComponent(telaDeRedefinicao)}`;
  const estado = await pedirRecuperacao(analise.data.email, retorno);

  if (estado === 'limite_de_envio') return falha(CodigoErro.LIMITE_DE_ENVIO);
  return sucesso();
}

export async function recuperarSenha(dadosDoFormulario: FormData): Promise<ResultadoDeAcao> {
  return pedirLinkDeRecuperacao(dadosDoFormulario, ROTA.REDEFINIR_SENHA);
}

export async function recuperarSenhaAdmin(dadosDoFormulario: FormData): Promise<ResultadoDeAcao> {
  return pedirLinkDeRecuperacao(dadosDoFormulario, ROTA.ADMIN_REDEFINIR_SENHA);
}

/**
 * Redefine a senha a partir do link (1.3 / 19.2).
 *
 * `sem_autorizacao` cobre os três casos que a tela mostra igual — link
 * expirado, link já usado, e alguém que abriu a rota na mão. Para quem está na
 * frente da tela, os três são a mesma coisa: é preciso pedir outro link.
 */
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

/**
 * Seleção de perfil no primeiro acesso (1.4).
 *
 * Recebe `FormData` como as outras, e não o papel como argumento: a tela é dois
 * `<form>` com um `<button>` cada, e funciona sem JavaScript. O papel vem num
 * campo escondido, e o Zod o valida — sem isso, `admin` num `FormData`
 * forjado chegaria ao banco, que o recusaria por policy, mas com `42501` em vez
 * de uma mensagem.
 */
export async function selecionarPerfil(dadosDoFormulario: FormData): Promise<ResultadoDeAcao> {
  const analise = esquemaPapelEscolhivel.safeParse({
    papel: dadosDoFormulario.get('papel'),
  });

  if (!analise.success) {
    return falha(CodigoErro.ENTRADA_INVALIDA, 'papel', {
      motivo: analise.error.issues[0]?.message ?? 'entrada_invalida',
    });
  }

  const resultado = await selecionarPapel(analise.data.papel);
  if (resultado.estado === 'sem_sessao') return falha(CodigoErro.NAO_AUTENTICADO);

  redirect(resultado.destino);
}

/**
 * Conclui ou pula o onboarding (RF-007).
 *
 * Uma ação para os dois, porque o requisito é o mesmo: *"dado que pulo ou
 * finalizo, o tour não reaparece"*. Duas ações convidariam a tratá-los
 * diferente, e a diferença mais provável — pular não gravar nada — é
 * exatamente a que faria o tour voltar no próximo login.
 */
export async function encerrarOnboarding(): Promise<ResultadoDeAcao> {
  const resultado = await concluirOnboarding();
  if (resultado.estado === 'sem_sessao') return falha(CodigoErro.NAO_AUTENTICADO);

  redirect(resultado.destino);
}

/**
 * Registra o ambiente em uso (RF-008).
 *
 * Chamada do layout do ambiente, e só quando o valor gravado difere do atual —
 * senão seria uma escrita por navegação. Não devolve nada porque não há nada a
 * fazer com a falha: é preferência, e o pior resultado de não gravar é cair no
 * ambiente do artista no próximo login.
 */
export async function registrarAmbiente(papel: Papel): Promise<void> {
  await registrarAmbienteEmUso(papel);
}

/**
 * Entra por Google ou Facebook (RF-002).
 *
 * `redirect()` para o domínio do provedor — é o único redirecionamento externo
 * do produto, e por isso ele **não** passa por `destinoSeguro`: a URL vem do
 * `supabase-js`, não do cliente. O que vem do cliente é o `proximo`, e esse
 * viaja como query do nosso callback, onde é validado na volta.
 */
export async function entrarComProvedor(dadosDoFormulario: FormData): Promise<never> {
  const analise = esquemaProvedorSocial.safeParse({
    provedor: dadosDoFormulario.get('provedor'),
    proximo: dadosDoFormulario.get('proximo') ?? undefined,
  });

  // Sempre redireciona, nunca devolve resultado: os botões sociais são
  // `<form action>` puro, sem `useActionState`, e um valor de retorno ali seria
  // descartado em silêncio. Provedor inválido só chega por formulário forjado,
  // e o login com o banner de falha social é a resposta honesta.
  if (!analise.success) redirect(`${ROTA.ENTRAR}?motivo=social`);

  const { provedor, proximo } = analise.data;
  const origem = await origemDaRequisicao();
  const callback =
    proximo === undefined
      ? `${origem}${ROTA.API_AUTH_CALLBACK}`
      : `${origem}${ROTA.API_AUTH_CALLBACK}?proximo=${encodeURIComponent(proximo)}`;

  redirect(await iniciarLoginSocial(provedor, callback));
}

/**
 * Confirma o cadastro social — nome, aceite de Termos (RF-010) e, quando o
 * provedor não deu nenhum, o e-mail.
 *
 * A conta já existe neste ponto; o que falta é o aceite, e é ele que libera a
 * navegação. Enquanto não vier, a guarda de rota devolve a pessoa para esta
 * tela em qualquer caminho que ela tente.
 *
 * `?? undefined` no e-mail porque `FormData.get` devolve `null` quando o campo
 * não existe — e ele não existe no modo em que o provedor trouxe o endereço.
 */
export async function confirmarCadastro(dadosDoFormulario: FormData): Promise<ResultadoDeAcao> {
  const analise = esquemaConfirmacaoSocial.safeParse({
    nome: dadosDoFormulario.get('nome'),
    aceite: dadosDoFormulario.get('aceite'),
    email: dadosDoFormulario.get('email') ?? undefined,
  });

  if (!analise.success) {
    return falhaDeCampos(CodigoErro.ENTRADA_INVALIDA, motivosPorCampo(analise.error.issues));
  }

  const resultado = await confirmarCadastroSocial(
    analise.data.nome,
    analise.data.email,
    await urlDeRetornoDoEmail(),
  );

  if (resultado.estado === 'sem_sessao') return falha(CodigoErro.NAO_AUTENTICADO);
  if (resultado.estado === 'email_obrigatorio') {
    return falhaDeCampos(CodigoErro.ENTRADA_INVALIDA, { email: 'email_vazio' });
  }
  if (resultado.estado === 'email_em_uso') {
    return falha(CodigoErro.EMAIL_JA_CADASTRADO, undefined, { email: analise.data.email ?? '' });
  }

  redirect(resultado.destino);
}
