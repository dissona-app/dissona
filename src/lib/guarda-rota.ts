/**
 * Guarda de rota por route group (architecture.md §5.1).
 *
 * Função **pura**: recebe o caminho e o que se sabe da sessão, devolve a
 * decisão. O `middleware.ts` só faz a I/O e aplica o resultado. Assim a
 * matriz de acesso é testável sem subir servidor nem banco.
 *
 * Lembrete de camadas (§5.2): esta é a **segunda** das três camadas de
 * autorização. Ela evita renderizar tela que o usuário não pode ver; a
 * fronteira real é a RLS no banco.
 */

import type { LeituraDePapeis } from './papeis';
import { contaAtiva, Papel, SituacaoCurador } from './papeis';

export const ROTA = {
  HOME: '/',
  TERMOS: '/termos',
  PRIVACIDADE: '/privacidade',
  ENTRAR: '/entrar',
  CADASTRAR: '/cadastrar',
  /** Confirmação de nome e aceite depois do OAuth — o social não pode "confirmar antes de criar". */
  CADASTRAR_CONFIRMAR: '/cadastrar/confirmar',
  RECUPERAR_SENHA: '/recuperar-senha',
  REDEFINIR_SENHA: '/redefinir-senha',
  VERIFICAR_EMAIL: '/verificar-email',
  SELECAO_DE_PERFIL: '/selecao-de-perfil',
  ONBOARDING: '/onboarding',
  ARTISTA: '/artista',
  /** "Perfil" na sidebar (7.1) — o que o curador vê antes de ouvir. */
  ARTISTA_PERFIL: '/artista/perfil',
  /** Carteira (5) e extrato (5.3). O extrato é rota própria porque o protótipo lhe dá endereço ("Ver extrato", "Ver tudo"). */
  ARTISTA_CARTEIRA: '/artista/carteira',
  ARTISTA_EXTRATO: '/artista/carteira/extrato',
  /**
   * Pacotes de Claves (5.1) e checkout (5.2).
   *
   * Duas rotas, e não duas abas da Carteira como no protótipo: o protótipo é
   * uma tela só que troca de `caView`, e aqui "Comprar Claves" precisa de
   * endereço — é o destino do CTA da Carteira, do estado vazio e do bloqueio
   * por saldo insuficiente na seleção de curadores. O checkout leva o id do
   * pacote no caminho porque é dele que o resumo do pedido é derivado; o
   * pedido só nasce no "Confirmar compra".
   */
  ARTISTA_PACOTES: '/artista/pacotes',
  /**
   * Envio de música (3) — wizard de 3 passos.
   *
   * O passo 1 é a própria raiz, porque ainda não existe faixa. Do passo 2 em
   * diante o id entra no caminho (`/artista/enviar/<faixaId>/contexto`): o
   * progresso é persistido na linha, e sem o id na URL a retomada não teria
   * endereço — é a mesma razão que fez o wizard do curador ter uma rota por
   * passo.
   */
  ARTISTA_ENVIAR: '/artista/enviar',
  /** "Configurações" na sidebar, `/artista/conta` na URL — os dois são do protótipo (`route === 'conta'`). */
  ARTISTA_CONTA: '/artista/conta',
  CURADOR: '/curador',
  CURADOR_CONTA: '/curador/conta',
  /** Fila de avaliações (13) e o detalhe do item (13.1). */
  CURADOR_FILA: '/curador/fila',
  /** Wizard de avaliação (14) — uma rota por envio. */
  CURADOR_AVALIAR: '/curador/avaliar',
  CURADOR_CADASTRO: '/curador/cadastro',
  /**
   * "Meu cadastro" na sidebar — a manutenção de mídias e serviços (12.6).
   *
   * Rota própria, e não `CURADOR_CADASTRO`: aquela é a **retomada** do wizard e
   * redireciona quem já concluiu para a classificação, o que faria "Meu
   * cadastro" abrir a tela de parabéns do Bronze.
   */
  CURADOR_MEU_CADASTRO: '/curador/meu-cadastro',
  CURADOR_CADASTRO_CLASSIFICACAO: '/curador/cadastro/classificacao',
  CURADOR_CADASTRO_ANALISE: '/curador/cadastro/analise',
  ADMIN: '/admin',
  ADMIN_ENTRAR: '/admin/entrar',
  ADMIN_RECUPERAR_SENHA: '/admin/recuperar-senha',
  ADMIN_REDEFINIR_SENHA: '/admin/redefinir-senha',
  /** "Conta e equipe" (27.1) — `equipe` é o nome da rota no protótipo do admin. */
  ADMIN_EQUIPE: '/admin/equipe',
  ADMIN_CONVITE: '/admin/convite',
  API_AUTH_CALLBACK: '/api/auth/callback',
  API_AUTH_CONFIRMAR: '/api/auth/confirmar',
} as const;

