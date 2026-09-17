import 'server-only';

/**
 * Regra de entrada — telas 1 e 19.
 *
 * A camada que faltava na convenção `acoes → servico → repositorio`
 * (architecture.md §3.1): até aqui as ações de login chamavam o repositório
 * direto, e a lógica de "quem pode entrar, e para onde" ficava espalhada entre
 * as duas ações, duplicada e divergindo em dois pontos.
 *
 * Não importa nada de React e não conhece `FormData`. Devolve um estado
 * nomeado; quem traduz para banner é a View.
 */

import { ambienteDoUsuario, inicioDoUsuario, ROTA } from '@/lib/guarda-rota';
import { contaAtiva, lerContextoSessao, Papel, SituacaoConta } from '@/lib/papeis';
import { criarClienteServidor, usuarioAtual } from '@/lib/supabase/servidor';
import { notificar, notificarEquipeAdmin } from '@/modulos/notificacao/servico';
import { EventoNotificacao } from '@/modulos/notificacao/tipos';

import { destinoSeguro } from './esquemas';
import { limparRecuperacao, recuperacaoEmCurso } from './marcador-de-recuperacao';
import {
  ativarPapel,
  autenticar,
  confirmarPorToken,
  criarConta,
  definirEmailDaConta,
  encerrarOutrasSessoes,
  encerrarSessao,
  marcarOnboardingVisto,
  pedirRecuperacaoDeSenha,
  reativarConta,
  reenviarConfirmacaoDeEmail,
  reenviarVerificacao,
  registrarAceiteDeTermos,
  registrarTrocaDeSenha,
  registrarUltimoAmbiente,
  trocarSenha,
  urlDeAutorizacaoSocial,
} from './repositorio';
import type { PapelEscolhivel, ProvedorSocial } from './repositorio';

export type ResultadoDeEntrada =
  | { readonly estado: 'ok'; readonly destino: string }
  | { readonly estado: 'credenciais_invalidas' }
  | { readonly estado: 'email_nao_verificado' }
  | { readonly estado: 'conta_bloqueada' }
  /** Credencial correta de uma conta sem papel `admin` — o estado `noaccess` do protótipo. */
  | { readonly estado: 'sem_acesso_admin' };

/**
 * Entrada de artista e curador (tela 1).
 *
 * A conta `desativada` é **reativada aqui**, e não barrada: a exclusão é
 * reversível por 30 dias entrando de novo, e este é o momento em que "entrar de
 * novo" acontece. Reativar antes de calcular o destino também importa — o
 * contexto lido no login já traz `situacao`, e seguir com ele desatualizado
 * mandaria a pessoa para o login outra vez, num laço.
 */
export async function entrarComoUsuario(
  email: string,
  senha: string,
  proximo?: string,
): Promise<ResultadoDeEntrada> {
  const resultado = await autenticar(email, senha);

  if (resultado.estado === 'email_nao_verificado') return { estado: 'email_nao_verificado' };
  if (resultado.estado !== 'ok') return { estado: 'credenciais_invalidas' };

  const { contexto } = resultado;

  if (!contaAtiva(contexto)) {
    // Desfaz a sessão que acabou de nascer. Sem isso, a pessoa fica autenticada
    // numa tela que diz que ela não tem acesso, e a navegação seguinte a joga
    // no ambiente sem explicação.
    await encerrarSessao();
    return { estado: 'conta_bloqueada' };
  }

  if (contexto.estado === 'ok' && contexto.situacao === SituacaoConta.DESATIVADA) {
    await reativarConta(resultado.usuarioId);
  }

  return { estado: 'ok', destino: destinoSeguro(proximo, inicioDoUsuario(contexto)) };
}

