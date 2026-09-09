/**
 * Schemas Zod da tela 21.1, compartilhados cliente/servidor.
 *
 * Os campos chegam como **string** — é o que um `<input>` produz, e é o que a
 * máscara pt-BR do valor ("285,00") entrega. A conversão para `bigint` mora
 * aqui, num só lugar, e usa `paraCentavos`/`deClavesInteiras` de `lib/`, que
 * são os únicos módulos autorizados a converter dinheiro e Claves (§8).
 *
 * `valor` é o campo autoritativo. O campo "Desconto (%)" da tela existe, e o
 * protótipo o deixa editável, mas ele só **recalcula o valor** ("Recalcula o
 * valor", diz a própria copy auxiliar) — não é gravado a partir da digitação.
 * `desconto_percentual` no banco é derivado de `valor` na gravação, o que faz
 * a coluna e o valor não poderem divergir.
 */

import { z } from 'zod';

import { deClavesInteiras } from '@/lib/claves';
import { paraCentavos } from '@/lib/dinheiro';

/** Aceita "285", "285,00", "1.234,56". Rejeita o resto sem arredondar. */
const reais = z
  .string()
  .trim()
  .min(1)
  .transform((bruto, ctx) => {
    try {
      return paraCentavos(bruto);
    } catch {
      ctx.addIssue({ code: 'custom', message: 'valor_invalido' });
      return z.NEVER;
    }
  })
  .refine((centavos) => centavos > 0n, { message: 'valor_nao_positivo' });

/**
 * Claves de pacote são **inteiras**.
 *
 * O banco aceita `numeric(10,2)` porque o preço de um serviço do curador é
 * fracionário (1,50 Clave), mas um pacote de 30,5 Claves não existe em
 * nenhuma tela e faria "Por Clave" virar um número que ninguém confere.
 */
const clavesInteiras = z
  .string()
  .trim()
  .regex(/^[0-9]{1,7}$/, { message: 'quantidade_invalida' })
  .transform((bruto, ctx) => {
    const inteiro = Number(bruto);
    if (inteiro <= 0) {
      ctx.addIssue({ code: 'custom', message: 'quantidade_nao_positiva' });
      return z.NEVER;
    }
    return deClavesInteiras(inteiro);
  });

export const esquemaDadosDePacote = z.object({
  nome: z.string().trim().min(1, { message: 'nome_vazio' }).max(80, { message: 'nome_longo' }),
  quantidade: clavesInteiras,
  valor: reais,
  ativo: z.boolean(),
});

export type EntradaDePacote = z.input<typeof esquemaDadosDePacote>;

/**
 * Desconto digitado na tela, só para o recálculo do valor no cliente.
 *
 * Teto em 99,99: 100% de desconto seria um pacote de graça, e `valor > 0` é
 * `check` no banco. O limite inferior aberto em zero é de propósito — o
 * pacote "Ensaio" do protótipo tem 0%.
 */
export const esquemaDesconto = z.coerce
  .number()
  .min(0, { message: 'desconto_invalido' })
  .max(99.99, { message: 'desconto_invalido' });

/** Alternância de `ativo` na lista (ação Ativar/Desativar da tela 21). */
export const esquemaAlternarAtivo = z.object({
  pacoteId: z.uuid(),
  ativo: z.boolean(),
});

export const esquemaIdDePacote = z.object({ pacoteId: z.uuid() });
