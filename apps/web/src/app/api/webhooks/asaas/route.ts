import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { CodigoErro, ehErroDominio } from '@dissona/nucleo/lib/erros';
import { lerEventoAsaas, tokenConfere } from '@/modulos/claves/webhook-asaas';
import {
  confirmarPedido,
  recusarPedido,
  registrarEvento,
} from '@/modulos/claves/repositorio-de-pedido';

/** O nome em `evento_provedor.provedor`. */
const PROVEDOR = 'asaas';

/**
 * Webhook do Asaas — confirma ou recusa o pedido de Claves.
 *
 * ## A ordem
 *
 *  1. **Token.** `asaas-access-token` tem de bater com `ASAAS_WEBHOOK_TOKEN`,
 *     antes de ler o corpo. Sem isto, quem descobrisse a URL creditaria Claves
 *     em qualquer carteira.
 *  2. **Registro do evento** (`registrar_evento_provedor`), com a carga como
 *     veio — é o que permite conciliar depois.
 *  3. **Confirmar ou recusar.** Mesmo quando o evento é repetido: as duas RPCs
 *     são idempotentes pelo estado do pedido, e pular a chamada na repetição
 *     deixaria sem crédito o pedido cujo primeiro processamento falhou depois
 *     do registro. "Credita uma única vez" é garantido pelo banco, não por
 *     este `if`.
 *
 * ## As respostas
 *
 * 2xx para tudo que foi entendido, inclusive evento que não nos interessa: o
 * Asaas reenvia o que não recebe 2xx e, depois de 15 falhas, **pausa a fila
 * inteira** do webhook. 401 para token errado e 400 para carga ilegível — os
 * dois são erro de quem chama, e reenviar não os conserta. 500 só quando algo
 * nosso falhou, que é exatamente o caso em que o reenvio ajuda.
 *
 * **Pedido inexistente é 200**, e não 500: a conta do Asaas recebe cobranças
 * que não nasceram deste checkout (testes, cobranças manuais), e o
 * `externalReference` delas pode ter forma de UUID sem ser pedido nosso.
 * Reenviar nunca o fará existir — e cada 500 conta para a pausa da fila, que
 * atrasaria os pagamentos de verdade. Achado em produção em 2026-09-16.
 */
export async function POST(requisicao: NextRequest) {
  if (
    !tokenConfere(requisicao.headers.get('asaas-access-token'), process.env.ASAAS_WEBHOOK_TOKEN)
  ) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let carga: unknown;
  try {
    carga = await requisicao.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const evento = lerEventoAsaas(carga);
  if (evento === null) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    await registrarEvento(evento.idEvento, PROVEDOR, evento.tipo, carga as Record<string, unknown>);

    if (evento.pedidoId !== null) {
      if (evento.desfecho === 'aprovado') await confirmarPedido(evento.pedidoId);
      if (evento.desfecho === 'recusado') await recusarPedido(evento.pedidoId);
    }
  } catch (erro) {
    if (ehErroDominio(erro) && erro.codigo === CodigoErro.NAO_ENCONTRADO) {
      return NextResponse.json({ ok: true, ignorado: 'pedido_inexistente' });
    }
    console.error('[webhook asaas] falha ao processar', evento.idEvento, erro);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
