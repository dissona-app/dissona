/**
 * Regra da avaliação (14) — **pura**, sem `server-only` e sem Supabase.
 *
 * O que mora aqui é a **previsão**: quais opcionais estão cumpridos, o que
 * falta para concluir, e as médias do resumo. A decisão final é do banco —
 * `enviar_avaliacao` refaz cada checagem e deriva os opcionais do que foi
 * gravado, não do que o cliente mandou. Isto aqui existe para a tela poder
 * dizer, antes do envio, o que vai acontecer.
 */

import type {
  AvaliacaoEmEdicao,
  Criterio,
  GrupoCriterio,
  NotaDeCriterio,
  OpcionaisCumpridos,
  RegrasDaAvaliacao,
} from '@dissona/nucleo/modulos/avaliacao/tipos';

/** Nota válida: 0 a 5, com no máximo uma casa decimal. */
export function notaValida(nota: number): boolean {
  return Number.isFinite(nota) && nota >= 0 && nota <= 5 && Math.round(nota * 10) === nota * 10;
}

/**
 * Trunca para uma casa, como `avSetNota` do protótipo.
 *
 * Trunca e não arredonda: digitar "4,26" vira 4,2. Arredondar para 4,3 daria
 * ao curador uma nota que ele não escolheu.
 */
export function truncarNota(nota: number): number {
  return Math.min(5, Math.floor(Math.max(0, nota) * 10) / 10);
}

export function notaDe(avaliacao: AvaliacaoEmEdicao, criterio: string): NotaDeCriterio | null {
  return avaliacao.notas.find((n) => n.criterio === criterio) ?? null;
}

/** Os obrigatórios que ainda faltam — a fonte é `configuracao`, não o catálogo. */
export function obrigatoriosFaltando(
  avaliacao: AvaliacaoEmEdicao,
  regras: RegrasDaAvaliacao,
): readonly string[] {
  return regras.criteriosObrigatorios.filter((chave) => notaDe(avaliacao, chave) === null);
}

/** Quantas justificativas alcançaram o mínimo de caracteres. */
export function justificativasLongas(
  avaliacao: AvaliacaoEmEdicao,
  regras: RegrasDaAvaliacao,
): number {
  return avaliacao.notas.filter(
    (nota) => (nota.justificativa ?? '').trim().length >= regras.justificativaMinCaracteres,
  ).length;
}

/**
 * Os quatro opcionais, na mesma leitura que `enviar_avaliacao` faz.
 *
 * ⚠️ Espelho de regra do banco. Se um dia divergirem, a tela 14.4 mostra um
 * valor e o extrato do curador mostra outro — por isso cada item aqui tem o
 * seu teste.
 */
export function opcionaisCumpridos(
  avaliacao: AvaliacaoEmEdicao,
  criterios: readonly Criterio[],
  regras: RegrasDaAvaliacao,
): OpcionaisCumpridos {
  const respondidos = avaliacao.notas.length;

  return {
    onze_criterios: respondidos >= criterios.length && criterios.length > 0,
    justificativas_250:
      justificativasLongas(avaliacao, regras) >= regras.acrescimoJustificativaMinItens,
    feedback_150: (avaliacao.feedback ?? '').trim().length >= regras.feedbackMinCaracteres,
    // `nao_compartilhou` é escolha válida e **não** conta como compartilhamento.
    compartilhou:
      avaliacao.compartilhamento !== null &&
      avaliacao.compartilhamento.modalidade !== 'nao_compartilhou',
  };
}

export type ImpedimentoParaConcluir =
  | { readonly tipo: 'escuta'; readonly medido: number; readonly minimo: number }
  | { readonly tipo: 'criterios'; readonly faltando: readonly string[] }
  | { readonly tipo: 'feedback' }
  | { readonly tipo: 'compartilhamento_sem_escolha' }
  | { readonly tipo: 'outros_sem_descricao' };

/**
 * O que impede concluir, na **mesma ordem** em que `enviar_avaliacao` recusa:
 * escuta (`DS001`) → critérios (`DS002`) → feedback (`DS003`).
 *
 * A ordem importa: mostrar "falta feedback" quando a escuta também está
 * abaixo do mínimo faria a pessoa escrever o texto para só então descobrir
 * que precisa ouvir a faixa.
 */
