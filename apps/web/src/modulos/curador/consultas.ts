import 'server-only';

/**
 * Leituras do cadastro do curador, para Server Components.
 *
 * Uma função só: o wizard é uma tela com oito faces, e todas as oito precisam
 * do mesmo objeto. A revisão do passo 8 precisa dele inteiro.
 */

import { criarClienteServidor } from '@/lib/supabase/servidor';
import { usuarioAtual } from '@/lib/supabase/servidor';
import { estourarSeErro } from '@/lib/supabase/erros';

import { lerEstadoDoCadastro } from './repositorio';
import type { EstadoDoCadastro } from './tipos';

/**
 * O estado do wizard, criando a linha de `perfil_curador` se ela não existir.
 *
 * A linha nasce na seleção de perfil (`ativarPapel`), então este `upsert` é
 * rede de segurança para dois caminhos reais: a conta que ganhou o papel
 * `curador` por outro meio — o seed de E2E, ou o `dados-e2e.sql` — e a corrida
 * entre ativar o papel e abrir o wizard.
 *
 * Sem ele, a guarda de rota mandaria a pessoa para `/curador/cadastro` (porque
 * `cadastro_concluido_em` é nulo quando não há linha) e o wizard não teria o
 * que mostrar: um laço de redirecionamento com tela em branco no fim.
 */
export async function lerCadastroDoCurador(): Promise<EstadoDoCadastro | null> {
  const existente = await lerEstadoDoCadastro();
  if (existente !== null) return existente;

  const usuario = await usuarioAtual();
  if (usuario === null) return null;

  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from('perfil_curador')
    .upsert({ perfil_id: usuario.id }, { onConflict: 'perfil_id' });
  estourarSeErro(error);

  return lerEstadoDoCadastro();
}