/**
 * Entrada administrativa (tela 19).
 *
 * Difere da de cima em dois pontos, e os dois importam:
 *
 *  1. **Destino.** Sempre `/admin`, e não o ambiente da conta. Quem entra pela
 *     porta administrativa quer o painel administrativo, mesmo tendo os outros
 *     papéis.
 *  2. **Conta sem papel admin.** Credencial correta **não** entra: a sessão é
 *     desfeita e a resposta é "Conta sem acesso administrativo". Deixar a
 *     sessão e só mostrar o banner deixaria a pessoa autenticada numa área que
 *     lhe é negada.
 *
 * Também não reativa conta desativada: reverter uma exclusão é ato do dono na
 * porta dele, não um efeito colateral de tentar o painel.
 */
export async function entrarComoAdministrador(
  email: string,
  senha: string,
  proximo?: string,
): Promise<ResultadoDeEntrada> {
  const resultado = await autenticar(email, senha);

  // O login do admin não trata `email_nao_verificado` de forma própria: contas
  // administrativas nascem por convite, e o convite já confirma o endereço.
  if (resultado.estado !== 'ok') return { estado: 'credenciais_invalidas' };

  const { contexto } = resultado;

  if (!contaAtiva(contexto)) {
    await encerrarSessao();
    return { estado: 'conta_bloqueada' };
  }

  if (contexto.estado !== 'ok' || !contexto.papeis.includes(Papel.ADMIN)) {
    await encerrarSessao();
    return { estado: 'sem_acesso_admin' };
  }

  return { estado: 'ok', destino: destinoSeguro(proximo, ROTA.ADMIN) };
}

/* ------------------------------------------------ cadastro e verificação --- */

export type ResultadoDeCadastro =
  /** Confirmação exigida: a conta existe, mas só serve depois do link. */
  | { readonly estado: 'verificacao_enviada' }
  /** Confirmação desligada no projeto — a sessão já nasceu com o `signUp`. */
  | { readonly estado: 'ok'; readonly destino: string }
  | { readonly estado: 'email_ja_cadastrado' }
  /** O Auth recusou o endereço — regra dele, mais rigorosa que a nossa. */
  | { readonly estado: 'email_invalido' }
  | { readonly estado: 'senha_fraca' }
  | { readonly estado: 'limite_de_envio' };

/**
 * "Novo cadastro concluído" para a equipe (RF-009).
 *
 * Disparado quando a conta passa a **servir**, e não quando a linha é criada.
 * A diferença é concreta: com confirmação de e-mail exigida, o `signUp` cria
 * `auth.users` e o trigger cria `perfil` imediatamente, mas a pessoa pode nunca
 * abrir o link. Avisar ali encheria a caixa do admin de contas fantasma, e o
 * aviso existe para ele acompanhar a base de usuários (módulo 20), não as
 * tentativas.
 *
 * Então há dois pontos de disparo, e um só é usado por vez: aqui, quando o
 * `signUp` já devolve sessão (confirmação desligada), e na conclusão da
 * verificação, quando ela é exigida.
 */
async function notificarCadastroConcluido(perfilId: string): Promise<void> {
  await notificarEquipeAdmin(EventoNotificacao.NOVO_CADASTRO_CONCLUIDO, { perfil_id: perfilId });
}

export async function cadastrar(
  nome: string,
  email: string,
  senha: string,
  urlDeRetorno: string,
  /**
   * Só as rotas exclusivas por perfil (`/artista/cadastrar`,
   * `/curador/cadastrar`) o enviam. `/cadastrar` não sabe o papel de antemão,
   * e quem se cadastra por ali continua indo para a seleção de perfil (1.4).
   */
  papel?: PapelEscolhivel,
): Promise<ResultadoDeCadastro> {
  const resultado = await criarConta(nome, email, senha, urlDeRetorno);

  if (resultado.estado !== 'ok') return resultado;

  // Sem confirmação de e-mail exigida ainda não há como gravar o papel: a
  // linha existe, mas a sessão só nasce com `precisaVerificar === false`. Com
  // confirmação exigida, o mesmo papel viaja no `urlDeRetorno` (query
  // `papel=`) e é aplicado em `/api/auth/confirmar` assim que a sessão passa a
  // existir.
  if (resultado.precisaVerificar) return { estado: 'verificacao_enviada' };

  await notificarCadastroConcluido(resultado.usuarioId);

  if (papel !== undefined) {
    await ativarPapel(resultado.usuarioId, papel);
    await registrarUltimoAmbiente(resultado.usuarioId, papel);
  }

  // Conta sem papel vai para a seleção de perfil (1.4). Vem de
  // `inicioDoUsuario`, e não de uma constante, para que a conta já gravada com
  // papel (rota exclusiva) siga direto ao destino certo sem passar por lá.
  const supabase = await criarClienteServidor();
  const contexto = await lerContextoSessao(supabase, resultado.usuarioId);
  return { estado: 'ok', destino: inicioDoUsuario(contexto) };
}

