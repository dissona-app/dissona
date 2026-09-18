/**
 * Schema Zod do checkout (5.2).
 *
 * ## Os dados do cartão atravessam o servidor, e não ficam nele
 *
 * A tokenização do Asaas é **posterior à cobrança**: não há como trocar o
 * cartão por um token antes de cobrar, porque é a própria cobrança que devolve
 * o `creditCardToken`. Então, na **primeira** compra, número, titular,
 * validade e código de segurança passam pela Server Action a caminho do Asaas —
 * e morrem ali. Nada disso é gravado no banco, entra em log ou volta na
 * resposta; o requisito "sem persistir dados do cartão" é cumprido por esse
 * caminho curto, e não por o dado não sair do navegador.
 *
 * Da **segunda** em diante existe a variante `cartao_salvo`, que leva só o id
 * da linha em `cartao_salvo` e nenhum dado de cartão. O caminho em que o PAN
 * nunca nos toca é outro — o checkout hospedado deles, em open-questions #28.
 *
 * As mensagens são **códigos**; a View traduz (architecture.md §8). Nenhuma
 * delas ecoa o valor recebido.
 *
 * ## CPF nos dois meios
 *
 * O Asaas só gera cobrança para cliente com CPF válido — Pix inclusive. O
 * cartão pede ainda telefone com DDD e CEP do titular; sem eles a API recusa
 * com `invalid_creditCard` (verificado no sandbox em 2026-09-16).
 */

import { z } from 'zod';

import { cpfValido, telefoneValido } from '@/lib/mascaras';

import { RESULTADOS_SIMULADOS } from './tipos';
import type { MeioPagamento } from './tipos';

/**
 * `meio_pagamento` do banco, repetido aqui porque um enum de Zod precisa dos
 * literais em tempo de compilação.
 *
 * As duas amarras abaixo prendem a cópia ao original nos dois sentidos: o
 * `satisfies` recusa um literal que o enum não tenha, e `Exaustivo` recusa um
 * valor do enum que falte na lista.
 */
export const MEIOS_DE_PAGAMENTO = ['pix', 'cartao'] as const satisfies readonly MeioPagamento[];

type Exaustivo =
  Exclude<MeioPagamento, (typeof MEIOS_DE_PAGAMENTO)[number]> extends never ? true : never;

const MEIOS_COBREM_O_ENUM: Exaustivo = true;
void MEIOS_COBREM_O_ENUM;

const digitos = (valor: string) => valor.replace(/\D/g, '');

const cpf = z.string().transform(digitos).refine(cpfValido, { message: 'cpf_invalido' });

/** Luhn: pega número digitado errado antes de gastar uma chamada ao Asaas. */
export function luhnValido(numero: string): boolean {
  const d = digitos(numero);
  if (d.length < 13 || d.length > 19) return false;
  let soma = 0;
  for (let i = 0; i < d.length; i += 1) {
    let n = Number(d[d.length - 1 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    soma += n;
  }
  return soma % 10 === 0;
}

const comuns = {
  pacoteId: z.uuid(),
  cpf,
  /**
   * Opcional de propósito: com o provedor real ele não existe, e a ação
   * ignora o que vier.
   */
  simulacao: z.enum(RESULTADOS_SIMULADOS).optional(),
};

/**
 * Os três caminhos da compra.
 *
 * `cartao_salvo` é o cartão que o Asaas já tokenizou: leva o id da linha em
 * `cartao_salvo`, e **nenhum dado de cartão** — é o ponto de guardar o token.
 * Ele não é um valor de `meio_pagamento` no banco (o enum tem `pix` e
 * `cartao`); é uma variante da tela, e o pedido nasce como `cartao`.
 *
 * União discriminada, e não campos opcionais com `superRefine`: acrescentar um
 * caminho sem tratá-lo em quem consome deixa de compilar, que é exatamente a
 * hora de descobrir.
 */
export const esquemaDeCompra = z.discriminatedUnion('meio', [
  z.object({ ...comuns, meio: z.literal('pix') }),
  z.object({ ...comuns, meio: z.literal('cartao_salvo'), cartaoId: z.uuid() }),
  z.object({
    ...comuns,
    meio: z.literal('cartao'),
    titular: z.string().trim().min(1, { message: 'titular_vazio' }).max(100),
    numero: z.string().transform(digitos).refine(luhnValido, { message: 'numero_invalido' }),
    validade: z
      .string()
      .trim()
      .regex(/^(0[1-9]|1[0-2])\/?\d{2}$/, { message: 'validade_invalida' })
      .transform((valor) => {
        const d = digitos(valor);
        return { mes: d.slice(0, 2), ano: `20${d.slice(2, 4)}` };
      }),
    cvv: z
      .string()
      .transform(digitos)
      .refine((v) => v.length === 3 || v.length === 4, { message: 'cvv_invalido' }),
    telefone: z
      .string()
      .transform(digitos)
      .refine(telefoneValido, { message: 'telefone_invalido' }),
    cep: z
      .string()
      .transform(digitos)
      .refine((v) => v.length === 8, { message: 'cep_invalido' }),
  }),
]);

export type EntradaDeCompra = z.input<typeof esquemaDeCompra>;
export type Compra = z.output<typeof esquemaDeCompra>;
