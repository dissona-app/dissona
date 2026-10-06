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

export type Vitrine = {
  readonly pacotes: readonly PacoteNaLista[];
  readonly valorDaClave: Centavos;
};

/**
 * Tela 5.1 — a vitrine do artista.
 *
 * Mesma função de enriquecimento da tela 21 (`paraLista`), e é a razão de esta
 * consulta morar aqui e não em `modulos/claves`: o preço por Clave, o desconto
 * e a economia que a vitrine mostra têm de ser os mesmos números que a equipe
 * vê ao cadastrar o pacote. Dois cálculos do mesmo pacote é como a tela do
 * admin e a do artista passam a discordar do que está à venda.
 */
export async function lerVitrine(): Promise<Vitrine> {
  const [pacotes, valorDaClave] = await Promise.all([
    repositorio.listarAtivos(),
    lerValorDaClave(),
  ]);

  return {
    pacotes: pacotes.map((pacote) => paraLista(pacote, valorDaClave)),
    valorDaClave,
  };
}

/**
 * Um pacote pelo id, já enriquecido — o checkout (5.2) e a ação de compra.
 *
 * `null` quando o id não resolve **ou** quando a RLS o esconde, que para o
 * artista significa "não está ativo". São indistinguíveis daqui de propósito:
 * distinguir revelaria a existência de um pacote que ele não pode comprar.
 */
export async function buscarPacote(pacoteId: string): Promise<PacoteNaLista | null> {
  const [pacote, valorDaClave] = await Promise.all([
    repositorio.buscar(pacoteId),
    lerValorDaClave(),
  ]);

  if (pacote === null || !pacote.ativo) return null;
  return paraLista(pacote, valorDaClave);
}
