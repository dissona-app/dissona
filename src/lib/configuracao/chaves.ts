import { z } from 'zod';

/**
 * Registro das chaves de `configuracao` — **schema, nunca valor**.
 *
 * Os valores vivem no seed da migration `0004` (data-model §5). Repeti-los
 * aqui como *default* recriaria exatamente o problema que a tabela existe para
 * resolver: número de negócio no código, e deploy a cada decisão do cliente
 * (architecture.md §1.1). Este módulo garante só que o que vier do banco tem
 * a forma e o intervalo certos.
 */

const percentual = z.number().min(0).max(100);
const fracao = z.number().min(0).max(1);
const inteiroPositivo = z.number().int().positive();
const inteiroNaoNegativo = z.number().int().nonnegative();

/** Centavos chegam como number no jsonb e viram `bigint` no domínio. */
const centavos = z
  .number()
  .int()
  .positive()
  .transform((valor) => BigInt(valor));

/** Piso, valor no prazo e teto de remuneração de uma classe. */
const faixaRemuneracao = z
  .object({
    atraso: percentual,
    prazo: percentual,
    teto: percentual,
  })
  .refine((faixa) => faixa.atraso <= faixa.prazo && faixa.prazo <= faixa.teto, {
    message: 'esperado atraso <= prazo <= teto',
  });

const pesosRanking = z
  .object({
    notas: fracao,
    prazo: fracao,
    calibracao: fracao,
    compartilhamento: fracao,
  })
  .refine(
    (pesos) => {
      const soma = pesos.notas + pesos.prazo + pesos.calibracao + pesos.compartilhamento;
      return Math.abs(soma - 1) < 1e-9;
    },
    { message: 'os pesos do ranking precisam somar 1' },
  );

export const ESQUEMAS_CONFIGURACAO = {
  clave_valor_centavos: centavos,
  margem_plataforma_percentual: percentual,
  prazo_avaliacao_horas: inteiroPositivo,
  prazo_devolucao_dias: inteiroPositivo,
  escuta_minima_percentual: percentual,
  feedback_min_caracteres: inteiroNaoNegativo,
  justificativa_min_caracteres: inteiroNaoNegativo,
  acrescimo_justificativa_percentual: percentual,
  criterios_obrigatorios: z.array(z.string().min(1)),
  'remuneracao.bronze': faixaRemuneracao,
  'remuneracao.prata': faixaRemuneracao,
  'remuneracao.ouro': faixaRemuneracao,
  teto_atraso_percentual: percentual,
  'classe.prata_min_credenciais': inteiroNaoNegativo,
  'classe.ouro_min_curadorias': inteiroNaoNegativo,
  'classe.ouro_min_ciclos': inteiroNaoNegativo,
  'classe.ouro_min_score': fracao,
  'classe.rebaixamento_score': fracao,
  ciclo_meses: inteiroPositivo,
  'ranking.pesos': pesosRanking,
  'upload.tamanho_max_mb': inteiroPositivo,
  'upload.formatos': z.array(z.enum(['wav', 'mp3'])).min(1),
  'lgpd.dias_expurgo': inteiroPositivo,
} as const;

export type ChaveConfiguracao = keyof typeof ESQUEMAS_CONFIGURACAO;

export type ValorConfiguracao<C extends ChaveConfiguracao> = z.output<
  (typeof ESQUEMAS_CONFIGURACAO)[C]
>;

/**
 * Chaves cujo valor o cliente ainda não decidiu — bloqueios da R2
 * ([#1](../../../docs/open-questions.md) e #3). O seed pode existir com um
 * palpite; quem depende delas precisa saber que o número não está fechado.
 */
export const CHAVES_PENDENTES: readonly ChaveConfiguracao[] = [
  'escuta_minima_percentual',
  'criterios_obrigatorios',
];

export function ehChavePendente(chave: ChaveConfiguracao): boolean {
  return CHAVES_PENDENTES.includes(chave);
}

export const TODAS_AS_CHAVES = Object.keys(ESQUEMAS_CONFIGURACAO) as readonly ChaveConfiguracao[];
