'use server';

/**
 * Server Action da tela 5.2 — a compra de Claves.
 *
 * ## A ordem, que não é arbitrária
 *
 *  1. valida a entrada;
 *  2. cria o pedido (`criar_pedido_clave`), com os valores congelados do
 *     pacote pelo banco;
 *  3. cobra no provedor;
 *  4. registra o evento e, se aprovado, confirma — que é o que credita.
 *
 * Pedido **antes** da cobrança, e não depois: uma cobrança sem pedido é
 * dinheiro que entrou sem linha para conciliar, e é o único dos dois erros que
 * não se conserta pela interface. Na ordem inversa, uma falha entre a cobrança
 * e a gravação deixaria o artista pago e sem Claves.
 *
 * Nenhum crédito acontece aqui: quem escreve no ledger é
 * `confirmar_pedido_clave`, numa transação, e este arquivo não tem nem o
 * cliente para fazer diferente.
 *
 * ## A idempotência
 *
 * `registrarEvento` vem antes de `confirmarPedido` mesmo no caminho simulado.
 * É redundante aqui — o simulador gera um id de evento novo a cada chamada —,
 * e é assim de propósito: é o caminho que o webhook do Asaas vai percorrer, e
 * um caminho que só o webhook exercita é um caminho que ninguém testa. O gate
 * da R2 pede "compra credita uma única vez sob webhook duplicado", e o que
 * garante isso é este `if`, mais o índice único de uma compra por pedido.
 */

import { revalidatePath } from 'next/cache';

import { executar, falha, sucesso } from '@/lib/acoes';
import type { ResultadoDeAcao } from '@/lib/acoes';
import * as claves from '@/lib/claves';
import { CodigoErro } from '@/lib/erros';
import { ROTA } from '@/lib/guarda-rota';
import { buscarPacote } from '@/modulos/pacote/consultas';

import { esquemaDeCompra } from './esquemas';
import { provedorEmVigor } from './pagamento';
import { lerSaldo } from './repositorio';
import {
  confirmarPedido,
  criarPedido,
  recusarPedido,
  registrarEvento,
} from './repositorio-de-pedido';
import type { DesfechoDaCompra } from './tipos';

export async function comprarClaves(entrada: unknown): Promise<ResultadoDeAcao<DesfechoDaCompra>> {
  return executar(async () => {
    const analise = esquemaDeCompra.safeParse(entrada);
    if (!analise.success) return falha(CodigoErro.ENTRADA_INVALIDA);

    const { pacoteId, meio, simulacao } = analise.data;

    // `provedorEmVigor` antes do pedido: sem provedor não há cobrança
    // possível, e criar a linha só para deixá-la pendente para sempre seria
    // sujar a fila de conciliação com um erro nosso de configuração.
    const provedor = provedorEmVigor();
    const pedidoId = await criarPedido(pacoteId, meio);

    const resposta = await provedor.cobrar({ pedidoId, meio, desfechoDesejado: simulacao });

    const eventoNovo = await registrarEvento(resposta.idEvento, resposta.provedor, resposta.tipo, {
      pedido_id: pedidoId,
      meio,
      aprovado: resposta.aprovado,
    });

    if (!resposta.aprovado) {
      await recusarPedido(pedidoId);
      revalidar();
      return falha(CodigoErro.PAGAMENTO_RECUSADO, undefined, { pedidoId });
    }

    // Entrega repetida do mesmo evento: a RPC devolveria `null` de qualquer
    // forma, e não chamá-la é a diferença entre "idempotente por sorte" e
    // "idempotente por desenho".
    if (eventoNovo) await confirmarPedido(pedidoId);

    revalidar();

    // O "… Claves entraram na sua carteira. Novo saldo: … Claves" do
    // protótipo. As duas leituras são **depois** do crédito, e o saldo vem da
    // view — somar a quantidade ao saldo anterior daria um número calculado
    // aqui, e a view é a única fonte de saldo do produto.
    const [pacote, saldo] = await Promise.all([buscarPacote(pacoteId), lerSaldo()]);

    return sucesso({
      pedidoId,
      claves: claves.formatar(pacote === null ? 0n : pacote.quantidade),
      saldo: claves.formatar(saldo === null ? 0n : saldo.disponivel),
    });
  });
}

/**
 * Carteira, extrato e a própria vitrine.
 *
 * O extrato entra na lista porque "Ver no extrato" é um dos dois botões do
 * estado aprovado — chegar lá e não encontrar a compra que acabou de aparecer
 * na tela seria o cache contando outra história.
 */
function revalidar(): void {
  revalidatePath(ROTA.ARTISTA_CARTEIRA);
  revalidatePath(ROTA.ARTISTA_EXTRATO);
  revalidatePath(ROTA.ARTISTA_PACOTES);
}
