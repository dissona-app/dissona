'use server';

/**
 * Server Actions das preferências (7.3 / 17.3).
 *
 * "Salvo automaticamente" é o que o protótipo escreve, então cada toggle
 * dispara a sua própria ação — não há botão Salvar. Entrada por objeto, e não
 * por `FormData`: é uma chamada imperativa de um `onChange`, não a submissão
 * de um formulário.
 */

import { revalidatePath } from 'next/cache';

import { executar, falha, sucesso } from '@dissona/nucleo/lib/acoes';
import type { ResultadoDeAcao } from '@dissona/nucleo/lib/acoes';
import { CodigoErro, falhar } from '@dissona/nucleo/lib/erros';
import { ROTA } from '@dissona/nucleo/lib/guarda-rota';
import { usuarioAtual } from '@dissona/nucleo/lib/supabase/servidor';

import { esquemaAlternarCanal, esquemaIdioma } from './esquemas';
import { gravarIdioma, gravarPreferencia, lerCriticidade } from './repositorio';
import { exigirQuePossaAlternar } from './servico';
import { ehIdioma } from './tipos';

/**
 * As duas telas de Conta e o perfil do artista mostram preferências, e a
 * aba é a mesma URL nos dois ambientes. Revalidar os dois é mais barato que
 * receber o caminho do cliente e ter de validá-lo.
 */
function revalidar(): void {
  revalidatePath(ROTA.ARTISTA_CONTA);
  revalidatePath(ROTA.CURADOR_CONTA);
}

/**
 * O perfil da sessão, para a escrita.
 *
 * Vem daqui e não do cliente: a RLS recusaria outro id de qualquer forma, mas
 * pelo `with check` — um erro genérico em vez de uma escrita que nunca foi
 * tentada.
 */
async function perfilDaSessao(): Promise<string> {
  const usuario = await usuarioAtual();
  if (usuario === null) falhar(CodigoErro.NAO_AUTENTICADO);
  return usuario.id;
}

export async function alternarCanalDeEvento(entrada: unknown): Promise<ResultadoDeAcao> {
  return executar(async () => {
    const analise = esquemaAlternarCanal.safeParse(entrada);
    if (!analise.success) {
      return falha(CodigoErro.ENTRADA_INVALIDA, analise.error.issues[0]?.path[0]?.toString());
    }

    const { evento, canal, ligado } = analise.data;

    // A criticidade vem do catálogo, nunca do formulário: é ela que autoriza
    // ou recusa o desligamento, e aceitá-la do cliente seria pedir a trava a
    // quem ela restringe.
    exigirQuePossaAlternar(await lerCriticidade(evento), ligado);

    await gravarPreferencia(await perfilDaSessao(), evento, canal, ligado);

    revalidar();
    return sucesso();
  });
}

export async function definirIdiomaDaConta(entrada: unknown): Promise<ResultadoDeAcao> {
  return executar(async () => {
    const analise = esquemaIdioma.safeParse(entrada);
    if (!analise.success || !ehIdioma(analise.data.idioma)) {
      return falha(CodigoErro.ENTRADA_INVALIDA, 'idioma');
    }

    await gravarIdioma(await perfilDaSessao(), analise.data.idioma);

    revalidar();
    return sucesso();
  });
}
