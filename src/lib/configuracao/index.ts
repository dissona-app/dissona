import 'server-only';

/**
 * Leitura tipada da tabela `configuracao`.
 *
 * Nenhum número de negócio no código (architecture.md §1.1 e §10). Quem
 * precisa de um threshold lê daqui; quem lê daqui recebe o valor validado ou
 * um erro claro — nunca um *default* silencioso, que é como um número de
 * negócio errado vaza para produção sem ninguém notar.
 */

import { CodigoErro, falhar } from '../erros';
import { criarClienteServidor } from '../supabase/servidor';
import type { ChaveConfiguracao, ValorConfiguracao } from './chaves';
import { ESQUEMAS_CONFIGURACAO } from './chaves';

export * from './chaves';

type LinhaConfiguracao = { readonly chave: string; readonly valor: unknown };

function validar<C extends ChaveConfiguracao>(chave: C, valorBruto: unknown): ValorConfiguracao<C> {
  const resultado = ESQUEMAS_CONFIGURACAO[chave].safeParse(valorBruto);
  if (!resultado.success) {
    falhar(CodigoErro.CONFIGURACAO_INVALIDA, {
      chave,
      problema: resultado.error.issues.map((i) => i.message).join('; '),
    });
  }
  return resultado.data as ValorConfiguracao<C>;
}

/**
 * Lê e valida uma chave.
 *
 * Lança `CONFIGURACAO_AUSENTE` quando a chave não está no banco. Sem *default*
 * silencioso: um threshold ausente tem de estourar, porque um número de
 * negócio errado que passa em silêncio é como ele chega a produção.
 */
export async function lerConfiguracao<C extends ChaveConfiguracao>(
  chave: C,
): Promise<ValorConfiguracao<C>> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from('configuracao')
    .select('chave, valor')
    .eq('chave', chave)
    .maybeSingle<LinhaConfiguracao>();

  if (error !== null) throw error;

  if (data === null) falhar(CodigoErro.CONFIGURACAO_AUSENTE, { chave });

  return validar(chave, data.valor);
}

/**
 * Lê várias chaves numa única consulta.
 *
 * Uma tela de avaliação precisa de meia dúzia de thresholds; ler uma por uma
 * seria meia dúzia de idas ao banco por render.
 */
export async function lerConfiguracoes<const C extends readonly ChaveConfiguracao[]>(
  chaves: C,
): Promise<{ readonly [K in C[number]]: ValorConfiguracao<K> }> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from('configuracao')
    .select('chave, valor')
    .in('chave', chaves as unknown as string[])
    .returns<LinhaConfiguracao[]>();

  if (error !== null) throw error;

  const porChave = new Map((data ?? []).map((linha) => [linha.chave, linha.valor]));
  const ausentes = chaves.filter((chave) => !porChave.has(chave));
  if (ausentes.length > 0) {
    falhar(CodigoErro.CONFIGURACAO_AUSENTE, { chaves: ausentes.join(', ') });
  }

  const resultado: Record<string, unknown> = {};
  for (const chave of chaves) {
    resultado[chave] = validar(chave, porChave.get(chave));
  }
  return resultado as { readonly [K in C[number]]: ValorConfiguracao<K> };
}
