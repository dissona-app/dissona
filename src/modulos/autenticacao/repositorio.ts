import 'server-only';

/**
 * Único ponto que fala com o Supabase Auth.
 *
 * `signInWithPassword` grava a sessão em cookie pelo `createServerClient` do
 * `@supabase/ssr`, que já é configurado para isso em `lib/supabase/servidor`.
 * Nada aqui decide para onde ir depois nem que mensagem mostrar — isso é do
 * serviço e da View, nessa ordem.
 */

import type { Provider } from '@supabase/supabase-js';

import { inicioDoUsuario } from '@/lib/guarda-rota';
import type { LeituraDePapeis, Papel } from '@/lib/papeis';
import { lerContextoSessao } from '@/lib/papeis';
import { criarClienteServidor } from '@/lib/supabase/servidor';
import { estourarSeErro } from '@/lib/supabase/erros';

export type ResultadoDeCadastro =
  | {
      readonly estado: 'ok';
      readonly usuarioId: string;
      /**
       * `true` quando o projeto exige confirmação de e-mail — o `signUp` não
       * devolveu sessão, e a conta só serve depois do link.
       */
      readonly precisaVerificar: boolean;
    }
  | { readonly estado: 'email_ja_cadastrado' }
  | { readonly estado: 'senha_fraca' }
  | { readonly estado: 'limite_de_envio' };

/**
 * Cria a conta no Auth.
 *
 * `options.data` é lido pelo trigger `criar_perfil_ao_cadastrar` (0001), que
 * espera exatamente estas duas chaves: `nome_completo` e `aceite_termos`. Sem
 * elas o perfil nasce com o e-mail no lugar do nome e sem
 * `aceite_termos_em` — ou seja, sem a prova do aceite que a LGPD exige
 * (RF-010). O contrato está no corpo daquela função, e é por isso que a string
 * `'true'` aqui é texto: `raw_user_meta_data ->> 'aceite_termos'` compara com
 * `'true'`.
 *
 * ## Como se detecta e-mail já cadastrado
 *
 * De dois jeitos, porque o Supabase responde de dois jeitos:
 *
 *  - Com *email enumeration protection* ligada (o padrão hoje), o `signUp`
 *    responde **sucesso** para um e-mail existente, com um usuário obfuscado e
 *    `identities` vazio. É o sinal documentado, e é o que se checa primeiro.
 *  - Com a proteção desligada, vem erro `user_already_exists`.
 *
 * O protótipo e RF-003 pedem o banner explícito, com "Entrar com esse e-mail" —
 * então aqui a duplicidade é revelada de propósito. A resposta neutra que as
 * regras §9 exigem é a da **recuperação de senha**, e essa continua neutra.
 */
export async function criarConta(
  nome: string,
  email: string,
  senha: string,
  urlDeRetorno: string,
): Promise<ResultadoDeCadastro> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      data: { nome_completo: nome, aceite_termos: 'true' },
      emailRedirectTo: urlDeRetorno,
    },
  });

  if (error !== null) {
    if (error.code === 'user_already_exists') return { estado: 'email_ja_cadastrado' };
    if (error.code === 'weak_password') return { estado: 'senha_fraca' };
    if (error.code === 'over_email_send_rate_limit' || error.status === 429) {
      return { estado: 'limite_de_envio' };
    }
    throw error;
  }

  if (data.user === null) throw new Error('signUp devolveu sucesso sem usuário.');

  // `identities` vazio é o e-mail já existente sob a proteção de enumeração.
  if (data.user.identities !== undefined && data.user.identities.length === 0) {
    return { estado: 'email_ja_cadastrado' };
  }

  return {
    estado: 'ok',
    usuarioId: data.user.id,
    precisaVerificar: data.session === null,
  };
}

/**
 * Reenvia o link de verificação.
 *
 * Resposta **neutra** por desenho: o `resend` do Supabase falha para e-mail
 * inexistente ou já confirmado, e propagar isso transformaria esta tela num
 * oráculo de contas. Só o estouro de limite é distinguido, porque a pessoa
 * precisa saber que deve esperar em vez de clicar de novo.
 */
export async function reenviarVerificacao(
  email: string,
  urlDeRetorno: string,
): Promise<'ok' | 'limite_de_envio'> {
  const supabase = await criarClienteServidor();

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: urlDeRetorno },
  });

  if (error !== null && (error.code === 'over_email_send_rate_limit' || error.status === 429)) {
    return 'limite_de_envio';
  }

  return 'ok';
}

/**
 * Troca o `token_hash` do link de e-mail por uma sessão.
 *
 * `verifyOtp`, e não `exchangeCodeForSession`: são dois fluxos diferentes. O
 * `code` é do OAuth e do PKCE; o `token_hash` é o que o template de e-mail
 * emite quando usa `{{ .TokenHash }}`, que é o formato necessário para o link
 * fechar sessão no servidor em vez de no navegador.
 */
