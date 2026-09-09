import 'server-only';

/**
 * Único ponto que fala com o Supabase Auth.
 *
 * `signInWithPassword` grava a sessão em cookie pelo `createServerClient` do
 * `@supabase/ssr`, que já é configurado para isso em `lib/supabase/servidor`.
 * Nada aqui decide para onde ir depois nem que mensagem mostrar.
 */

import type { Papel } from '@/lib/papeis';
import { lerContextoSessao } from '@/lib/papeis';
import { criarClienteServidor } from '@/lib/supabase/servidor';

export type ResultadoDeLogin =
  | { readonly estado: 'ok'; readonly usuarioId: string; readonly papeis: readonly Papel[] }
  | { readonly estado: 'credenciais_invalidas' }
  /** E-mail não confirmado — o Supabase distingue, e a tela 1.2 depende disso. */
  | { readonly estado: 'email_nao_verificado' };

/**
 * Autentica e já devolve os papéis.
 *
 * Os papéis vêm na mesma ida porque **toda** decisão que segue depende deles:
 * para onde redirecionar (artista, curador ou seleção de perfil) e, no login
 * do admin, se a conta tem acesso àquela área. Ler depois seria uma segunda
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

  const contexto = await lerContextoSessao(supabase, data.user.id);
  return {
    estado: 'ok',
    usuarioId: data.user.id,
    papeis: contexto.estado === 'ok' ? contexto.papeis : [],
  };
}

/**
 * Encerra a sessão.
 *
 * `scope: 'local'` derruba só este dispositivo. "Sair de todos os
 * dispositivos" é a tela 7.4/17.4 da R1, e é outra ação — sair no notebook não
 * deve deslogar o celular.
 */
export async function encerrarSessao(): Promise<void> {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut({ scope: 'local' });
}
