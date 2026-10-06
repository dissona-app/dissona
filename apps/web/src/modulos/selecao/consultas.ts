import 'server-only';

/** Leituras da seleção e do status do envio (3.3). */

import { estourarSeErro } from '@dissona/nucleo/lib/supabase/erros';
import { criarClienteServidor } from '@dissona/nucleo/lib/supabase/servidor';
import type { Database } from '@dissona/nucleo/lib/supabase/tipos-bd';

import { nomesDeCuradores } from './repositorio';

export type SituacaoEnvio = Database['public']['Enums']['situacao_envio'];

export type EnvioDaFaixa = {
  readonly id: string;
  readonly curador: string;
  readonly situacao: SituacaoEnvio;
  readonly prazoEm: Date;
};

/**
 * Os envios de uma faixa, para a tela 3.3.
 *
 * ⚠️ **Duas consultas, e não um embed.** O nome do curador mora em `perfil`,
 * cuja policy é `id = auth.uid() or e_admin()` — um
 * `perfil_curador!inner(perfil!inner(...))` aqui devolvia zero linha para o
 * artista, **sem erro**, e a tela caía no estado vazio como se a faixa não
 * tivesse sido enviada a ninguém. O nome vem de `curador_publico` (`0002f`).
 *
 * A RLS de `envio` já permite ao dono da faixa ver (`sou_dono_da_faixa`), então
 * não há filtro por artista aqui — a policy o aplica.
 */
export async function lerEnviosDaFaixa(faixaId: string): Promise<readonly EnvioDaFaixa[]> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from('envio')
    .select('id, situacao, prazo_em, perfil_curador_id')
    .eq('faixa_id', faixaId)
    .order('criado_em', { ascending: true });

  estourarSeErro(error);

  const envios = data ?? [];
  if (envios.length === 0) return [];

  const nomes = await nomesDeCuradores(envios.map((envio) => envio.perfil_curador_id));

  return envios.map((envio) => ({
    id: envio.id,
    // Curador que saiu de `bronze_aprovado`/`prata_aprovado` some da view. O
    // envio dele continua existindo, e a tabela não pode perder a linha por
    // isso — daí o fallback.
    curador: nomes.get(envio.perfil_curador_id) ?? '—',
    situacao: envio.situacao,
    prazoEm: new Date(envio.prazo_em),
  }));
}
