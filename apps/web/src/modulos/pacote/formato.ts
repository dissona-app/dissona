/**
 * Formatação de exibição dos pacotes.
 *
 * Mora aqui, e não no `page.tsx`, porque um arquivo de página do App Router só
 * pode exportar o que o Next reconhece (`default`, `metadata`,
 * `generateMetadata`, `revalidate`…) — exportar uma função utilitária de lá
 * quebra o build. E porque é lógica de apresentação testável sem renderizar.
 */

import { paraStringDecimal } from '@/lib/claves';
import type { Claves } from '@/lib/claves';

/** Abaixo deste desconto, a tela mostra `—` em vez de "0%". */
const LIMIAR_DE_DESCONTO = 0.05;

/** Como o protótipo mostra em `—`. */
export const SEM_DESCONTO = '—';

/**
 * Desconto como o protótipo mostra (`trim2`): `—` abaixo de 0,05%, e casas
 * decimais só quando existem.
 *
 * `formatarPercentual` de `lib/formato` arredonda para inteiro, o que
 * transformaria 12,5% em "13%" — número que ninguém digitou e que não fecha
 * com o valor exibido ao lado.
 */
export function formatarDesconto(percentual: number, locale = 'pt-BR'): string {
  if (percentual < LIMIAR_DE_DESCONTO) return SEM_DESCONTO;
  const texto = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(percentual);
  return `${texto}%`;
}

export function temDesconto(percentual: number): boolean {
  return percentual >= LIMIAR_DE_DESCONTO;
}

/**
 * Quantidade de Claves de um pacote, sem as casas decimais que o banco guarda.
 *
 * `pacote_clave.quantidade_claves` é `numeric(10,2)` porque a **mesma** escala
 * serve aos serviços do curador, que custam 1,50 Clave. Pacote é sempre
 * inteiro, e "30,00 Claves" na tabela seria ruído de duas casas em toda linha.
 */
export function formatarQuantidade(quantidade: Claves): string {
  const decimal = paraStringDecimal(quantidade);
  return decimal.endsWith('.00') ? decimal.slice(0, -3) : decimal.replace('.', ',');
}
