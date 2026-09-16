'use server';

/**
 * Server Actions da tela 5.2 — a compra de Claves.
 *
 * ## A ordem, que não é arbitrária
 *
 *  1. valida a entrada;
 *  2. cria o pedido (`criar_pedido_clave`), com os valores congelados do
 *     pacote pelo banco;
 *  3. cobra no provedor;
 *  4. grava a cobrança no pedido (Asaas) e, conforme o desfecho, confirma,
 *     recusa ou deixa aguardando o Pix.
 *
 * Pedido **antes** da cobrança: uma cobrança sem pedido é dinheiro que entrou
 * sem linha para conciliar. Na ordem inversa, uma falha entre a cobrança e a
 * gravação deixaria o artista pago e sem Claves.
 *
 * Nenhum crédito é escrito aqui: quem escreve no ledger é
 * `confirmar_pedido_clave`, numa transação, e ela é idempotente pelo estado do
 * pedido — é o que deixa a ação (cartão) e o webhook (evento do mesmo
 * pagamento) confirmarem o mesmo pedido sem creditar duas vezes.
 *
 * ## Dados do cartão
 *
 * Passam por esta ação a caminho do Asaas e não vão a lugar nenhum além dele:
 * não são gravados, não entram na carga de `evento_provedor` e não voltam na
 * resposta. Ver `esquemas.ts`.
 */

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

import { executar, falha, falhaDeCampos, sucesso } from '@/lib/acoes';
import type { ResultadoDeAcao } from '@/lib/acoes';
import * as claves from '@/lib/claves';
import { CodigoErro } from '@/lib/erros';
import { ROTA } from '@/lib/guarda-rota';
import { usuarioAtual } from '@/lib/supabase/servidor';
import { buscarPacote } from '@/modulos/pacote/consultas';

import { esquemaDeCompra } from './esquemas';
import { provedorEmVigor } from './pagamento';
import { lerSaldo } from './repositorio';
import {
  confirmarPedido,
  criarPedido,
  lerNomeDaConta,
  lerPedido,
  recusarPedido,
  registrarCobranca,
  registrarEvento,
} from './repositorio-de-pedido';
import type { AcompanhamentoDoPix, DesfechoDaCompra } from './tipos';

function motivosPorCampo(
  issues: readonly { readonly path: readonly PropertyKey[]; readonly message: string }[],
): Record<string, string> {
  const motivos: Record<string, string> = {};
  for (const issue of issues) {
    const campo = issue.path[0];
    if (typeof campo !== 'string' || campo in motivos) continue;
    motivos[campo] = issue.message;
  }
  return motivos;
}

/** O primeiro IP de `x-forwarded-for` — o Asaas o usa na análise antifraude. */
async function ipRemoto(): Promise<string | null> {
  const encaminhado = (await headers()).get('x-forwarded-for');
  const primeiro = encaminhado?.split(',')[0]?.trim();
  return primeiro === undefined || primeiro === '' ? null : primeiro;
}

async function clavesESaldo(pacoteId: string | null, quantidade: number) {
  const [pacote, saldo] = await Promise.all([
    pacoteId === null ? Promise.resolve(null) : buscarPacote(pacoteId),
    lerSaldo(),
  ]);
  return {
    claves: claves.formatar(
      pacote === null ? claves.deClavesInteiras(quantidade) : pacote.quantidade,
    ),
    saldo: claves.formatar(saldo === null ? 0n : saldo.disponivel),
  };
}

