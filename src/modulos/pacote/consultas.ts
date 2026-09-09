import 'server-only';

/**
 * Leituras de pacote para Server Components.
 *
 * O valor da Clave vem de `configuracao.clave_valor_centavos` e desce por
 * parâmetro até o serviço. O "R$ 10" que a tela 21 escreve na abertura ("Base
 * de 1 Clave por R$ 10") é **dado**, não literal de código — e é por isso que
 * ele aparece formatado a partir da configuração, e não digitado na copy.
 */

import { lerConfiguracao } from '@/lib/configuracao';
import type { Centavos } from '@/lib/dinheiro';

import * as repositorio from './repositorio';
import { contarAtivos, paraLista } from './servico';
import type { PacoteNaLista } from './tipos';

export type ListaDePacotes = {
  readonly pacotes: readonly PacoteNaLista[];
  readonly ativos: number;
  readonly total: number;
  readonly valorDaClave: Centavos;
};

/** Tela 21 — a lista da equipe, com o derivado já calculado. */
export async function lerListaDaEquipe(): Promise<ListaDePacotes> {
  const [pacotes, valorDaClave] = await Promise.all([
    repositorio.listarParaEquipe(),
    lerValorDaClave(),
  ]);

  return {
    pacotes: pacotes.map((pacote) => paraLista(pacote, valorDaClave)),
    ativos: contarAtivos(pacotes),
    total: pacotes.length,
    valorDaClave,
  };
}

export type PacoteParaEdicao = {
  readonly pacote: PacoteNaLista;
  readonly valorDaClave: Centavos;
};

/** Tela 21.1 em modo edição. `null` quando o id não resolve. */
export async function lerParaEdicao(pacoteId: string): Promise<PacoteParaEdicao | null> {
  const [pacote, valorDaClave] = await Promise.all([
    repositorio.buscar(pacoteId),
    lerValorDaClave(),
  ]);

  if (pacote === null) return null;
  return { pacote: paraLista(pacote, valorDaClave), valorDaClave };
}

/** Tela 21.1 em modo criação — só precisa da base para o "Base: R$ …". */
export async function lerValorDaClave(): Promise<Centavos> {
  const centavos = await lerConfiguracao('clave_valor_centavos');
  return BigInt(centavos);
}
