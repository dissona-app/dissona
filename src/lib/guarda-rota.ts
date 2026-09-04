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
import { Papel } from './papeis';

export const ROTA = {
  HOME: '/',
  TERMOS: '/termos',
  PRIVACIDADE: '/privacidade',
  ENTRAR: '/entrar',
  CADASTRAR: '/cadastrar',
  RECUPERAR_SENHA: '/recuperar-senha',
  REDEFINIR_SENHA: '/redefinir-senha',
  VERIFICAR_EMAIL: '/verificar-email',
  SELECAO_DE_PERFIL: '/selecao-de-perfil',
  ARTISTA: '/artista',
  CURADOR: '/curador',
  CURADOR_CADASTRO: '/curador/cadastro',
  ADMIN: '/admin',
  ADMIN_ENTRAR: '/admin/entrar',
  ADMIN_RECUPERAR_SENHA: '/admin/recuperar-senha',
  ADMIN_REDEFINIR_SENHA: '/admin/redefinir-senha',
} as const;

/** `(publico)` — sem exigência de sessão. */
const PUBLICAS: readonly string[] = [ROTA.HOME, ROTA.TERMOS, ROTA.PRIVACIDADE];

/** `(auth)` — sem sessão; redireciona quem já está autenticado. */
const AUTH_SEM_SESSAO: readonly string[] = [
  ROTA.ENTRAR,
  ROTA.CADASTRAR,
  ROTA.RECUPERAR_SENHA,
  ROTA.REDEFINIR_SENHA,
  ROTA.VERIFICAR_EMAIL,
];

/** `(admin)` — o login do admin é próprio e não exige sessão. */
const ADMIN_SEM_SESSAO: readonly string[] = [
  ROTA.ADMIN_ENTRAR,
  ROTA.ADMIN_RECUPERAR_SENHA,
  ROTA.ADMIN_REDEFINIR_SENHA,
];

export type Decisao =
  { readonly tipo: 'seguir' } | { readonly tipo: 'redirecionar'; readonly para: string };

export type ContextoDeAcesso = {
  readonly caminho: string;
  readonly leitura: LeituraDePapeis;
  /**
   * Se o cadastro do módulo 12 está concluído. `null` significa
   * indeterminado — é o caso da R0, em que `perfil_curador` ainda não existe.
   */
  readonly cadastroCuradorConcluido: boolean | null;
};

const seguir: Decisao = { tipo: 'seguir' };
const para = (destino: string): Decisao => ({ tipo: 'redirecionar', para: destino });

function ehOuEstaSob(caminho: string, prefixo: string): boolean {
  return caminho === prefixo || caminho.startsWith(`${prefixo}/`);
}

function temSessao(leitura: LeituraDePapeis): boolean {
  return leitura.estado !== 'sem_sessao';
}

/**
 * Onde jogar um usuário autenticado que caiu numa rota de login, ou que tentou
 * um ambiente que não é o dele.
 */
export function inicioDoUsuario(leitura: LeituraDePapeis): string {
  if (leitura.estado !== 'ok') {
    // Sem o esquema de papéis (R0) não há como escolher ambiente; a home
    // pública é o destino neutro.
    return ROTA.HOME;
  }
  if (leitura.papeis.includes(Papel.ARTISTA)) return ROTA.ARTISTA;
  if (leitura.papeis.includes(Papel.CURADOR)) return ROTA.CURADOR;
  if (leitura.papeis.includes(Papel.ADMIN)) return ROTA.ADMIN;
  return ROTA.SELECAO_DE_PERFIL;
}

function exigirSessao(contexto: ContextoDeAcesso, destinoDeLogin: string): Decisao | null {
  if (temSessao(contexto.leitura)) return null;
  const proximo = encodeURIComponent(contexto.caminho);
  return para(`${destinoDeLogin}?proximo=${proximo}`);
}

/**
 * Exige um papel — mas **só quando o esquema de papéis existe**.
 *
 * Enquanto `papel_usuario` não foi criada (R0), o recorte por papel é
 * inaplicável: não há dado para consultar. Nessa janela a exigência real é
 * sessão, e é isso que a função faz. Some sozinho quando a migration `0001`
 * entrar, porque `lerPapeis` deixa de devolver `sem_esquema`.
 */
function exigirPapel(leitura: LeituraDePapeis, papel: Papel, destinoAlternativo: string): Decisao {
  if (leitura.estado === 'sem_esquema') return seguir;
  if (leitura.estado === 'sem_sessao') return para(ROTA.ENTRAR);
  if (leitura.papeis.length === 0) return para(ROTA.SELECAO_DE_PERFIL);
  return leitura.papeis.includes(papel) ? seguir : para(destinoAlternativo);
}

export function decidirAcesso(contexto: ContextoDeAcesso): Decisao {
  const { caminho, leitura } = contexto;

  // --- (publico) -----------------------------------------------------------
  if (PUBLICAS.includes(caminho)) return seguir;

  // --- (admin), rotas de login próprio ------------------------------------
  if (ADMIN_SEM_SESSAO.includes(caminho)) {
    return temSessao(leitura) && exigirPapel(leitura, Papel.ADMIN, ROTA.HOME).tipo === 'seguir'
      ? para(ROTA.ADMIN)
      : seguir;
  }

  // --- (admin), painel -----------------------------------------------------
  if (ehOuEstaSob(caminho, ROTA.ADMIN)) {
    const semSessao = exigirSessao(contexto, ROTA.ADMIN_ENTRAR);
    if (semSessao !== null) return semSessao;
    return exigirPapel(leitura, Papel.ADMIN, ROTA.ADMIN_ENTRAR);
  }

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

    // Curador com cadastro pendente vai para o wizard do módulo 12 — mas o
    // wizard em si tem de ser acessível, senão o redirecionamento cicla.
    if (
      contexto.cadastroCuradorConcluido === false &&
      !ehOuEstaSob(caminho, ROTA.CURADOR_CADASTRO)
    ) {
      return para(ROTA.CURADOR_CADASTRO);
    }
    return seguir;
  }

  // Rota fora dos grupos conhecidos: o Next resolve (ou dá 404).
  return seguir;
}
