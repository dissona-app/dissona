/**
 * Regra da fila (13) — **pura**, sem `server-only` e sem Supabase.
 *
 * Toda a ordenação e a filtragem acontecem aqui, e não no SQL. A razão é que
 * duas das três colunas ordenáveis não são colunas: "Status" na tela é um
 * derivado do relógio ("Atrasada" = prazo vencido), e "Música" ordena por
 * **artista**, com `localeCompare` pt-BR — que o `order by` do Postgres faria
 * por colação de banco, não por regra de idioma da interface. Ordenar no
 * serviço mantém as três consistentes e testáveis sem banco.
 */

import type { Direcao, ItemDaFila, OrdemDaFila, StatusDaFila } from './tipos';

/** Horas restantes até o prazo. Negativo = vencido. */
export function horasRestantes(item: ItemDaFila, agora: Date): number {
  return (item.prazoEm.getTime() - agora.getTime()) / 3_600_000;
}

/** Prazo curto é o que o resumo conta como urgente: menos de 24h. */
export const HORAS_DE_PRAZO_CURTO = 24;

export function ehPrazoCurto(item: ItemDaFila, agora: Date): boolean {
  const horas = horasRestantes(item, agora);
  return horas >= 0 && horas < HORAS_DE_PRAZO_CURTO;
}

/**
 * O status que a tela mostra.
 *
 * `atrasada` vence os demais: um envio em `avaliando` com o prazo estourado é
 * atrasado, e chamá-lo de "Em escuta" esconderia justamente o que importa.
 */
export function statusNaTela(item: ItemDaFila, agora: Date): Exclude<StatusDaFila, 'todas'> {
  if (horasRestantes(item, agora) < 0) return 'atrasada';
  return item.situacao === 'recebeu' ? 'nova' : 'em_escuta';
}

/** Só o que ainda está na fila — `pronto` e `devolvido` saíram dela. */
export function naFila(item: ItemDaFila): boolean {
  return item.situacao === 'recebeu' || item.situacao === 'ouviu' || item.situacao === 'avaliando';
}

export function filtrar(
  itens: readonly ItemDaFila[],
  status: StatusDaFila,
  genero: string | null,
  agora: Date,
): readonly ItemDaFila[] {
  return itens.filter((item) => {
    if (status !== 'todas' && statusNaTela(item, agora) !== status) return false;
    if (genero !== null && item.genero !== genero) return false;
    return true;
  });
}

const PESO_DO_STATUS: Readonly<Record<string, number>> = {
  atrasada: 0,
  nova: 1,
  em_escuta: 2,
};

/**
 * Ordena, com o padrão do protótipo: prazo ascendente — o mais urgente primeiro.
 *
 * "Música" ordena por **artista**, e não por título: é o que `filaVM()` faz.
 */
export function ordenar(
  itens: readonly ItemDaFila[],
  ordem: OrdemDaFila,
  direcao: Direcao,
  agora: Date,
): readonly ItemDaFila[] {
  const sinal = direcao === 'asc' ? 1 : -1;

  return [...itens].sort((a, b) => {
    if (ordem === 'musica') {
      return sinal * a.artista.localeCompare(b.artista, 'pt-BR');
    }
    if (ordem === 'status') {
      const diferenca =
        (PESO_DO_STATUS[statusNaTela(a, agora)] ?? 9) -
        (PESO_DO_STATUS[statusNaTela(b, agora)] ?? 9);
      // Empate de status volta para o prazo: duas faixas "Nova" ainda têm
      // urgências diferentes, e listá-las em ordem arbitrária perderia isso.
      return sinal * (diferenca !== 0 ? diferenca : a.prazoEm.getTime() - b.prazoEm.getTime());
    }
    return sinal * (a.prazoEm.getTime() - b.prazoEm.getTime());
  });
}

/** Os gêneros presentes na fila, para o filtro. Ordenados em pt-BR. */
export function generosDisponiveis(itens: readonly ItemDaFila[]): readonly string[] {
  const unicos = new Set(
    itens.map((item) => item.genero).filter((genero): genero is string => genero !== null),
  );
  return [...unicos].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export function contarPrazoCurto(itens: readonly ItemDaFila[], agora: Date): number {
  return itens.filter((item) => ehPrazoCurto(item, agora)).length;
}