/**
 * Motivos que a tela de login lê de `?motivo=` para escolher o banner.
 *
 * Existem porque o middleware não tem como devolver um `ResultadoDeAcao`: ele
 * redireciona, e a razão do redirecionamento tem de viajar na URL. Sem isso, a
 * pessoa que acabou de ser bloqueada cai no login sem explicação nenhuma.
 */
export const MOTIVO_LOGIN = {
  BLOQUEADA: 'bloqueada',
  SEM_ACESSO_ADMIN: 'sem-acesso-admin',
  /** OAuth voltou sem `code`, ou com um que o Auth recusou. */
  FALHA_SOCIAL: 'social',
} as const;

export type MotivoLogin = (typeof MOTIVO_LOGIN)[keyof typeof MOTIVO_LOGIN];

/** `(publico)` — sem exigência de sessão. */
const PUBLICAS: readonly string[] = [ROTA.HOME, ROTA.TERMOS, ROTA.PRIVACIDADE];

/**
 * Route handlers de autenticação. Sem sessão de propósito: são justamente o
 * ponto em que a sessão nasce — o `code` do OAuth e o `token_hash` do e-mail
 * chegam aqui para virar cookie.
 */
const API_SEM_SESSAO: readonly string[] = [ROTA.API_AUTH_CALLBACK, ROTA.API_AUTH_CONFIRMAR];

/** `(auth)` — sem sessão; redireciona quem já está autenticado. */
const AUTH_SEM_SESSAO: readonly string[] = [ROTA.ENTRAR, ROTA.CADASTRAR, ROTA.RECUPERAR_SENHA];

/** `(admin)` — o login do admin é próprio e não exige sessão. */
const ADMIN_SEM_SESSAO: readonly string[] = [ROTA.ADMIN_ENTRAR, ROTA.ADMIN_RECUPERAR_SENHA];

/**
 * As duas telas de redefinição — indiferentes à sessão, e por um motivo que
 * não é preguiça.
 *
 * Elas **não** podem redirecionar quem tem sessão, porque o link de
 * recuperação cria uma: é a `verifyOtp({ type: 'recovery' })` que a estabelece,
 * e é ela que permite trocar a senha sem apresentar a atual. Expulsar a sessão
 * autenticada daqui, como o resto de `(auth)` faz, tornaria a recuperação
 * impossível de concluir.
 *
 * E também não podem redirecionar quem **não** tem sessão: sem ela a tela tem
 * um estado próprio a mostrar, "Este link expirou ou já foi usado", com o
 * "Reiniciar recuperação". Mandar essa pessoa ao login esconderia dela o botão
 * de que precisa.
 *
 * A autorização real não está aqui: é o marcador de recuperação, checado na
 * própria tela. A guarda de rota não tem como vê-lo, porque ele é um cookie de
 * fluxo e não parte do contexto de sessão.
 */
const REDEFINICAO: readonly string[] = [ROTA.REDEFINIR_SENHA, ROTA.ADMIN_REDEFINIR_SENHA];

export type Decisao =
  { readonly tipo: 'seguir' } | { readonly tipo: 'redirecionar'; readonly para: string };

export type ContextoDeAcesso = {
  readonly caminho: string;
  /**
   * O `?code=` da requisição, quando houver — só o valor, não a query inteira.
   *
   * Existe por causa de uma falha que não dá sinal nenhum: o GoTrue **descarta**
   * um `redirect_to` que não esteja na allow-list de Redirect URLs e usa o Site
   * URL no lugar, sem erro. O código do OAuth chega então na home, que não lê
   * `searchParams`, e o login falha calado.
   */
  readonly codigoDeAutenticacao?: string | null;
  readonly leitura: LeituraDePapeis;
};

const seguir: Decisao = { tipo: 'seguir' };
const para = (destino: string): Decisao => ({ tipo: 'redirecionar', para: destino });

function ehOuEstaSob(caminho: string, prefixo: string): boolean {
  return caminho === prefixo || caminho.startsWith(`${prefixo}/`);
}

function temSessao(leitura: LeituraDePapeis): boolean {
  return leitura.estado !== 'sem_sessao';
}

function rotaDoPapel(papel: Papel): string {
  if (papel === Papel.ARTISTA) return ROTA.ARTISTA;
  if (papel === Papel.CURADOR) return ROTA.CURADOR;
  return ROTA.ADMIN;
}

