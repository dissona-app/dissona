import 'server-only';

/**
 * Leituras de sessão para Server Components.
 *
 * Os `layout.tsx` dos três ambientes passavam `papeis` fixo (`['artista']`,
 * `['admin']`) desde a R0, com o efeito de a troca de ambiente nunca aparecer
 * — nem para a conta que tem os dois papéis, que é o único caso em que ela
 * serve. Isto é o que fecha aquela lacuna.
 */

import type { LeituraDePapeis, Papel } from '@/lib/papeis';
import { lerContextoSessao } from '@/lib/papeis';
import { criarClienteServidor, usuarioAtual } from '@/lib/supabase/servidor';

/**
 * O contexto de sessão inteiro, para Server Components.
 *
 * **Não** redireciona: quem barra é o middleware, e uma segunda decisão de
 * redirecionamento aqui produziria dois `Location` diferentes para o mesmo
 * pedido sob condição de corrida — o tipo de bug que aparece como "às vezes
 * cai na home ao logar".
 */
export async function lerContextoDaSessao(): Promise<LeituraDePapeis> {
  const usuario = await usuarioAtual();
  if (usuario === null) return { estado: 'sem_sessao' };

  const supabase = await criarClienteServidor();
  return lerContextoSessao(supabase, usuario.id);
}

/**
 * Papéis ativos da sessão. Lista vazia quando não há sessão.
 *
 * Continua existindo porque é o que os três layouts querem — eles passam
 * `papeis` ao `Shell` e não precisam do resto.
 */
export async function lerPapeisDaSessao(): Promise<readonly Papel[]> {
  const contexto = await lerContextoDaSessao();
  return contexto.estado === 'ok' ? contexto.papeis : [];
}

export type IdentidadeDaSessao = {
  readonly nome: string;
  readonly email: string;
  /**
   * O endereço existe, mas ainda não foi confirmado pelo link.
   *
   * Só acontece no caminho social sem e-mail (SoundCloud): o endereço é colhido
   * na confirmação do cadastro e fica em `new_email` até a pessoa clicar. A
   * conta navega nesse meio-tempo — a decisão foi não bloquear — então quem
   * mostra o e-mail precisa poder dizer que ele está pendente.
   */
  readonly emailPendente: boolean;
  readonly iniciais: string;
};

/**
 * Nome, e-mail e iniciais para o menu do header (o "RS · Rafael" do
 * protótipo). `null` sem sessão.
 */
export async function lerIdentidadeDaSessao(): Promise<IdentidadeDaSessao | null> {
  const usuario = await usuarioAtual();
  if (usuario === null) return null;

  // `new_email` é o endereço aguardando confirmação. Sem esta queda, uma conta
  // criada por SoundCloud mostraria o campo **vazio** logo depois de a pessoa
  // ter digitado o endereço — o que pareceria perda de dado.
  const confirmado = usuario.email ?? '';
  const pendente = usuario.new_email ?? '';
  const email = confirmado !== '' ? confirmado : pendente;

  const metadados = usuario.user_metadata as {
    readonly nome_completo?: unknown;
    readonly full_name?: unknown;
    readonly name?: unknown;
  } | null;

  // A mesma ordem do trigger `criar_perfil_para_novo_usuario` (0002e): a nossa
  // chave, o que o provedor mandou, e só então o e-mail. Sem `full_name`/`name`
  // aqui, uma conta social recém-criada cairia no `split('@')` de um endereço
  // que ainda nem existe, e ficaria sem nome e com as iniciais de fallback.
  const nomeCompleto =
    primeiroTexto(metadados?.nome_completo, metadados?.full_name, metadados?.name) ||
    (email.split('@')[0] ?? '');

  return {
    nome: nomeCompleto.split(' ')[0] ?? nomeCompleto,
    email,
    emailPendente: confirmado === '' && pendente !== '',
    iniciais: iniciaisDe(nomeCompleto),
  };
}

/** O primeiro dos candidatos que seja texto útil; `''` se nenhum for. */
function primeiroTexto(...candidatos: readonly unknown[]): string {
  for (const candidato of candidatos) {
    if (typeof candidato === 'string' && candidato.trim() !== '') return candidato.trim();
  }
  return '';
}

/** Duas primeiras iniciais, como o protótipo monta (`initials`). */
function iniciaisDe(nome: string): string {
  const partes = nome.split(/\s+/).filter((parte) => parte !== '');
  const letras = partes.slice(0, 2).map((parte) => parte.charAt(0).toUpperCase());
  return letras.join('') === '' ? 'DS' : letras.join('');
}
