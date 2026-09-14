import 'server-only';

/**
 * Leitura da fila (13) e a única escrita que o curador faz em `envio`.
 *
 * A fila vem da view `fila_do_curador` (`0006d`), que já se restringe ao
 * curador da sessão pelo próprio `where` — ver o cabeçalho da migration.
 */

import { paraClaves } from '@/lib/claves';
import { CodigoErro, falhar } from '@/lib/erros';
import { estourarSeErro } from '@/lib/supabase/erros';
import { criarClienteServidor } from '@/lib/supabase/servidor';

import type { ItemDaFila, ServicoContratado, SituacaoEnvio } from './tipos';

/**
 * Uma linha de `fila_do_curador`, escrita à mão.
 *
 * A view não está em `tipos-bd.ts` porque regenerá-lo exige
 * `SUPABASE_ACCESS_TOKEN`, ausente no ambiente. Some daqui — e o cast abaixo
 * também — assim que alguém rodar `pnpm db:tipos` autenticado.
 */
type LinhaDaFila = {
  readonly envio_id: string;
  readonly faixa_id: string;
  readonly titulo: string;
  readonly artista: string;
  readonly genero: string | null;
  readonly situacao: SituacaoEnvio;
  readonly prazo_em: string;
  readonly devolucao_em: string;
  readonly enviado_em: string;
  readonly total_claves: number;
  readonly duracao_segundos: number | null;
  readonly contexto_curador: string | null;
  readonly arquivo_caminho: string | null;
};

const COLUNAS =
  'envio_id, faixa_id, titulo, artista, genero, situacao, prazo_em, devolucao_em, enviado_em, total_claves, duracao_segundos, contexto_curador, arquivo_caminho';

function paraDominio(linha: LinhaDaFila): ItemDaFila {
  return {
    envioId: linha.envio_id,
    faixaId: linha.faixa_id,
    titulo: linha.titulo,
    artista: linha.artista,
    genero: linha.genero,
    situacao: linha.situacao,
    prazoEm: new Date(linha.prazo_em),
    devolucaoEm: new Date(linha.devolucao_em),
    enviadoEm: new Date(linha.enviado_em),
    totalClaves: paraClaves(linha.total_claves.toFixed(2)),
    duracaoSegundos: linha.duracao_segundos,
    contextoCurador: linha.contexto_curador,
    arquivoCaminho: linha.arquivo_caminho,
  };
}

type RespostaDaFila = { readonly data: LinhaDaFila[] | null; readonly error: unknown };

/**
 * Acesso à view enquanto ela não está nos tipos gerados.
 *
 * `PromiseLike` e não `Promise`: o construtor de consulta do Supabase é
 * *thenable* — dá para `await` direto ou encadear `.eq()` antes. Tipá-lo como
 * `Promise` faria o `.eq()` sumir; tipá-lo só com `.eq()` faria o `await`
 * sumir.
 */
type ConsultaDaFila = PromiseLike<RespostaDaFila> & {
  eq(coluna: string, valor: string): PromiseLike<RespostaDaFila>;
};

function viewDaFila(supabase: Awaited<ReturnType<typeof criarClienteServidor>>) {
  return supabase as unknown as {
    from(view: string): { select(colunas: string): ConsultaDaFila };
  };
}

export async function listarFila(): Promise<readonly ItemDaFila[]> {
  const supabase = await criarClienteServidor();

  const { data, error } = await viewDaFila(supabase).from('fila_do_curador').select(COLUNAS);

  estourarSeErro(error);
  return (data ?? []).map(paraDominio);
}

/** Um item da fila. `null` quando não é do curador da sessão — a view o esconde. */
export async function buscarItem(envioId: string): Promise<ItemDaFila | null> {
  const supabase = await criarClienteServidor();

  const { data, error } = await viewDaFila(supabase)
    .from('fila_do_curador')
    .select(COLUNAS)
    .eq('envio_id', envioId);

  estourarSeErro(error);
  const linha = (data ?? [])[0];
  return linha === undefined ? null : paraDominio(linha);
}

/** Os serviços contratados naquele envio, com o preço **congelado**. */
export async function servicosDoEnvio(envioId: string): Promise<readonly ServicoContratado[]> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from('servico_envio')
    .select('tipo, preco_claves')
    .eq('envio_id', envioId);

  estourarSeErro(error);

  return (data ?? []).map((linha) => ({
    tipo: linha.tipo,
    precoClaves: paraClaves(linha.preco_claves.toFixed(2)),
  }));
}

/**
 * "Iniciar avaliação" — move o envio para `avaliando`.
 *
 * É uma das **três** transições que o cliente pode escrever
 * (`recebeu → ouviu → avaliando`); `pronto` e `devolvido` são reservadas às
 * RPCs pelo trigger `envio_estado_terminal_so_por_rpc`.
 *
 * ## `avaliando` está na lista, e não é redundância
 *
 * O botão é a porta da avaliação, e ela também é a porta da **retomada**: quem
 * usou "Salvar e sair" volta pela fila e clica no mesmo botão. Sem `avaliando`
 * aqui, a segunda entrada afetaria zero linhas e a tela diria "esta faixa não
 * está mais disponível" para um envio que está, sim, na fila da pessoa — e a
 * avaliação em rascunho ficaria inalcançável por esse caminho.
 *
 * `iniciou_em` é gravado só na primeira vez, por `coalesce`: ele marca quando a
 * escuta começou, e reescrevê-lo a cada retomada apagaria essa medida.
 *
 * O `.select('id')` confere que a linha foi alcançada: a policy de update de
 * `envio` exige `perfil_curador_id = meu_perfil_curador_id()`, e fora dela o
 * update afeta zero linhas **sem erro**.
 */
export async function iniciarAvaliacao(envioId: string): Promise<void> {
  const supabase = await criarClienteServidor();

  const { data: atual, error: erroDaLeitura } = await supabase
    .from('envio')
    .select('iniciou_em')
    .eq('id', envioId)
    .maybeSingle();
  estourarSeErro(erroDaLeitura);

  const { data, error } = await supabase
    .from('envio')
    .update({
      situacao: 'avaliando',
      iniciou_em: atual?.iniciou_em ?? new Date().toISOString(),
    })
    .eq('id', envioId)
    .in('situacao', ['recebeu', 'ouviu', 'avaliando'])
    .select('id');

  estourarSeErro(error);

  // Zero linhas aqui tem duas causas indistinguíveis: não é seu, ou já saiu da
  // fila — `pronto` pela conclusão, `devolvido` pelo job de 7 dias. As duas
  // levam de volta à fila.
  if ((data ?? []).length === 0) {
    falhar(CodigoErro.ENVIO_SITUACAO_INVALIDA, { envioId });
  }
}