/**
 * O ambiente da conta, respeitando o último usado (RF-008).
 *
 * Exportada porque o onboarding precisa dela e **não** pode usar
 * `inicioDoUsuario`: aquela devolveria `/onboarding` de novo se a gravação de
 * `onboarding_visto_em` falhasse, e a pessoa ficaria presa no tour. Esta sempre
 * aponta para fora.
 *
 * A ordem de prioridade — artista, curador, admin — é o desempate para quem
 * nunca entrou. Antes da `0001c` ela era a **única** regra, e mandava um
 * curador-e-artista sempre para o ambiente do artista, mesmo que ele nunca
 * usasse aquele lado.
 */
export function ambienteDoUsuario(leitura: LeituraDePapeis): string {
  if (leitura.estado !== 'ok') return ROTA.HOME;

  const ultimo = leitura.ultimoAmbiente;
  if (ultimo !== null && leitura.papeis.includes(ultimo)) return rotaDoPapel(ultimo);

  if (leitura.papeis.includes(Papel.ARTISTA)) return ROTA.ARTISTA;
  if (leitura.papeis.includes(Papel.CURADOR)) return ROTA.CURADOR;
  if (leitura.papeis.includes(Papel.ADMIN)) return ROTA.ADMIN;
  return ROTA.SELECAO_DE_PERFIL;
}

/**
 * Onde jogar um usuário autenticado que caiu numa rota de login, ou que acabou
 * de entrar.
 *
 * O onboarding entra **aqui**, e não como guarda de todas as rotas
 * autenticadas. A diferença importa: como guarda permanente, uma falha ao
 * gravar `onboarding_visto_em` prenderia a pessoa num laço de redirecionamento.
 * Aqui, a mesma falha custa ver o tour outra vez no próximo login — que é o
 * pior resultado aceitável.
 */
export function inicioDoUsuario(leitura: LeituraDePapeis): string {
  // Sem sessão não há ambiente a escolher; a home pública é o destino neutro.
  if (leitura.estado !== 'ok') return ROTA.HOME;
  if (leitura.papeis.length === 0) return ROTA.SELECAO_DE_PERFIL;

  // "Curador (1º acesso) → Cadastro de curador (12) → depois o onboarding do
  // curador" (PRD 1.4). O wizard vem antes do tour, e não o contrário.
  //
  // Só quando `curador` é o único papel: quem também é artista já tem um
  // ambiente pronto para receber, e mandá-lo ao wizard seria trocar uma tela
  // que funciona por um formulário de oito passos que ele não pediu.
  const soCurador = leitura.papeis.length === 1 && leitura.papeis[0] === Papel.CURADOR;
  if (soCurador && !leitura.cadastroCuradorConcluido) return ROTA.CURADOR_CADASTRO;

  if (!leitura.onboardingVisto) return ROTA.ONBOARDING;

  return ambienteDoUsuario(leitura);
}

function exigirSessao(contexto: ContextoDeAcesso, destinoDeLogin: string): Decisao | null {
  if (temSessao(contexto.leitura)) return null;
  const proximo = encodeURIComponent(contexto.caminho);
  return para(`${destinoDeLogin}?proximo=${proximo}`);
}

/**
 * Exige um papel.
 *
 * Conta sem papel nenhum vai para a seleção de perfil (1.4), e não para o
 * login: ela **está** autenticada, só não escolheu o ambiente ainda.
 */
function exigirPapel(leitura: LeituraDePapeis, papel: Papel, destinoAlternativo: string): Decisao {
  if (leitura.estado === 'sem_sessao') return para(ROTA.ENTRAR);
  if (leitura.papeis.length === 0) return para(ROTA.SELECAO_DE_PERFIL);
  return leitura.papeis.includes(papel) ? seguir : para(destinoAlternativo);
}