/**
 * Reenvia o link de verificação — e escolhe o tipo certo.
 *
 * São dois tipos no Supabase, e mandar o errado não reenvia nada. `signup` é o
 * do cadastro por e-mail, onde não há sessão porque a confirmação é exigida
 * antes dela. `email_change` é o do endereço definido **depois** de a conta
 * existir, que é o caso do SoundCloud: lá a conta nasce sem e-mail, ele é
 * colhido na confirmação do cadastro e fica pendente em `new_email`.
 *
 * A sessão é quem distingue: se ela existe e tem endereço pendente, o reenvio é
 * de troca. Sem sessão, é de cadastro.
 */
export async function reenviarLinkDeVerificacao(
  email: string,
  urlDeRetorno: string,
): Promise<'ok' | 'limite_de_envio'> {
  const usuario = await usuarioAtual();
  const pendente =
    usuario !== null &&
    (usuario.email === undefined || usuario.email === '') &&
    usuario.new_email !== undefined &&
    usuario.new_email !== '';

  return pendente
    ? reenviarConfirmacaoDeEmail(email, urlDeRetorno)
    : reenviarVerificacao(email, urlDeRetorno);
}

export type ResultadoDeConfirmacao =
  | { readonly estado: 'ok'; readonly destino: string }
  | { readonly estado: 'token_invalido' };

/**
 * Conclui a verificação de e-mail vinda do link (RF-004).
 *
 * O link é de uso único e vale 24 horas — as duas coisas são do Auth, não
 * nossas, e é ele que recusa o token gasto ou vencido. O que fazemos com a
 * recusa é mandar de volta para a tela de verificação, onde há "Reenviar
 * e-mail".
 */
export async function concluirVerificacaoDeEmail(
  tokenHash: string,
): Promise<ResultadoDeConfirmacao> {
  const resultado = await confirmarPorToken(tokenHash, 'signup');
  if (!resultado.ok) return { estado: 'token_invalido' };

  await notificarCadastroConcluido(resultado.usuarioId);

  const supabase = await criarClienteServidor();
  const contexto = await lerContextoSessao(supabase, resultado.usuarioId);
  return { estado: 'ok', destino: inicioDoUsuario(contexto) };
}

/* --------------------------------------- recuperação e redefinição -------- */

/**
 * Cooldown de reenvio, em segundos (19.1 pede um explicitamente).
 *
 * Espelha o limite do próprio Auth: o servidor já recusa com 429, e o número
 * aqui só evita que a pessoa descubra isso clicando. Não vem de
 * `configuracao` pela mesma razão dos prazos de token — é parâmetro de
 * credencial, e vive junto da configuração do Auth.
 */
export const SEGUNDOS_DE_COOLDOWN_DE_ENVIO = 60;

/**
 * Pede o link de recuperação (1.2 / 19.1).
 *
 * A resposta é **sempre** a mesma, cadastrado ou não: *"se este e-mail estiver
 * cadastrado, enviamos um link"*. Só o estouro de limite é distinguido, e ele
 * não revela nada sobre a conta — revela sobre o nosso servidor.
 */
export async function pedirRecuperacao(
  email: string,
  urlDeRetorno: string,
): Promise<'ok' | 'limite_de_envio'> {
  return pedirRecuperacaoDeSenha(email, urlDeRetorno);
}