export function impedimentosParaConcluir(
  avaliacao: AvaliacaoEmEdicao,
  regras: RegrasDaAvaliacao,
): readonly ImpedimentoParaConcluir[] {
  const impedimentos: ImpedimentoParaConcluir[] = [];

  if (avaliacao.escutaPercentual < regras.escutaMinimaPercentual) {
    impedimentos.push({
      tipo: 'escuta',
      medido: avaliacao.escutaPercentual,
      minimo: regras.escutaMinimaPercentual,
    });
  }

  const faltando = obrigatoriosFaltando(avaliacao, regras);
  if (faltando.length > 0) impedimentos.push({ tipo: 'criterios', faltando });

  if ((avaliacao.feedback ?? '').trim() === '') impedimentos.push({ tipo: 'feedback' });

  const compartilhamento = avaliacao.compartilhamento;
  if (compartilhamento === null) {
    // Nem compartilhar nem recusar é um estado incompleto: a tela 14.2 exige
    // uma das duas escolhas antes de liberar a conclusão.
    impedimentos.push({ tipo: 'compartilhamento_sem_escolha' });
  } else if (
    compartilhamento.modalidade === 'outros' &&
    (compartilhamento.descricao ?? '').trim() === ''
  ) {
    // `check` da `0008`: modalidade `outros` exige descrição não vazia.
    impedimentos.push({ tipo: 'outros_sem_descricao' });
  }

  return impedimentos;
}

export function podeConcluir(avaliacao: AvaliacaoEmEdicao, regras: RegrasDaAvaliacao): boolean {
  return impedimentosParaConcluir(avaliacao, regras).length === 0;
}

/** Média das notas objetivas — o "NO" da fórmula `NF = NO + NS`. */
export function mediaObjetiva(avaliacao: AvaliacaoEmEdicao): number | null {
  if (avaliacao.notas.length === 0) return null;
  const soma = avaliacao.notas.reduce((total, nota) => total + nota.nota, 0);
  return Math.round((soma / avaliacao.notas.length) * 100) / 100;
}

/** Média por grupo, para o resumo "Suas notas objetivas". */
export function mediasPorGrupo(
  avaliacao: AvaliacaoEmEdicao,
  criterios: readonly Criterio[],
): ReadonlyMap<GrupoCriterio, number | null> {
  const porGrupo = new Map<GrupoCriterio, number[]>();

  for (const criterio of criterios) {
    const lista = porGrupo.get(criterio.grupo) ?? [];
    const nota = notaDe(avaliacao, criterio.chave);
    if (nota !== null) lista.push(nota.nota);
    porGrupo.set(criterio.grupo, lista);
  }

  return new Map(
    [...porGrupo].map(([grupo, notas]) => [
      grupo,
      notas.length === 0
        ? null
        : Math.round((notas.reduce((t, n) => t + n, 0) / notas.length) * 100) / 100,
    ]),
  );
}

/**
 * O passo seguinte.
 *
 * `outras` só entra quando a modalidade é `outros` — é o que o protótipo faz
 * (`avAvancar` pula 14.3 quando ela não se aplica).
 */
export function proximoPasso(
  atual: string,
  avaliacao: AvaliacaoEmEdicao,
): 'notas' | 'subjetiva' | 'compartilhamento' | 'outras' | 'remuneracao' {
  if (atual === 'notas') return 'subjetiva';
  if (atual === 'subjetiva') return 'compartilhamento';
  if (atual === 'compartilhamento') {
    return avaliacao.compartilhamento?.modalidade === 'outros' ? 'outras' : 'remuneracao';
  }
  return 'remuneracao';
}

/**
 * O passo anterior — o espelho de `proximoPasso`.
 *
 * `avVoltar` do protótipo tem a mesma assimetria: de 14.4 volta-se para 14.3
 * quando a modalidade é `outros`, e para 14.2 quando não é. Sem isto, voltar
 * cairia numa tela que o avanço tinha pulado.
 *
 * `notas` não tem anterior; quem está lá sai da avaliação, não volta um passo.
 */
export function passoAnterior(
  atual: string,
  avaliacao: AvaliacaoEmEdicao,
): 'notas' | 'subjetiva' | 'compartilhamento' | 'outras' | null {
  if (atual === 'subjetiva') return 'notas';
  if (atual === 'compartilhamento') return 'subjetiva';
  if (atual === 'outras') return 'compartilhamento';
  if (atual === 'remuneracao') {
    return avaliacao.compartilhamento?.modalidade === 'outros' ? 'outras' : 'compartilhamento';
  }
  return null;
}
