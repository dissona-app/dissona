import 'server-only';

/**
 * Único ponto que toca `evento_notificacao`, `preferencia_notificacao` e a
 * coluna `perfil.idioma`.
 *
 * A RLS já resolve o escopo: o catálogo é legível por qualquer autenticado, e
 * `preferencia_notificacao` tem `for all` restrito a `perfil_id = auth.uid()`.
 * Por isso as preferências **não** precisam de RPC — ao contrário do envio da
 * notificação, que é revogado até de `authenticated` e passa pela service role.
 */

import { CodigoErro, falhar } from '@/lib/erros';
import type { Papel } from '@/lib/papeis';
import { estourarSeErro } from '@/lib/supabase/erros';
import { criarClienteServidor } from '@/lib/supabase/servidor';

import type { Canal, EscolhaDeEvento, EventoDoCatalogo, Idioma } from './tipos';

const COLUNAS_EVENTO = 'chave, titulo, canais_padrao, critico, destinatario';

/**
 * O catálogo do papel e as escolhas do usuário, **crus**.
 *
 * A sobreposição de um sobre o outro é regra e mora em `servico.ts`; quem as
 * junta é `consultas.ts`. Se o repositório chamasse o serviço, teríamos um
 * ciclo — o serviço já chama o repositório para gravar.
 *
 * Duas consultas e não um join: `preferencia_notificacao` guarda só o que
 * **difere** do padrão, e um `left join` pelo PostgREST traria a mesma
 * sobreposição com uma sintaxe de embed bem menos legível. São dois `select`
 * pequenos, disparados em paralelo.
 */
export async function lerCatalogoEEscolhas(papel: Papel): Promise<{
  readonly catalogo: readonly EventoDoCatalogo[];
  readonly escolhas: readonly EscolhaDeEvento[];
}> {
  const supabase = await criarClienteServidor();

  const [catalogo, escolhas] = await Promise.all([
    supabase
      .from('evento_notificacao')
      .select(COLUNAS_EVENTO)
      .contains('destinatario', [papel])
      .order('chave'),
    supabase.from('preferencia_notificacao').select('evento, in_app, email'),
  ]);

  estourarSeErro(catalogo.error);
  estourarSeErro(escolhas.error);

  return {
    catalogo: (catalogo.data ?? []).map((linha) => ({
      chave: linha.chave,
      titulo: linha.titulo,
      critico: linha.critico,
      canaisPadrao: linha.canais_padrao as readonly Canal[],
    })),
    escolhas: (escolhas.data ?? []).map((linha) => ({
      evento: linha.evento,
      inApp: linha.in_app,
      email: linha.email,
    })),
  };
}

/**
 * Liga ou desliga um canal de um evento.
 *
 * `upsert` com `onConflict` na única `(perfil_id, evento)`: a primeira mudança
 * cria a linha, as seguintes a atualizam. Sem isso seria um `select` para
 * decidir entre insert e update — e duas chamadas concorrentes cairiam no
 * mesmo `23505`.
 *
 * O `perfil_id` vem do parâmetro e não do cliente: quem chama é o serviço, com
 * o id da sessão. A RLS recusaria outro id de qualquer forma, mas o `with
 * check` seria um erro genérico em vez de uma escrita que nunca foi tentada.
 */
export async function gravarPreferencia(
  perfilId: string,
  evento: string,
  canal: Canal,
  ligado: boolean,
): Promise<void> {
  const supabase = await criarClienteServidor();

  // O outro canal precisa ir no upsert, senão a inserção o levaria ao default
  // `true` em vez de preservar o que já valia.
  const atual = await supabase
    .from('preferencia_notificacao')
    .select('in_app, email')
    .eq('evento', evento)
    .maybeSingle();

  estourarSeErro(atual.error);

  const linha = {
    perfil_id: perfilId,
    evento,
    in_app: canal === 'in_app' ? ligado : (atual.data?.in_app ?? true),
    email: canal === 'email' ? ligado : (atual.data?.email ?? true),
  };

  const { data, error } = await supabase
    .from('preferencia_notificacao')
    .upsert(linha, { onConflict: 'perfil_id,evento' })
    .select('id');

  estourarSeErro(error);
  if ((data ?? []).length === 0) {
    falhar(CodigoErro.NAO_AUTORIZADO, { operacao: 'gravar_preferencia', evento });
  }
}

/** O idioma da interface. `perfil.idioma` tem `check (in ('pt-BR','es','en'))`. */
export async function gravarIdioma(perfilId: string, idioma: Idioma): Promise<void> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from('perfil')
    .update({ idioma })
    .eq('id', perfilId)
    .select('id');

  estourarSeErro(error);
  if ((data ?? []).length === 0) {
    falhar(CodigoErro.NAO_AUTORIZADO, { operacao: 'gravar_idioma' });
  }
}

/**
 * Se o evento é crítico, direto do catálogo.
 *
 * Lido do banco e nunca aceito do cliente: a criticidade é o que autoriza ou
 * recusa o desligamento, e um booleano vindo do formulário seria a própria
 * trava sendo pedida a quem ela restringe.
 */
export async function lerCriticidade(evento: string): Promise<boolean | null> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from('evento_notificacao')
    .select('critico')
    .eq('chave', evento)
    .maybeSingle();

  estourarSeErro(error);
  return data?.critico ?? null;
}

export async function lerIdioma(): Promise<string | null> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase.from('perfil').select('idioma').maybeSingle();

  estourarSeErro(error);
  return data?.idioma ?? null;
}
