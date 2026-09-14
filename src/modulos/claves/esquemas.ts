/**
 * Schema Zod do checkout (5.2).
 *
 * ## O que **não** está aqui, e é a decisão mais importante do arquivo
 *
 * Os quatro campos do cartão — número, nome, validade e código de segurança —
 * não entram neste schema porque **não são enviados ao servidor**. O
 * requisito da R2 é "checkout com cartão tokenizado, sem persistir dados do
 * cartão", e a forma mais forte de não persistir é o dado não atravessar a
 * rede: a validação de formato acontece no cliente, em
 * `FormularioDeCheckout`, e o que chega aqui é só pacote, meio e — enquanto o
 * provedor for o simulado — o desfecho a simular.
 *
 * Quando o Asaas entrar, o campo que aparece neste schema é o **token** que o
 * SDK deles devolve no navegador, nunca o PAN. O lugar já está marcado.
 */

import { z } from 'zod';

import { RESULTADOS_SIMULADOS } from './tipos';
import type { MeioPagamento } from './tipos';

/**
 * `meio_pagamento` do banco, repetido aqui porque um enum de Zod precisa dos
 * literais em tempo de compilação.
 *
 * As duas amarras abaixo prendem a cópia ao original nos dois sentidos: o
 * `satisfies` recusa um literal que o enum não tenha, e `Exaustivo` recusa um
 * valor do enum que falte na lista. Sem a segunda, acrescentar `boleto` no
 * banco passaria despercebido até alguém reparar que a opção não aparece na
 * tela — e é o tipo de ausência que ninguém procura.
 */
export const MEIOS_DE_PAGAMENTO = ['pix', 'cartao'] as const satisfies readonly MeioPagamento[];

type Exaustivo =
  Exclude<MeioPagamento, (typeof MEIOS_DE_PAGAMENTO)[number]> extends never ? true : never;

const MEIOS_COBREM_O_ENUM: Exaustivo = true;
void MEIOS_COBREM_O_ENUM;

export const esquemaDeCompra = z.object({
  pacoteId: z.uuid(),
  meio: z.enum(MEIOS_DE_PAGAMENTO),
  /**
   * Opcional de propósito: com o provedor real ele não existe, e a ação
   * ignora o que vier. Um campo obrigatório aqui faria a migração para o
   * Asaas exigir mudança de schema, de ação e de tela ao mesmo tempo.
   */
  simulacao: z.enum(RESULTADOS_SIMULADOS).optional(),
});

export type EntradaDeCompra = z.input<typeof esquemaDeCompra>;