export async function comprarClaves(entrada: unknown): Promise<ResultadoDeAcao<DesfechoDaCompra>> {
  return executar(async () => {
    const analise = esquemaDeCompra.safeParse(entrada);
    if (!analise.success) {
      // Só os códigos: a issue do Zod carrega o valor recebido, e aqui ele
      // pode ser um número de cartão.
      return falhaDeCampos(CodigoErro.ENTRADA_INVALIDA, motivosPorCampo(analise.error.issues));
    }
    const compra = analise.data;

    const usuario = await usuarioAtual();
    if (usuario === null) return falha(CodigoErro.NAO_AUTENTICADO);

    // Antes do pedido: sem provedor não há cobrança possível, e criar a linha
    // só para deixá-la pendente sujaria a conciliação com um erro nosso.
    const provedor = provedorEmVigor();
    const pedidoId = await criarPedido(compra.pacoteId, compra.meio);
    const pedido = await lerPedido(pedidoId);
    if (pedido === null) return falha(CodigoErro.NAO_ENCONTRADO);

    const nome = (await lerNomeDaConta(usuario.id)) ?? usuario.email ?? 'Artista Dissona';

    const resposta = await provedor.cobrar({
      pedidoId,
      meio: compra.meio,
      valorCentavos: pedido.valorTotalCentavos,
      descricao: `Dissona · ${pedido.quantidadeClaves} Claves`,
      comprador: { perfilId: usuario.id, nome, email: usuario.email ?? '', cpf: compra.cpf },
      cartao:
        compra.meio === 'cartao'
          ? {
              titular: compra.titular,
              numero: compra.numero,
              mes: compra.validade.mes,
              ano: compra.validade.ano,
              cvv: compra.cvv,
              telefone: compra.telefone,
              cep: compra.cep,
            }
          : undefined,
      ipRemoto: await ipRemoto(),
      desfechoDesejado: compra.simulacao,
    });

    if (resposta.desfecho === 'pendente') {
      await registrarCobranca(pedidoId, {
        provedor: resposta.provedor,
        cobrancaId: resposta.cobrancaId,
        pixPayload: resposta.pixPayload,
        pixQr: resposta.pixQr,
      });
      return sucesso<DesfechoDaCompra>({
        situacao: 'aguardando_pix',
        pedidoId,
        pixPayload: resposta.pixPayload,
        pixQr: resposta.pixQr,
      });
    }

    if (resposta.cobrancaId !== null) {
      await registrarCobranca(pedidoId, {
        provedor: resposta.provedor,
        cobrancaId: resposta.cobrancaId,
      });
    }

    // A carga não leva nada do cartão — só o que concilia.
    await registrarEvento(resposta.idEvento, resposta.provedor, resposta.tipo, {
      pedido_id: pedidoId,
      meio: compra.meio,
      desfecho: resposta.desfecho,
      cobranca_id: resposta.cobrancaId,
    });

    if (resposta.desfecho === 'recusado') {
      await recusarPedido(pedidoId);
      revalidar();
      return falha(CodigoErro.PAGAMENTO_RECUSADO, undefined, { pedidoId });
    }

    await confirmarPedido(pedidoId);
    revalidar();

    return sucesso<DesfechoDaCompra>({
      situacao: 'aprovado',
      pedidoId,
      ...(await clavesESaldo(compra.pacoteId, pedido.quantidadeClaves)),
    });
  });
}

/**
 * A tela do Pix pergunta de tempos em tempos: o pedido já foi pago?
 *
 * Lê como o artista — a policy só mostra o próprio pedido, então um id alheio
 * volta como "aguardando" para sempre, sem revelar nada.
 */
export async function acompanharPix(
  pedidoId: string,
): Promise<ResultadoDeAcao<AcompanhamentoDoPix>> {
  return executar(async () => {
    const pedido = await lerPedido(pedidoId);
    if (pedido === null || pedido.situacao === 'criado' || pedido.situacao === 'processando') {
      return sucesso<AcompanhamentoDoPix>({ situacao: 'aguardando' });
    }
    if (pedido.situacao !== 'aprovado') {
      return sucesso<AcompanhamentoDoPix>({ situacao: 'recusado' });
    }
    revalidar();
    return sucesso<AcompanhamentoDoPix>({
      situacao: 'aprovado',
      ...(await clavesESaldo(null, pedido.quantidadeClaves)),
    });
  });
}

/** Carteira, extrato e a própria vitrine. */
function revalidar(): void {
  revalidatePath(ROTA.ARTISTA_CARTEIRA);
  revalidatePath(ROTA.ARTISTA_EXTRATO);
  revalidatePath(ROTA.ARTISTA_PACOTES);
}
