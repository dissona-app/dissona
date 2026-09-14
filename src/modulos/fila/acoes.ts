'use server';

/** Server Action da fila (13.1). */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { executar, sucesso } from '@/lib/acoes';
import type { ResultadoDeAcao } from '@/lib/acoes';
import { ROTA } from '@/lib/guarda-rota';

import { iniciarAvaliacao } from './repositorio';

/**
 * "Iniciar avaliação" (13.1) — move o envio para `avaliando` e abre a
 * avaliação.
 *
 * A transição é uma das três que o cliente pode fazer; `pronto` e `devolvido`
 * são das RPCs, por trigger.
 */
export async function iniciarAvaliacaoDoEnvio(dados: FormData): Promise<ResultadoDeAcao> {
  const envioId = dados.get('envioId');
  if (typeof envioId !== 'string' || envioId === '') {
    redirect(ROTA.CURADOR_FILA);
  }

  const resultado = await executar(async () => {
    await iniciarAvaliacao(envioId);
    return sucesso(undefined);
  });

  if (!resultado.ok) return resultado;

  revalidatePath(ROTA.CURADOR_FILA);
  redirect(`${ROTA.CURADOR_AVALIAR}/${envioId}`);
}