export type ResultadoDeRedefinicao =
  | { readonly estado: 'ok' }
  | { readonly estado: 'senha_fraca' }
  /** Sem marcador de recuperação: o link expirou, já foi usado, ou nunca houve. */
  | { readonly estado: 'sem_autorizacao' };

/**
 * Redefine a senha a partir do link (1.3 / 19.2).
 *
 * Três efeitos, nesta ordem, e a ordem importa:
 *
 *  1. **Troca a senha.** Se falhar, nada mais acontece.
 *  2. **Encerra as outras sessões.** É o que o protótipo promete em letras
 *     grandes — "Encerramos as outras sessões da conta" — e é o ponto da
 *     redefinição: quem tomou a conta perde o acesso. Vem depois da troca
 *     porque derrubar sessões e falhar na troca seria o pior dos dois mundos.
 *  3. **Limpa o marcador.** O link vale uma vez; a tela também.
 *
 * A autorização não é "tem sessão", é "tem marcador de recuperação" — ver
 * `marcador-de-recuperacao.ts`.
 */
export async function redefinirSenhaComLink(novaSenha: string): Promise<ResultadoDeRedefinicao> {
  if (!(await recuperacaoEmCurso())) return { estado: 'sem_autorizacao' };

  const usuario = await usuarioAtual();
  if (usuario === null) return { estado: 'sem_autorizacao' };

  if ((await trocarSenha(novaSenha)) === 'senha_fraca') return { estado: 'senha_fraca' };

  await encerrarOutrasSessoes();
  await registrarTrocaDeSenha(usuario.id);
  await limparRecuperacao();

  await notificar(usuario.id, EventoNotificacao.CREDENCIAL_ALTERADA, { origem: 'redefinicao' });

  return { estado: 'ok' };
}

/* ------------------------------------- seleção de perfil e onboarding ----- */

export type ResultadoDeSelecao =
  | { readonly estado: 'ok'; readonly destino: string }
  | { readonly estado: 'sem_sessao' };

/**
 * Seleção de perfil no primeiro acesso (1.4).
 *
 * O destino sai de `inicioDoUsuario` com o contexto **relido**, e não de um
 * `if` sobre o papel escolhido. A diferença aparece nos dois casos que um `if`
 * erraria: o curador que precisa do wizard antes do tour, e a pessoa que já
 * tinha o outro papel e volta aqui por Conta — ela não deve ver o onboarding
 * outra vez.
 */
export async function selecionarPapel(papel: PapelEscolhivel): Promise<ResultadoDeSelecao> {
  const usuario = await usuarioAtual();
  if (usuario === null) return { estado: 'sem_sessao' };

  await ativarPapel(usuario.id, papel);
  await registrarUltimoAmbiente(usuario.id, papel);

  const supabase = await criarClienteServidor();
  const contexto = await lerContextoSessao(supabase, usuario.id);

  return { estado: 'ok', destino: inicioDoUsuario(contexto) };
}

/**
 * Conclui ou pula o onboarding (RF-007).
 *
 * Concluir e pular são a **mesma** operação: o requisito diz "dado que pulo ou
 * finalizo, o tour não reaparece". Tratá-los diferente faria quem pulou ver o
 * tour de novo no próximo login, que é a leitura mais irritante possível de
 * "pular".
 *
 * O destino é o ambiente, e não `inicioDoUsuario`: chamar `inicioDoUsuario`
 * aqui devolveria `/onboarding` de novo quando a gravação falhasse, e a pessoa
 * ficaria presa no tour. `ambienteDoUsuario` sempre aponta para fora.
 */
export async function concluirOnboarding(): Promise<ResultadoDeSelecao> {
  const usuario = await usuarioAtual();
  if (usuario === null) return { estado: 'sem_sessao' };

  await marcarOnboardingVisto(usuario.id);

  const supabase = await criarClienteServidor();
  const contexto = await lerContextoSessao(supabase, usuario.id);

  return { estado: 'ok', destino: ambienteDoUsuario(contexto) };
}