export async function confirmarPorToken(
  tokenHash: string,
  tipo: 'signup' | 'email_change' | 'recovery' | 'invite' | 'magiclink',
): Promise<{ readonly ok: true; readonly usuarioId: string } | { readonly ok: false }> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo });

  if (error !== null || data.user === null) return { ok: false };
  return { ok: true, usuarioId: data.user.id };
}

/** Os dois papéis que a pessoa escolhe por si (1.4). `admin` nasce por convite. */
export type PapelEscolhivel = 'artista' | 'curador';

/**
 * Ativa um papel e cria o perfil correspondente (1.4).
 *
 * `upsert` nos dois, e não `insert`: a tela é alcançável de novo — pela
 * ativação do segundo papel em Conta (7.2), ou por um duplo clique — e a
 * segunda passagem tem de ser inofensiva. Papel revertido é `ativo = false`,
 * nunca `delete` (0001), então reativar é atualizar a linha que já existe.
 *
 * A policy `papel_usuario: dono ativa papel nao administrativo` já barra
 * `papel = 'admin'` no banco; o tipo aqui é a mesma barreira uma camada acima,
 * para o erro aparecer em `typecheck` e não em `42501`.
 */
export async function ativarPapel(perfilId: string, papel: PapelEscolhivel): Promise<void> {
  const supabase = await criarClienteServidor();

  const { error: erroDoPapel } = await supabase
    .from('papel_usuario')
    .upsert({ perfil_id: perfilId, papel, ativo: true }, { onConflict: 'perfil_id,papel' });
  estourarSeErro(erroDoPapel);

  const tabela = papel === 'artista' ? 'perfil_artista' : 'perfil_curador';
  const { error: erroDoPerfil } = await supabase
    .from(tabela)
    .upsert({ perfil_id: perfilId }, { onConflict: 'perfil_id' });
  estourarSeErro(erroDoPerfil);
}

/**
 * Marca o tour como visto (RF-007).
 *
 * `is('onboarding_visto_em', null)` no filtro: "Rever onboarding" reabre o tour
 * depois de ele já ter sido visto, e concluí-lo de novo não deve reescrever a
 * data do primeiro acesso — ela é o registro de quando a pessoa entrou, não de
 * quando ela reviu a explicação.
 */
export async function marcarOnboardingVisto(perfilId: string): Promise<void> {
  const supabase = await criarClienteServidor();

  const { error } = await supabase
    .from('perfil')
    .update({ onboarding_visto_em: new Date().toISOString() })
    .eq('id', perfilId)
    .is('onboarding_visto_em', null);

  estourarSeErro(error);
}

/**
 * Registra o ambiente em uso (RF-008).
 *
 * Falhar aqui não pode interromper nada: é preferência de navegação, e o pior
 * resultado de não gravar é a pessoa cair no ambiente do artista no próximo
 * login. Derrubar a página por causa disso seria trocar um incômodo por um
 * erro.
 */
export async function registrarUltimoAmbiente(perfilId: string, papel: Papel): Promise<void> {
  const supabase = await criarClienteServidor();

  const { error } = await supabase
    .from('perfil')
    .update({ ultimo_ambiente: papel })
    .eq('id', perfilId);

  if (error !== null) {
    console.error('[autenticacao] não foi possível gravar ultimo_ambiente:', error);
  }
}

/**
 * Pede o link de recuperação de senha.
 *
 * Devolve `'ok'` para e-mail inexistente também — o `resetPasswordForEmail` do
 * Supabase já responde assim de propósito, e a tela depende disso: a resposta é
 * *"se este e-mail estiver cadastrado, enviamos um link"* (regras §9), e
 * qualquer diferença de comportamento entre um endereço cadastrado e um não
 * cadastrado transforma a tela num oráculo de contas.
 */
export async function pedirRecuperacaoDeSenha(
  email: string,
  urlDeRetorno: string,
): Promise<'ok' | 'limite_de_envio'> {
  const supabase = await criarClienteServidor();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: urlDeRetorno,
  });

  if (error !== null && (error.code === 'over_email_send_rate_limit' || error.status === 429)) {
    return 'limite_de_envio';
  }

  return 'ok';
}

/**
 * Troca a senha da sessão corrente.
 *
 * Serve a redefinição por link (1.3 / 19.2) e a troca em Conta (7.4 / 17.4) —
 * a diferença entre as duas é o que **autoriza** a chamada, e isso é decidido
 * antes, no serviço. Aqui é só a escrita.
 */
