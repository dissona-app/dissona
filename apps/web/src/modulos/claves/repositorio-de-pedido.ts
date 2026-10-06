import 'server-only';

/**
 * Único ponto que toca `pedido_clave` e `evento_provedor`.
 *
 * Separado de `repositorio.ts` porque aquele arquivo promete, no cabeçalho,
 * **nenhuma escrita** — o ledger é append-only e a aplicação só lê. Este aqui
 * escreve, e escreve por dois clientes diferentes, que é a razão de ele
 * existir como arquivo próprio em vez de mais três funções lá.
 *
 * ## Os dois clientes, e por que são dois
 *
 * `pedido_clave` tem policy de **select** para o dono e nenhuma de insert ou
 * update — de propósito: deixar o artista escrever situação permitiria cunhar
 * um pedido já aprovado. Então:
 *
 *  - **Criar** o pedido passa por `criar_pedido_clave`, que é `security
 *    definer` com grant para `authenticated` e lê `meu_perfil_artista_id()` no
 *    corpo. É a sessão do artista que chama, e é ela que prova de quem é o
 *    pedido — a service role aqui seria pior, porque perderia essa prova.
 *
 *  - **Confirmar** e **recusar** passam por RPCs revogadas até de
 *    `authenticated` (`0007` e `0007d`). Quem as chama, no desenho da `0007`, é
 *    o webhook do provedor, pela service role. O checkout simulado da R2 usa o
 *    **mesmo** caminho: quando o webhook do Asaas existir, ele chama estas
 *    mesmas funções e nada aqui muda.
 *
 * `registrar_evento_provedor` é a primeira das duas, sempre, e é ela que
 * carrega a idempotência: `evento_provedor` não tem policy nenhuma, a chave
 * primária é o id do evento, e um `false` de volta significa entrega repetida.
 */

import { criarClienteServidor } from '@dissona/nucleo/lib/supabase/servidor';
import { criarClienteDeServico } from '@dissona/nucleo/lib/supabase/servico';
import { estourarSeErro } from '@dissona/nucleo/lib/supabase/erros';

import type { Database } from '@dissona/nucleo/lib/supabase/tipos-bd';

import type { MeioPagamento } from './tipos';

/**
 * Cria o pedido com os valores congelados do pacote.
 *
 * Chamada **como o artista**. A RPC recusa com `DS020` quem não tem perfil de
 * artista e com `DS024` o pacote inexistente ou inativo — os dois viram
 * `CodigoErro` em `estourarSeErro`, e é por isso que não há checagem
 * duplicada aqui.
 */
export async function criarPedido(pacoteId: string, meio: MeioPagamento): Promise<string> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase.rpc('criar_pedido_clave', {
    p_pacote_clave_id: pacoteId,
    p_meio: meio,
  });

  estourarSeErro(error);
  return data as string;
}

/**
 * Registra o evento do provedor. `true` = evento novo; `false` = entrega
 * repetida, e o chamador não deve creditar de novo.
 *
 * A carga é gravada como veio, em `jsonb`, porque é o que permite conciliar
 * depois o que o provedor disse com o que nós fizemos.
 */
export async function registrarEvento(
  idEvento: string,
  provedor: string,
  tipo: string,
  carga: Readonly<Record<string, unknown>>,
): Promise<boolean> {
  const servico = criarClienteDeServico();

  const { data, error } = await servico.rpc('registrar_evento_provedor', {
    p_id_evento: idEvento,
    p_provedor: provedor,
    p_tipo: tipo,
    p_carga: carga as never,
  });

  estourarSeErro(error);
  return data === true;
}

/**
 * Aprova o pedido e credita o ledger, numa transação.
 *
 * Devolve o id do lançamento, ou `null` quando o pedido já estava aprovado —
 * que é a resposta da própria RPC a uma entrega repetida, e não um erro.
 */
export async function confirmarPedido(pedidoId: string): Promise<number | null> {
  const servico = criarClienteDeServico();

  const { data, error } = await servico.rpc('confirmar_pedido_clave', {
    p_pedido_id: pedidoId,
  });

  estourarSeErro(error);
  return data ?? null;
}

/** Marca o pedido como recusado. `false` quando ele já estava aprovado. */
export async function recusarPedido(pedidoId: string): Promise<boolean> {
  const servico = criarClienteDeServico();

  const { data, error } = await servico.rpc('recusar_pedido_clave', {
    p_pedido_id: pedidoId,
  });

  estourarSeErro(error);
  return data === true;
}

export type PedidoDoArtista = {
  readonly id: string;
  readonly situacao: Database['public']['Enums']['situacao_pedido'];
  readonly quantidadeClaves: number;
  readonly valorTotalCentavos: bigint;
};

/**
 * Lê o pedido **como o artista**: a policy de `pedido_clave` só mostra o
 * próprio. `null` é pedido de outra pessoa ou inexistente — indistinguíveis de
 * propósito.
 */
export async function lerPedido(pedidoId: string): Promise<PedidoDoArtista | null> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from('pedido_clave')
    .select('id, situacao, quantidade_claves, valor_total_centavos')
    .eq('id', pedidoId)
    .maybeSingle();

  estourarSeErro(error);
  if (data === null) return null;
  return {
    id: data.id,
    situacao: data.situacao,
    quantidadeClaves: Number(data.quantidade_claves),
    valorTotalCentavos: BigInt(data.valor_total_centavos),
  };
}

/**
 * Grava a cobrança do Asaas no pedido: o id (é por ele que se concilia) e, no
 * Pix, o copia e cola e o QR — para a tela poder mostrá-los de novo.
 *
 * Pela service role: `pedido_clave` não tem policy de update, de propósito
 * (ver o cabeçalho). O filtro por id é a única coisa entre esta escrita e a
 * linha errada, e o `select` confere que ela alcançou uma linha.
 */
export async function registrarCobranca(
  pedidoId: string,
  cobranca: {
    readonly provedor: string;
    readonly cobrancaId: string;
    readonly pixPayload?: string;
    readonly pixQr?: string;
  },
): Promise<void> {
  const servico = criarClienteDeServico();

  const patch: Database['public']['Tables']['pedido_clave']['Update'] = {
    provedor: cobranca.provedor,
    provedor_cobranca_id: cobranca.cobrancaId,
    ...(cobranca.pixPayload === undefined
      ? {}
      : {
          pix_payload: cobranca.pixPayload,
          pix_qr: cobranca.pixQr ?? null,
          situacao: 'processando',
        }),
  };

  const { data, error } = await servico
    .from('pedido_clave')
    .update(patch)
    .eq('id', pedidoId)
    .select('id');

  estourarSeErro(error);
  if ((data ?? []).length === 0) {
    throw new Error(`pedido ${pedidoId} nao encontrado ao registrar a cobranca`);
  }
}

/** O nome da conta da sessão, para o cadastro do cliente no Asaas. */
export async function lerNomeDaConta(perfilId: string): Promise<string | null> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from('perfil')
    .select('nome_completo')
    .eq('id', perfilId)
    .maybeSingle();
  estourarSeErro(error);
  return data?.nome_completo ?? null;
}
