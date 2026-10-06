import 'server-only';

/**
 * Único ponto que grava notificação.
 *
 * Passa pela **service role**, e não pelo cliente da sessão, porque
 * `registrar_notificacao` foi revogada até de `authenticated` na `0005`: quem
 * emite evento é uma RPC ou um serviço, nunca o cliente. O `service_role`
 * mantém o grant padrão do Supabase, e é por ele que este arquivo escreve.
 *
 * Nada de `insert into notificacao` direto — a função resolve o catálogo,
 * aplica a preferência do usuário respeitando o flag `critico` e monta os
 * canais. Reimplementar isso aqui seria reimplementá-lo em dez lugares.
 */

import { criarClienteDeServico } from '@/lib/supabase/servico';

import type { ContextoNotificacao, EventoNotificacao } from './tipos';

export type Destinatario = {
  readonly perfilId: string;
  readonly evento: EventoNotificacao;
  readonly contexto?: ContextoNotificacao;
  /** Sobrescreve a `rota_destino` do catálogo, quando o evento aponta para um item específico. */
  readonly rota?: string;
};

/**
 * Grava uma notificação. Devolve o id, ou `null` quando a preferência do
 * usuário desligou todos os canais do evento — que é a resposta honesta de
 * `registrar_notificacao`, e não um erro.
 */
export async function registrarNotificacao(destinatario: Destinatario): Promise<string | null> {
  const supabase = criarClienteDeServico();

  const { data, error } = await supabase.rpc('registrar_notificacao', {
    p_perfil_id: destinatario.perfilId,
    p_evento: destinatario.evento,
    p_contexto: destinatario.contexto ?? {},
    ...(destinatario.rota === undefined ? {} : { p_rota: destinatario.rota }),
  });

  if (error !== null) throw error;
  return data;
}

/**
 * Perfis da equipe administrativa ativa.
 *
 * Os eventos com destinatário `admin` na matriz — "novo cadastro", "curador
 * Prata em análise" — **abrem em leque**: uma linha de `notificacao` por
 * membro. Não existe caixa de entrada coletiva, e a suíte da `0001` aprendeu
 * isso do jeito difícil, quando uma contagem de 1 passou a ver 3.
 */
export async function lerPerfisDaEquipeAdmin(): Promise<readonly string[]> {
  const supabase = criarClienteDeServico();

  const { data, error } = await supabase.from('membro_admin').select('perfil_id').eq('ativo', true);

  if (error !== null) throw error;
  return data.map((linha) => linha.perfil_id);
}
