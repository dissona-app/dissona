/**
 * Datas, números e prazos.
 *
 * O banco guarda `timestamptz` em UTC; a formatação por locale acontece na
 * View (architecture.md §8). Nada aqui decide regra de negócio: o prazo de 72h
 * e a devolução de 7 dias vêm de `configuracao`.
 */

export type Locale = 'pt-BR' | 'es' | 'en';

const MS_POR_MINUTO = 60_000;
const MS_POR_HORA = 60 * MS_POR_MINUTO;
const MS_POR_DIA = 24 * MS_POR_HORA;

export function formatarData(data: Date, locale: Locale = 'pt-BR'): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'short' }).format(data);
}

export function formatarDataHora(data: Date, locale: Locale = 'pt-BR'): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(data);
}

export function formatarDataLonga(data: Date, locale: Locale = 'pt-BR'): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(data);
}

export function formatarNumero(valor: number, locale: Locale = 'pt-BR'): string {
  return new Intl.NumberFormat(locale).format(valor);
}

/** `0.85` → `"85%"`. Recebe a fração, não o percentual. */
export function formatarFracaoComoPercentual(
  fracao: number,
  locale: Locale = 'pt-BR',
  casas = 0,
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(fracao);
}

/** `38` → `"38%"`. Recebe o percentual já em base 100. */
export function formatarPercentual(percentual: number, locale: Locale = 'pt-BR'): string {
  return formatarFracaoComoPercentual(percentual / 100, locale);
}

/** Soma horas a uma data — usado para derivar o vencimento de um `envio`. */
export function somarHoras(data: Date, horas: number): Date {
  return new Date(data.getTime() + horas * MS_POR_HORA);
}

export function somarDias(data: Date, dias: number): Date {
  return new Date(data.getTime() + dias * MS_POR_DIA);
}

export type PrazoRestante = {
  /** Negativo quando o prazo já venceu. */
  readonly totalMs: number;
  readonly dias: number;
  readonly horas: number;
  readonly minutos: number;
  readonly vencido: boolean;
};

/**
 * Decompõe o tempo até o vencimento. `dias`, `horas` e `minutos` são sempre
 * positivos; use `vencido` para saber o sentido.
 */
export function prazoRestante(vencimento: Date, agora: Date = new Date()): PrazoRestante {
  const totalMs = vencimento.getTime() - agora.getTime();
  const absoluto = Math.abs(totalMs);
  return {
    totalMs,
    dias: Math.floor(absoluto / MS_POR_DIA),
    horas: Math.floor((absoluto % MS_POR_DIA) / MS_POR_HORA),
    minutos: Math.floor((absoluto % MS_POR_HORA) / MS_POR_MINUTO),
    vencido: totalMs < 0,
  };
}

/**
 * Se a avaliação foi concluída dentro do prazo. Congelado no `envio` no
 * momento da conclusão — é o que decide o percentual de remuneração.
 */
export function dentroDoPrazo(concluidoEm: Date, vencimento: Date): boolean {
  return concluidoEm.getTime() <= vencimento.getTime();
}

/**
 * Tempo decorrido em linguagem natural — o "há 3 dias" do painel de sessões.
 *
 * `Intl.RelativeTimeFormat` com `numeric: 'auto'`, que é o que produz "ontem"
 * e "agora" em vez de "há 1 dia" e "há 0 segundos". A maior unidade que couber
 * vence: 90 minutos são "há 1 hora", e não "há 90 minutos".
 *
 * Datas no futuro são formatadas com o sinal correto ("em 2 dias"), embora o
 * uso previsto seja passado — um relógio de servidor adiantado em relação ao do
 * banco produziria futuro por alguns segundos, e "em 3 segundos" é menos errado
 * que uma negativa formatada como passado.
 */
export function tempoRelativo(
  data: Date,
  locale: Locale = 'pt-BR',
  agora: Date = new Date(),
): string {
  const formatador = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const ms = data.getTime() - agora.getTime();
  const absoluto = Math.abs(ms);

  for (const [unidade, tamanho] of UNIDADES_RELATIVAS) {
    if (absoluto >= tamanho || unidade === 'second') {
      return formatador.format(Math.round(ms / tamanho), unidade);
    }
  }

  // Inalcançável: `second` sempre casa. Existe para o `noUncheckedIndexedAccess`
  // não exigir um `!` no fim do laço.
  return formatador.format(0, 'second');
}

/** Da maior para a menor — a primeira que couber é a que aparece. */
const UNIDADES_RELATIVAS: readonly (readonly [Intl.RelativeTimeFormatUnit, number])[] = [
  ['year', 365 * MS_POR_DIA],
  ['month', 30 * MS_POR_DIA],
  ['day', MS_POR_DIA],
  ['hour', MS_POR_HORA],
  ['minute', MS_POR_MINUTO],
  ['second', 1000],
];

/** Trunca texto preservando palavra, para as prévias de feedback nas listas. */
export function truncar(texto: string, maximo: number): string {
  if (texto.length <= maximo) return texto;
  const corte = texto.slice(0, maximo);
  const ultimoEspaco = corte.lastIndexOf(' ');
  return `${(ultimoEspaco > 0 ? corte.slice(0, ultimoEspaco) : corte).trimEnd()}…`;
}
