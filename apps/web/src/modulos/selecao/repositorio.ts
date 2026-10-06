import 'server-only';

/**
 * Leitura dos curadores disponíveis e a chamada de
 * `confirmar_selecao_curadores`.
 *
 * A RPC é `security definer` e atômica (architecture.md §4.1): debita Claves,
 * cria `envio` e `servico_envio`, agenda o prazo e notifica. Nada disso pode
 * ser feito por `insert` do cliente — `envio` não tem policy de insert, e o
 * ledger é append-only.
 */

import { paraClaves } from '@dissona/nucleo/lib/claves';
import { estourarSeErro } from '@dissona/nucleo/lib/supabase/erros';
import { criarClienteServidor } from '@dissona/nucleo/lib/supabase/servidor';

import type { CuradorDisponivel, EscolhaDeCurador } from './tipos';

/**
 * Uma linha de `curador_publico` (migration `0002f`).
 *
 * Escrita à mão **aqui**, e não em `tipos-bd.ts`, que é gerado e nunca se
 * edita. A view não está no arquivo gerado porque regenerá-lo exige
 * `SUPABASE_ACCESS_TOKEN`, que não está no ambiente — assim que alguém rodar
 * `pnpm db:tipos` com um token, este tipo e o cast abaixo saem daqui.
 */
type LinhaPublica = {
  readonly perfil_curador_id: string;
  readonly classe: CuradorDisponivel['classe'];
  readonly nome: string;
};

/**
 * Os curadores que podem receber envio.
 *
 * ⚠️ O nome vem de `curador_publico`, e não de um embed em `perfil`. A policy
 * de `perfil` é `id = auth.uid() or e_admin()`: o artista **não** enxerga a
 * linha de ninguém além da própria, e um `perfil!inner(...)` aqui devolvia
 * lista vazia **sem erro nenhum**. Ver o cabeçalho da `0002f`.
 *
 * `servico_curador` não tem esse problema — a policy dele já libera os ativos
 * para qualquer autenticado.
 *
 * A view já filtra por `bronze_aprovado`/`prata_aprovado`, que é o mesmo
 * recorte que a RPC exige. Listar quem ela recusaria seria oferecer uma escolha
 * que falha só na confirmação, depois do carrinho montado.
 */
export async function listarDisponiveis(): Promise<readonly CuradorDisponivel[]> {
  const supabase = await criarClienteServidor();

  const publico = await (
    supabase as unknown as {
      from(view: string): {
        select(colunas: string): Promise<{ data: LinhaPublica[] | null; error: unknown }>;
      };
    }
  )
    .from('curador_publico')
    .select('perfil_curador_id, classe, nome');

  estourarSeErro(publico.error);
  const curadores = publico.data ?? [];
  if (curadores.length === 0) return [];

  const { data: servicos, error: erroDosServicos } = await supabase
    .from('servico_curador')
    .select('perfil_curador_id, tipo, descricao, preco_claves')
    .eq('ativo', true)
    .in(
      'perfil_curador_id',
      curadores.map((curador) => curador.perfil_curador_id),
    );

  estourarSeErro(erroDosServicos);

  return curadores.map((curador) => ({
    perfilCuradorId: curador.perfil_curador_id,
    nome: curador.nome,
    classe: curador.classe,
    servicos: (servicos ?? [])
      .filter((servico) => servico.perfil_curador_id === curador.perfil_curador_id)
      .map((servico) => ({
        tipo: servico.tipo,
        descricao: servico.descricao,
        precoClaves: paraClaves(servico.preco_claves.toFixed(2)),
      })),
  }));
}

/**
 * Nome de cada curador, por id — de `curador_publico`.
 *
 * Existe porque `perfil` é privado e o embed do PostgREST não alcança o nome
 * (ver `listarDisponiveis`). Um `Map` porque quem chama tem uma lista de ids e
 * precisa casar linha a linha.
 */
export async function nomesDeCuradores(
  ids: readonly string[],
): Promise<ReadonlyMap<string, string>> {
  if (ids.length === 0) return new Map();

  const supabase = await criarClienteServidor();

  const { data, error } = await (
    supabase as unknown as {
      from(view: string): {
        select(colunas: string): {
          in(
            coluna: string,
            valores: readonly string[],
          ): Promise<{ data: LinhaPublica[] | null; error: unknown }>;
        };
      };
    }
  )
    .from('curador_publico')
    .select('perfil_curador_id, classe, nome')
    .in('perfil_curador_id', ids);

  estourarSeErro(error);

  return new Map((data ?? []).map((linha) => [linha.perfil_curador_id, linha.nome]));
}

/**
 * Confirma a seleção. Devolve os ids dos envios criados.
 *
 * Os erros sobem como `DS0nn` e são traduzidos na View: `DS010` saldo
 * insuficiente, `DS011` curador inválido, `DS012` sem serviço de feedback,
 * `DS013` faixa fora de `rascunho`/`aguardando_selecao`.
 */
export async function confirmarSelecao(
  faixaId: string,
  escolhas: readonly EscolhaDeCurador[],
): Promise<readonly string[]> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase.rpc('confirmar_selecao_curadores', {
    p_faixa_id: faixaId,
    // `[...]` não é cosmético: o tipo `Json` gerado exige array **mutável**, e
    // o domínio usa `readonly` em tudo. A cópia acontece na fronteira, que é
    // onde as duas convenções se encontram.
    p_selecao: escolhas.map((escolha) => ({
      perfil_curador_id: escolha.perfilCuradorId,
      servicos: [...escolha.servicos],
    })),
  });

  estourarSeErro(error);
  return data ?? [];
}