export function decidirAcesso(contexto: ContextoDeAcesso): Decisao {
  const { caminho, codigoDeAutenticacao, leitura } = contexto;

  // --- código de OAuth que caiu na home ------------------------------------
  //
  // Rede de proteção para o Site URL divergir da allow-list: nesse caso o
  // Supabase manda o `code` para a raiz, onde ninguém o troca por sessão. Vem
  // antes de `PUBLICAS` porque `/` está lá e devolveria `seguir`, engolindo o
  // código. Encaminhar custa um redirecionamento e faz o login funcionar.
  //
  // Não cicla: `/api/auth/callback` está em `API_SEM_SESSAO`, logo abaixo.
  if (
    caminho === ROTA.HOME &&
    codigoDeAutenticacao !== undefined &&
    codigoDeAutenticacao !== null &&
    codigoDeAutenticacao !== ''
  ) {
    return para(`${ROTA.API_AUTH_CALLBACK}?code=${encodeURIComponent(codigoDeAutenticacao)}`);
  }

  // --- sem guarda ----------------------------------------------------------
  if (PUBLICAS.includes(caminho)) return seguir;
  if (API_SEM_SESSAO.includes(caminho)) return seguir;
  // Antes do ramo de conta bloqueada: quem tem a senha comprometida e a conta
  // suspensa ainda precisa poder redefini-la.
  if (REDEFINICAO.includes(caminho)) return seguir;

  // --- conta bloqueada -----------------------------------------------------
  //
  // A ação de login já desfaz a sessão de uma conta bloqueada, então este ramo
  // atende ao caso que ela não alcança: o admin bloqueia (20.2 / 23.2) alguém
  // que **já está** navegando. Sem isto, a pessoa segue usando o produto até o
  // token expirar.
  //
  // `desativada` não cai aqui: a exclusão é reversível por 30 dias "entrando de
  // novo", e é o próprio login que reverte.
  if (leitura.estado === 'ok' && !contaAtiva(leitura)) {
    if (caminho === ROTA.ENTRAR || caminho === ROTA.ADMIN_ENTRAR) return seguir;
    return para(`${ROTA.ENTRAR}?motivo=${MOTIVO_LOGIN.BLOQUEADA}`);
  }

  // --- (admin), rotas de login próprio -------------------------------------
  if (ADMIN_SEM_SESSAO.includes(caminho)) {
    return temSessao(leitura) && exigirPapel(leitura, Papel.ADMIN, ROTA.HOME).tipo === 'seguir'
      ? para(ROTA.ADMIN)
      : seguir;
  }

  // --- (admin), aceite de convite ------------------------------------------
  //
  // Não exige papel `admin`, e é o ponto: aceitar o convite é justamente o ato
  // que concede o papel (27.3). No ramo do painel abaixo a guarda barraria toda
  // pessoa convidada, e nenhuma conta administrativa nova conseguiria nascer.
  //
  // E também não exige **sessão**, o que é menos óbvio. `exigirSessao` monta o
  // `?proximo=` a partir de `contexto.caminho`, que é o *pathname* — sem a
  // query. Mandar a pessoa ao login com `proximo=/admin/convite` a traria de
  // volta **sem o token**, para uma tela que não sabe mais qual convite era.
  // Então a rota é indiferente à sessão e a tela tem um estado próprio para
  // isso: "o convite vale para o e-mail que o recebeu; entre com essa conta e
  // abra o link de novo". O link continua na caixa de entrada dela.
  if (ehOuEstaSob(caminho, ROTA.ADMIN_CONVITE)) return seguir;

  // --- (admin), painel -----------------------------------------------------
  if (ehOuEstaSob(caminho, ROTA.ADMIN)) {
    const semSessao = exigirSessao(contexto, ROTA.ADMIN_ENTRAR);
    if (semSessao !== null) return semSessao;
    return exigirPapel(leitura, Papel.ADMIN, ROTA.ADMIN_ENTRAR);
  }

  // --- (auth), confirmação do cadastro social ------------------------------
  //
  // Ao contrário do resto de `(auth)`, esta **exige** sessão: ela só existe
  // depois do callback do OAuth, para colher o aceite de termos que o provedor
  // não colhe.
  if (caminho === ROTA.CADASTRAR_CONFIRMAR) {
    return exigirSessao(contexto, ROTA.ENTRAR) ?? seguir;
  }

  // --- aceite de termos pendente -------------------------------------------
  //
  // Só acontece com conta criada por login social: o cadastro por e-mail exige
  // o aceite, e o trigger o grava. No social a conta nasce no callback e
  // ninguém aceitou nada — então a tela de confirmação é obrigatória, e
  // enquanto ela não for concluída todo caminho volta para ela.
  //
  // Sem isto, quem fecha a aba naquela tela volta a entrar com sessão válida e
  // nunca mais a vê: ficaria uma conta ativa sem o aceite que a LGPD exige
  // (RF-010).
  //
  // Fica **depois** dos ramos de `/admin`, que retornam antes: conta
  // administrativa nasce por convite, e o aceite dela é registrado no aceite do
  // convite (27.3) — mandá-la para uma tela de cadastro de artista seria
  // absurdo. E quem não quer aceitar sai pelo "Sair" da própria tela de
  // confirmação, que é a única saída que ela oferece de propósito.
  if (leitura.estado === 'ok' && !leitura.aceiteTermos) {
    return para(ROTA.CADASTRAR_CONFIRMAR);
  }

  // --- (auth), verificação de e-mail ---------------------------------------
  //
  // Indiferente à sessão, como as telas de redefinição e pelo mesmo tipo de
  // motivo. No cadastro por e-mail não há sessão aqui: a confirmação é exigida
  // antes da primeira, e a tela existe justamente nesse vão. No cadastro por
  // **SoundCloud** há — a conta nasce sem endereço, ele é colhido em
  // `/cadastrar/confirmar`, e a pessoa chega aqui autenticada, com o link a
  // caminho. Expulsá-la como o resto de `(auth)` faz esconderia dela o
  // "Reenviar e-mail" no único momento em que ele importa.
  //
  // Não bloqueia ninguém: quem quiser navegar com o e-mail pendente, navega. A
  // decisão de não travar a conta está em open-questions #9.
  if (caminho === ROTA.VERIFICAR_EMAIL) return seguir;

  // --- (auth) --------------------------------------------------------------
  if (AUTH_SEM_SESSAO.includes(caminho)) {
    return temSessao(leitura) ? para(inicioDoUsuario(leitura)) : seguir;
  }

  if (caminho === ROTA.SELECAO_DE_PERFIL) {
    const semSessao = exigirSessao(contexto, ROTA.ENTRAR);
    if (semSessao !== null) return semSessao;
    // Quem já tem papel não precisa escolher de novo.
    if (leitura.estado === 'ok' && leitura.papeis.length > 0) {
      return para(inicioDoUsuario(leitura));
    }
    return seguir;
  }

  // --- onboarding ----------------------------------------------------------
  //
  // Sem redirecionamento de saída, de propósito: "Rever onboarding" no menu de
  // ajuda reabre o tour depois de ele já ter sido visto (RF-007).
  if (caminho === ROTA.ONBOARDING) {
    const semSessao = exigirSessao(contexto, ROTA.ENTRAR);
    if (semSessao !== null) return semSessao;
    if (leitura.estado === 'ok' && leitura.papeis.length === 0) {
      return para(ROTA.SELECAO_DE_PERFIL);
    }
    return seguir;
  }

  // --- (app)/artista -------------------------------------------------------
  if (ehOuEstaSob(caminho, ROTA.ARTISTA)) {
    const semSessao = exigirSessao(contexto, ROTA.ENTRAR);
    if (semSessao !== null) return semSessao;
    return exigirPapel(leitura, Papel.ARTISTA, inicioDoUsuario(leitura));
  }

  // --- (app)/curador -------------------------------------------------------
  if (ehOuEstaSob(caminho, ROTA.CURADOR)) {
    const semSessao = exigirSessao(contexto, ROTA.ENTRAR);
    if (semSessao !== null) return semSessao;

    const decisaoPapel = exigirPapel(leitura, Papel.CURADOR, inicioDoUsuario(leitura));
    if (decisaoPapel.tipo === 'redirecionar') return decisaoPapel;

    // Duas famílias de rota ficam de fora dos dois desvios abaixo.
    //
    // O wizard e as telas finais por classe, porque senão o redirecionamento
    // cicla — tudo sob `/curador/cadastro`.
    //
    // E **Conta e configurações**: trocar a senha e excluir a conta não podem
    // depender de o cadastro estar concluído nem de a Prata estar aprovada.
    // Uma conta só de curador em `prata_em_analise` ficaria sem nenhum caminho
    // para exercer o direito de exclusão da LGPD — e a espera pela aprovação é
    // justamente quando alguém desiste.
    const foraDosDesvios =
      ehOuEstaSob(caminho, ROTA.CURADOR_CADASTRO) || ehOuEstaSob(caminho, ROTA.CURADOR_CONTA);

    if (leitura.estado === 'ok' && !foraDosDesvios) {
      // Cadastro pendente → wizard do módulo 12.
      if (!leitura.cadastroCuradorConcluido) return para(ROTA.CURADOR_CADASTRO);

      // Candidato a Prata não entra no painel: "Assim que for aprovado, você
      // recebe um aviso por e-mail e o acesso à curadoria é liberado" (12.5).
      // `cadastroCuradorConcluido` sozinho não distingue este caso — ele é
      // verdadeiro para o Bronze liberado e para o Prata em análise.
      if (leitura.situacaoCurador === SituacaoCurador.PRATA_EM_ANALISE) {
        return para(ROTA.CURADOR_CADASTRO_ANALISE);
      }
    }
    return seguir;
  }

  // Rota fora dos grupos conhecidos: o Next resolve (ou dá 404).
  return seguir;
}
