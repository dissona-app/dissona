import 'server-only';

/**
 * Leituras das cinco etapas da avaliação (14 · 14.1 · 14.2 · 14.3 · 14.4).
 *
 * Nenhuma delas escreve. O rascunho nasce na **ação** — `garantirRascunho` —, e
 * não aqui: abrir a tela não é começar a avaliar, e um `insert` disparado por
 * um GET criaria rascunho a cada visita de quem só foi olhar. É também o que
 * permite ao Next tratar estas funções como leitura pura.
 *
 * Os dados da faixa vêm do módulo 13 (`fila_do_curador`), e não de um embed em
 * `envio`: o nome do artista mora em `perfil`, que é privado, e o `!inner`
 * devolveria **zero linha sem erro** — a tela cairia no estado vazio como se
 * não houvesse envio nenhum.
 */

import { lerConfiguracao, lerConfiguracoes } from '@/lib/configuracao';
import { paraStringDecimal } from '@/lib/claves';
import { buscarItem, servicosDoEnvio } from '@/modulos/fila/repositorio';
import type { ItemDaFila, ServicoContratado } from '@/modulos/fila/tipos';

import {
  buscarGanho,
  buscarRascunho,
  classeDoCurador,
  listarCriterios,
  preverRemuneracao,
  urlDoAudio,
} from './repositorio';
import { justificativasLongas, opcionaisCumpridos } from './servico';
import type {
  AvaliacaoEmEdicao,
  ClasseCurador,
  Criterio,
  RegrasDaAvaliacao,
  Remuneracao,
} from './tipos';

export type { AvaliacaoEmEdicao, Criterio, RegrasDaAvaliacao } from './tipos';

/** O rascunho vazio de um envio que ainda não foi aberto. */
function rascunhoVazio(envioId: string): AvaliacaoEmEdicao {
  return {
    id: null,
    envioId,
    notaSubjetiva: null,
    feedback: null,
    escutaPercentual: 0,
    passoAtual: 1,
    concluida: false,
    notas: [],
    compartilhamento: null,
  };
}

export type TelaDaAvaliacao = {
  readonly item: ItemDaFila;
  readonly avaliacao: AvaliacaoEmEdicao;
  readonly criterios: readonly Criterio[];
  readonly regras: RegrasDaAvaliacao;
  /** URL assinada do áudio, ou `null` quando não há arquivo que o player toque. */
  readonly audioUrl: string | null;
  readonly agora: Date;
};

/**
 * Tudo o que as etapas 1 a 4 precisam, numa leitura só.
 *
 * `null` cobre dois casos indistinguíveis de propósito: o envio não existe, ou
 * não é do curador da sessão — a view `fila_do_curador` o esconde, e separar os
 * dois revelaria que ele existe.
 */
export async function lerAvaliacao(envioId: string): Promise<TelaDaAvaliacao | null> {
  const item = await buscarItem(envioId);
  if (item === null) return null;

  const [avaliacao, criterios, regras, audioUrl] = await Promise.all([
    buscarRascunho(envioId),
    listarCriterios(),
    lerRegras(),
    urlDoAudio(item.arquivoCaminho),
  ]);

  return {
    item,
    avaliacao: avaliacao ?? rascunhoVazio(envioId),
    criterios,
    regras,
    audioUrl,
    agora: new Date(),
  };
}

/**
 * Os thresholds da avaliação — todos de `configuracao`, nenhum daqui.
 *
 * `criterios_obrigatorios` é a **fonte** de quais critérios são exigidos;
 * `criterio.obrigatorio` é conveniência de UI e pode divergir. Quem valida é
 * esta lista, que é a mesma que `enviar_avaliacao` lê.
 */
export async function lerRegras(): Promise<RegrasDaAvaliacao> {
  const cfg = await lerConfiguracoes([
    'escuta_minima_percentual',
    'feedback_min_caracteres',
    'justificativa_min_caracteres',
    'criterios_obrigatorios',
    'acrescimo_justificativa_min_itens',
  ] as const);

  return {
    escutaMinimaPercentual: cfg.escuta_minima_percentual,
    feedbackMinCaracteres: cfg.feedback_min_caracteres,
    justificativaMinCaracteres: cfg.justificativa_min_caracteres,
    criteriosObrigatorios: cfg.criterios_obrigatorios,
    acrescimoJustificativaMinItens: cfg.acrescimo_justificativa_min_itens,
  };
}

export type TelaDaRemuneracao = TelaDaAvaliacao & {
  readonly classe: ClasseCurador;
  /** Congelado pela RPC na conclusão; aqui é previsão, medida contra o relógio. */
  readonly noPrazo: boolean;
  readonly remuneracao: Remuneracao | null;
  /**
   * Até onde o acumulado vai fora das 72h. O teto **efetivo** já vem de
   * `calcular_remuneracao` em `remuneracao.tetoPercentual`; este é só para a
   * nota do piso explicar a regra quando a entrega atrasa.
   */
  readonly tetoAtrasoPercentual: number;
  readonly servicos: readonly ServicoContratado[];
  /** Quantos critérios alcançaram o mínimo de caracteres — o detalhe do acréscimo. */
  readonly justificativasLongas: number;
};

/**
 * 14.4 — a previsão, pela **mesma função** que grava.
 *
 * `preverRemuneracao` chama `calcular_remuneracao`, que é a função que
 * `enviar_avaliacao` usa no passo 10. Reimplementar a conta aqui seria a origem
 * clássica de "o valor mostrado não é o valor pago".
 *
 * Os opcionais são calculados do rascunho **já gravado**, e não do que a tela
 * tem em mão: é o mesmo recorte que a RPC faz ao derivá-los do que foi
 * persistido. Uma nota digitada e não salva não pode inflar a previsão.
 */
export async function lerRemuneracao(envioId: string): Promise<TelaDaRemuneracao | null> {
  const base = await lerAvaliacao(envioId);
  if (base === null) return null;

  const [classe, servicos, tetoAtraso] = await Promise.all([
    classeDoCurador(),
    servicosDoEnvio(envioId),
    lerConfiguracao('teto_atraso_percentual'),
  ]);

  // Sem papel de curador não há classe, e sem classe não há o que calcular. O
  // acesso já foi barrado pela guarda de rota; isto é a terceira camada.
  if (classe === null) return null;

  const noPrazo = base.agora <= base.item.prazoEm;
  const opcionais = opcionaisCumpridos(base.avaliacao, base.criterios, base.regras);

  // Concluída, a conta já não é previsão: `ganho_curador` congelou a classe, o
  // prazo e os percentuais do momento da entrega, e é ele que explica o crédito
  // que de fato entrou. Uma nova previsão leria a `configuracao` de hoje.
  const remuneracao =
    base.avaliacao.concluida && base.avaliacao.id !== null
      ? await buscarGanho(base.avaliacao.id)
      : await preverRemuneracao(
          classe,
          noPrazo,
          Number(paraStringDecimal(base.item.totalClaves)),
          opcionais,
        );

  return {
    ...base,
    classe,
    noPrazo,
    remuneracao,
    tetoAtrasoPercentual: tetoAtraso,
    servicos,
    justificativasLongas: justificativasLongas(base.avaliacao, base.regras),
  };
}
