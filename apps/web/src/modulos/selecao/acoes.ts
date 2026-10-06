'use server';

/** Server Action do placeholder de seleção (módulo 4 é da R3). */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { executar, falha, sucesso } from '@/lib/acoes';
import type { ResultadoDeAcao } from '@/lib/acoes';
import { CodigoErro } from '@/lib/erros';
import { ROTA } from '@/lib/guarda-rota';

import { confirmarSelecao } from './repositorio';
import { comServicoObrigatorio } from './servico';
import type { TipoServico } from './tipos';

const SERVICOS_VALIDOS: readonly TipoServico[] = [
  'feedback',
  'playlist',
  'post',
  'materia',
  'outro',
];

/**
 * Confirma a seleção e leva à confirmação do envio.
 *
 * As Claves saem **aqui**, e não no passo 3 do wizard — é o que o aviso da
 * revisão promete ("as Claves só saem quando você confirma a seleção").
 *
 * O formulário manda uma entrada `curador` por curador marcado e, para cada um,
 * entradas `servico:<id>` com os opcionais. `feedback` é acrescentado pelo
 * serviço, como a própria RPC faz.
 */
export async function confirmarSelecaoDeCuradores(dados: FormData): Promise<ResultadoDeAcao> {
  const faixaId = dados.get('faixaId');
  if (typeof faixaId !== 'string' || faixaId === '') {
    return falha(CodigoErro.ENTRADA_INVALIDA, 'faixaId');
  }

  const resultado = await executar(async () => {
    const marcados = dados
      .getAll('curador')
      .filter((valor): valor is string => typeof valor === 'string');

    if (marcados.length === 0) {
      return falha(CodigoErro.CURADOR_INVALIDO, 'curador', { motivo: 'selecao_vazia' });
    }

    const escolhas = marcados.map((perfilCuradorId) => {
      const opcionais = dados
        .getAll(`servico:${perfilCuradorId}`)
        .filter((valor): valor is string => typeof valor === 'string')
        .filter((valor): valor is TipoServico =>
          (SERVICOS_VALIDOS as readonly string[]).includes(valor),
        );

      return { perfilCuradorId, servicos: comServicoObrigatorio(opcionais) };
    });

    await confirmarSelecao(faixaId, escolhas);
    return sucesso(undefined);
  });

  if (!resultado.ok) return resultado;

  // O saldo e o extrato mudaram — o consumo foi lançado dentro da RPC.
  revalidatePath(ROTA.ARTISTA_CARTEIRA);
  revalidatePath(ROTA.ARTISTA_EXTRATO);
  redirect(`${ROTA.ARTISTA_ENVIAR}/${faixaId}/confirmacao`);
}