/** Registra o ambiente em uso, quando ele muda (RF-008). */
export async function registrarAmbienteEmUso(papel: Papel): Promise<void> {
  const usuario = await usuarioAtual();
  if (usuario === null) return;
  await registrarUltimoAmbiente(usuario.id, papel);
}

/* ------------------------------------------------------- login social ----- */

/**
 * Começa o fluxo social (RF-002).
 *
 * Devolve a URL do provedor; quem redireciona é a ação, porque `redirect()`
 * lança e não pode acontecer dentro de um serviço que talvez precise limpar
 * algo depois.
 *
 * O `proximo` viaja no callback, e não numa sessão nossa: entre o clique e a
 * volta a pessoa passa pelo domínio do provedor, e nada que a gente guarde em
 * memória sobrevive a isso de forma confiável.
 */
export async function iniciarLoginSocial(
  provedor: ProvedorSocial,
  urlDoCallback: string,
): Promise<string> {
  return urlDeAutorizacaoSocial(provedor, urlDoCallback);
}

export type ResultadoDeConfirmacaoSocial =
  | { readonly estado: 'ok'; readonly destino: string }
  | { readonly estado: 'sem_sessao' }
  | { readonly estado: 'email_obrigatorio' }
  | { readonly estado: 'email_em_uso' };

/**
 * Fecha o cadastro social: confirma o nome, colhe o e-mail que faltar e
 * registra o aceite (RF-010).
 *
 * É o equivalente, no caminho social, do que o formulário de cadastro faz no
 * caminho por e-mail. O protótipo promete que o provedor "preenche seu nome e
 * e-mail; você confirma antes de criar" — com provider do Supabase a conta já
 * existe quando voltamos, então a confirmação acontece **depois**, e é ela que
 * libera a navegação: até aqui a guarda de rota devolve a pessoa para esta
 * tela.
 *
 * ## O e-mail
 *
 * Google e Facebook devolvem endereço, e aí `usuario.email` já existe e o
 * parâmetro é ignorado. O SoundCloud não devolve — a API deles não tem o campo
 * — e aí o endereço é **exigido aqui**, que é a camada que sabe o que a sessão
 * tem. Ele é gravado **antes** do aceite de propósito: se o endereço já
 * pertencer a outra conta, a pessoa volta para a tela sem ter consumido o
 * aceite, e o que ela vê é o erro do e-mail, não um cadastro meio feito.
 *
 * O aviso de "novo cadastro" para a equipe sai daqui, e não do callback: é
 * neste instante que a conta passa a servir.
 */
export async function confirmarCadastroSocial(
  nome: string,
  email: string | undefined,
  urlDeRetorno: string,
): Promise<ResultadoDeConfirmacaoSocial> {
  const usuario = await usuarioAtual();
  if (usuario === null) return { estado: 'sem_sessao' };

  let emailRecemDefinido: string | undefined;

  if (usuario.email === undefined || usuario.email === '') {
    if (email === undefined) return { estado: 'email_obrigatorio' };
    if ((await definirEmailDaConta(email, urlDeRetorno)) === 'email_em_uso') {
      return { estado: 'email_em_uso' };
    }
    emailRecemDefinido = email;
  }

  await registrarAceiteDeTermos(usuario.id, nome);
  await notificarCadastroConcluido(usuario.id);

  // Quem acabou de informar o endereço vai para a tela de verificação, e não
  // para o ambiente: o link está a caminho, e é lá que ficam o "Reenviar" e o
  // "Já confirmei, continuar". Não é bloqueio — a guarda de rota deixa sair
  // dali a qualquer momento; é o aviso de que falta um passo.
  if (emailRecemDefinido !== undefined) {
    return {
      estado: 'ok',
      destino: `${ROTA.VERIFICAR_EMAIL}?email=${encodeURIComponent(emailRecemDefinido)}`,
    };
  }

  const supabase = await criarClienteServidor();
  const contexto = await lerContextoSessao(supabase, usuario.id);

  return { estado: 'ok', destino: inicioDoUsuario(contexto) };
}