export async function trocarSenha(novaSenha: string): Promise<'ok' | 'senha_fraca'> {
  const supabase = await criarClienteServidor();

  const { error } = await supabase.auth.updateUser({ password: novaSenha });

  if (error !== null) {
    if (error.code === 'weak_password' || error.code === 'same_password') return 'senha_fraca';
    throw error;
  }

  return 'ok';
}

/**
 * Grava a data da última troca de senha (exibida em 27.1 e 7.4).
 *
 * Coluna nossa, e não do Auth: o Supabase não expõe essa data. Falhar aqui não
 * pode desfazer a troca de senha, que já aconteceu e é irreversível — então o
 * erro é engolido com log, no mesmo raciocínio de `servicoNotificacao`.
 */
export async function registrarTrocaDeSenha(perfilId: string): Promise<void> {
  const supabase = await criarClienteServidor();

  const { error } = await supabase
    .from('perfil')
    .update({ senha_alterada_em: new Date().toISOString() })
    .eq('id', perfilId);

  if (error !== null) {
    console.error('[autenticacao] não foi possível gravar senha_alterada_em:', error);
  }
}

/**
 * Troca o `code` do fluxo PKCE por sessão.
 *
 * Serve dois caminhos: o callback do OAuth (Google, Facebook) e o link de
 * e-mail quando o template ainda é o `{{ .ConfirmationURL }}` padrão. Devolve o
 * destino já resolvido para não obrigar o route handler a reabrir o contexto.
 */
export async function trocarCodigoPorSessao(
  codigo: string,
): Promise<{ readonly ok: true; readonly destino: string } | { readonly ok: false }> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase.auth.exchangeCodeForSession(codigo);
  if (error !== null || data.user === null) return { ok: false };

  const contexto = await lerContextoSessao(supabase, data.user.id);
  return { ok: true, destino: inicioDoUsuario(contexto) };
}

export type ResultadoDeLogin =
  | { readonly estado: 'ok'; readonly usuarioId: string; readonly contexto: LeituraDePapeis }
  | { readonly estado: 'credenciais_invalidas' }
  /** E-mail não confirmado — o Supabase distingue, e a tela de verificação depende disso. */
  | { readonly estado: 'email_nao_verificado' };

/**
 * Autentica e já devolve o contexto de sessão inteiro.
 *
 * O contexto vem na mesma ida porque **toda** decisão que segue depende dele:
 * para onde redirecionar, se a conta está bloqueada, se o cadastro do curador
 * está pendente, se o onboarding já foi visto. Ler depois seria uma segunda
 * viagem a `us-west-2` no caminho mais sensível da aplicação.
 */
export async function autenticar(email: string, senha: string): Promise<ResultadoDeLogin> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });

  if (error !== null) {
    // `email_not_confirmed` só aparece quando a confirmação está exigida no
    // projeto. Qualquer outro erro de credencial é tratado como "inválidas":
    // distinguir "e-mail não existe" de "senha errada" entrega ao atacante um
    // oráculo de contas existentes.
    if (error.code === 'email_not_confirmed') return { estado: 'email_nao_verificado' };
    return { estado: 'credenciais_invalidas' };
  }

  if (data.user === null) return { estado: 'credenciais_invalidas' };

  return {
    estado: 'ok',
    usuarioId: data.user.id,
    contexto: await lerContextoSessao(supabase, data.user.id),
  };
}

/**
 * Encerra a sessão deste dispositivo.
 *
 * `scope: 'local'` de propósito: sair no notebook não deve deslogar o celular.
 * Derrubar as **outras** é `encerrarOutrasSessoes`, e é outra ação — a das
 * telas 7.4 / 17.4 e do efeito da troca de credencial.
 */
export async function encerrarSessao(): Promise<void> {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut({ scope: 'local' });
}

/**
 * Derruba todas as outras sessões, mantendo esta.
 *
 * É o efeito que o protótipo promete em três telas — redefinição de senha
 * ("Encerramos as outras sessões da conta"), troca de senha e troca de e-mail —
 * e uma exigência de RNF-004.
 */
export async function encerrarOutrasSessoes(): Promise<void> {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut({ scope: 'others' });
}

/**
 * Reverte a exclusão de conta.
 *
 * "Conta desativada na hora, apagada em 30 dias, **reversível nesse prazo
 * entrando de novo**" (regras §10). Entrar de novo é literalmente o gatilho, e
 * é por isso que a guarda de rota deixa `desativada` navegar: barrá-la tornaria
 * a reversão impossível.
 *
 * O `update` passa pela sessão do próprio dono, e não pela service role: o
 * trigger `proibir_autoalteracao_de_situacao` (0001c) permite exatamente este
 * par de transições ao dono, e limpa `desativada_em` sozinho.
 */
