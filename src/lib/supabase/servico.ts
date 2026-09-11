import 'server-only';

/**
 * Cliente Supabase com a **chave de serviço** — ignora RLS.
 *
 * Este arquivo é a antítese de `servidor.ts`, e o comentário lá diz por quê: a
 * RLS é a fronteira real (architecture.md §5.2), e um cliente que a ignora no
 * caminho de request anula essa fronteira. Então este cliente existe só para o
 * que a RLS **não pode** cobrir, e são três coisas concretas:
 *
 *  1. `registrar_notificacao` está revogada até de `authenticated` (0005): quem
 *     emite evento é uma RPC ou um serviço, nunca o cliente. O `service_role`
 *     mantém o grant padrão, e é por ele que `servicoNotificacao` escreve.
 *
 *  2. `auth.sessions` é do schema `auth`, fora do alcance de qualquer policy
 *     nossa. O painel de "Sessões ativas" (7.4 / 17.4) não tem outro caminho.
 *
 *  3. `auth.admin.*` — convite de membro (27.3) e confirmação de e-mail na
 *     suíte E2E. São operações administrativas do Auth por definição.
 *
 * Regras de uso, e elas não são sugestões:
 *
 *  - **Nunca** num Server Component. Só em Server Action, Route Handler ou job,
 *    onde a autorização já foi checada explicitamente antes.
 *  - **Sempre** com o `perfil_id` do dono no `where`. Sem RLS, o filtro é a
 *    única coisa que separa a linha certa da linha de outra pessoa, e ele passa
 *    a ser código — que é exatamente o motivo de a lista acima ser curta.
 *  - `persistSession: false`: este cliente não tem sessão de usuário e não deve
 *    tocar em cookie nenhum. Sem isso ele tentaria guardar a "sessão" da chave
 *    de serviço, que é um objeto que não existe.
 */

import { createClient } from '@supabase/supabase-js';

import { ambiente } from '../ambiente';
import type { Database } from './tipos-bd';

export function criarClienteDeServico() {
  return createClient<Database>(ambiente.supabase.url, ambiente.supabase.chaveDeServico, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type ClienteDeServico = ReturnType<typeof criarClienteDeServico>;
