import 'server-only';

/**
 * Leituras de Conta para Server Components.
 *
 * Fina de propósito: o que a tela precisa de identidade e de papéis já vem de
 * `modulos/autenticacao/consultas` (a conta é uma só, e duplicar a leitura aqui
 * daria duas fontes para o mesmo e-mail). O que sobra é a lista de sessões, que
 * é exclusiva desta tela.
 */

import { lerSessoesDaConta as lerSessoesDoServico } from '@dissona/nucleo/modulos/conta/servico';
import type { SessaoAtiva } from '@dissona/nucleo/modulos/conta/repositorio';

export type { SessaoAtiva } from '@dissona/nucleo/modulos/conta/repositorio';

/** Sessões ativas da própria conta, da mais recente para a mais antiga. */
export async function lerSessoesDaConta(): Promise<readonly SessaoAtiva[]> {
  return lerSessoesDoServico();
}