export async function reativarConta(perfilId: string): Promise<void> {
  const supabase = await criarClienteServidor();

  const { error } = await supabase
    .from('perfil')
    .update({ situacao: 'ativa' })
    .eq('id', perfilId)
    .eq('situacao', 'desativada');

  estourarSeErro(error);
}

/** Provedores sociais oferecidos. */
export type ProvedorSocial = 'google' | 'facebook' | 'soundcloud';

/**
 * O nome de cada provedor para o Supabase Auth.
 *
 * Google e Facebook são nativos e o nome é o mesmo. SoundCloud **não é**: ele
 * entra como *custom OAuth provider*, e o identificador desses provedores
 * carrega o prefixo `custom:` obrigatoriamente.
 *
 * O `as Provider` existe por causa disso, e fica **só aqui**. O tipo `Provider`
 * do `supabase-js` é um union fechado com os nativos — não tem escape para
 * `custom:${string}`, embora o endpoint aceite e a documentação do recurso
 * mande usar exatamente esta forma. Sem o cast não há como chamar o que o
 * servidor expõe; com ele espalhado, a asserção viraria hábito.
 */
const NOME_NO_SUPABASE: Record<ProvedorSocial, Provider> = {
  google: 'google',
  facebook: 'facebook',
  soundcloud: 'custom:soundcloud' as Provider,
};

/**
 * A URL de autorização do provedor.
 *
 * `skipBrowserRedirect: true` porque o redirecionamento é nosso: estamos numa
 * Server Action, não no navegador, e é o `redirect()` do Next que leva a pessoa
 * lá. Sem isso o `supabase-js` tentaria navegar por `window.location`, que não
 * existe aqui.
 */
export async function urlDeAutorizacaoSocial(
  provedor: ProvedorSocial,
  urlDeRetorno: string,
): Promise<string> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: NOME_NO_SUPABASE[provedor],
    options: { redirectTo: urlDeRetorno, skipBrowserRedirect: true },
  });

  if (error !== null) throw error;
  if (data.url === null) {
    throw new Error(`o provedor ${provedor} não devolveu URL de autorização.`);
  }

  return data.url;
}

/**
 * Define o e-mail de uma conta que nasceu sem ele.
 *
 * Só o caminho do SoundCloud chega aqui: o `/me` deles não expõe endereço, e a
 * conta nasce com `email` nulo. O `updateUser` manda o link de confirmação e
 * **não** promove o endereço na hora — ele fica em `email_change` até a pessoa
 * clicar, e é por isso que `lerIdentidadeDaSessao` sabe ler os dois lugares.
 *
 * `email_exists` é o caso real de quem já tem conta por outro provedor com o
 * mesmo endereço: o linking automático do Supabase é ancorado em e-mail e,
 * sem e-mail, ele não teve como agir no callback.
 */
export async function definirEmailDaConta(
  email: string,
  urlDeRetorno: string,
): Promise<'ok' | 'email_em_uso'> {
  const supabase = await criarClienteServidor();

  const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: urlDeRetorno });

  if (error !== null) {
    if (error.code === 'email_exists' || error.status === 422) return 'email_em_uso';
    throw error;
  }

  return 'ok';
}

/**
 * Reenvia a confirmação de um e-mail que ainda não foi confirmado.
 *
 * Irmã de `reenviarVerificacao`, com `type: 'email_change'` — que é o tipo do
 * endereço definido **depois** da conta existir. Mesma resposta neutra: só o
 * estouro de limite se distingue.
 */
export async function reenviarConfirmacaoDeEmail(
  email: string,
  urlDeRetorno: string,
): Promise<'ok' | 'limite_de_envio'> {
  const supabase = await criarClienteServidor();

  const { error } = await supabase.auth.resend({
    type: 'email_change',
    email,
    options: { emailRedirectTo: urlDeRetorno },
  });

  if (error !== null && (error.code === 'over_email_send_rate_limit' || error.status === 429)) {
    return 'limite_de_envio';
  }

  return 'ok';
}

/**
 * Registra o aceite de Termos e Política, e confirma o nome.
 *
 * Só o caminho social passa por aqui: no cadastro por e-mail o aceite é
 * obrigatório no formulário e o trigger o grava. `is('aceite_termos_em', null)`
 * garante que reenviar a tela não reescreva a data do aceite original.
 */
export async function registrarAceiteDeTermos(perfilId: string, nome: string): Promise<void> {
  const supabase = await criarClienteServidor();

  const { error } = await supabase
    .from('perfil')
    .update({ nome_completo: nome, aceite_termos_em: new Date().toISOString() })
    .eq('id', perfilId)
    .is('aceite_termos_em', null);

  estourarSeErro(error);
}
