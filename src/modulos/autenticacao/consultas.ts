import 'server-only';

/**
 * Leituras de sessão para Server Components.
 *
 * Os `layout.tsx` dos três ambientes passavam `papeis` fixo (`['artista']`,
 * `['admin']`) desde a R0, com o efeito de `TrocaDePapel` nunca aparecer — nem
 * para a conta que tem os dois papéis, que é o único caso em que ela serve.
 * Isto é o que fecha aquela lacuna.
 */

import type { Papel } from '@/lib/papeis';
import { lerContextoSessao } from '@/lib/papeis';
import { criarClienteServidor, usuarioAtual } from '@/lib/supabase/servidor';

/**
 * Papéis ativos da sessão.
 *
 * Lista vazia quando não há sessão. **Não** redireciona: quem barra é o
 * middleware, e uma segunda decisão de redirecionamento aqui produziria dois
 * `Location` diferentes para o mesmo pedido sob condição de corrida — o tipo
 * de bug que aparece como "às vezes cai na home ao logar".
 */
export async function lerPapeisDaSessao(): Promise<readonly Papel[]> {
  const usuario = await usuarioAtual();
  if (usuario === null) return [];

  const supabase = await criarClienteServidor();
  const contexto = await lerContextoSessao(supabase, usuario.id);
  return contexto.estado === 'ok' ? contexto.papeis : [];
}

export type IdentidadeDaSessao = {
  readonly nome: string;
  readonly email: string;
  readonly iniciais: string;
};

/**
 * Nome, e-mail e iniciais para o menu do header (o "RS · Rafael" do
 * protótipo). `null` sem sessão.
 */
export async function lerIdentidadeDaSessao(): Promise<IdentidadeDaSessao | null> {
  const usuario = await usuarioAtual();
  if (usuario === null) return null;

  const email = usuario.email ?? '';
  const metadados = usuario.user_metadata as { readonly nome_completo?: unknown } | null;
  const nomeCompleto =
    typeof metadados?.nome_completo === 'string' && metadados.nome_completo.trim() !== ''
      ? metadados.nome_completo.trim()
      : (email.split('@')[0] ?? '');

  return {
    nome: nomeCompleto.split(' ')[0] ?? nomeCompleto,
    email,
    iniciais: iniciaisDe(nomeCompleto),
  };
}

/** Duas primeiras iniciais, como o protótipo monta (`initials`). */
function iniciaisDe(nome: string): string {
  const partes = nome.split(/\s+/).filter((parte) => parte !== '');
  const letras = partes.slice(0, 2).map((parte) => parte.charAt(0).toUpperCase());
  return letras.join('') === '' ? 'DS' : letras.join('');
}
