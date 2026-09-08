import { z } from 'zod';

/**
 * Registro das chaves de `configuracao` — **schema, nunca valor**.
 *
 * Os valores vivem no seed da migration `0004`. Repeti-los aqui como *default*
 * recriaria exatamente o problema que a tabela existe para resolver: número de
 * negócio no código, e deploy a cada decisão do cliente (architecture.md §1.1).
 * Este módulo garante só que o que vier do banco tem a forma e o intervalo
 * certos.
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

/**
 * Faixa de remuneração de uma classe.
 *
 * A forma vem do protótipo da R2, não da tabela do board: os três números são
 * **piso dentro das 72h**, **teto na avaliação** e **teto com
 * compartilhamento** — e não (atraso, prazo, teto), como `docs/data-model.md`
 * §5 lê. As legendas da tela de remuneração não deixam margem: "Piso da classe
 * dentro das 72h" exibe 30% para Bronze, e "Teto da classe Bronze: 38% na
 * avaliação e 50% com compartilhamento".
 *
 * Consequência: RF-066 está incorreto ao afirmar que o piso no prazo é 38%.
 */
const faixaRemuneracao = z
  .object({
    piso: percentual,
    teto_base: percentual,
    teto_max: percentual,
  })
  .refine((faixa) => faixa.piso <= faixa.teto_base && faixa.teto_base <= faixa.teto_max, {
    message: 'esperado piso <= teto_base <= teto_max',
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
  // Claves e margem
  clave_valor_centavos: centavos,
  margem_plataforma_percentual: percentual,

  // SLA
  prazo_avaliacao_horas: inteiroPositivo,
  prazo_devolucao_dias: inteiroPositivo,

  // Avaliação
  escuta_minima_percentual: percentual,
  escuta_exigida_quando_link: z.boolean(),
  feedback_min_caracteres: inteiroNaoNegativo,
  justificativa_min_caracteres: inteiroNaoNegativo,
  criterios_obrigatorios: z.array(z.string().min(1)),

  // Remuneração
  'remuneracao.base': z.enum(['bruto', 'cota_curador']),
  'remuneracao.bronze': faixaRemuneracao,
  'remuneracao.prata': faixaRemuneracao,
  'remuneracao.ouro': faixaRemuneracao,
  penalidade_atraso_pontos: percentual,
  piso_minimo_atraso_percentual: percentual,
  acrescimo_onze_criterios_percentual: percentual,
  acrescimo_justificativa_percentual: percentual,
  acrescimo_justificativa_min_itens: inteiroPositivo,
  acrescimo_feedback_150_percentual: percentual,
  acrescimo_compartilhamento_percentual: percentual,
  'compartilhamento.acrescimo_retido': z.boolean(),

  // Classe
  'classe.prata_min_credenciais': inteiroNaoNegativo,
  'classe.ouro_min_curadorias': inteiroNaoNegativo,
  'classe.ouro_min_ciclos': inteiroNaoNegativo,
  'classe.ouro_min_score': fracao,
  'classe.rebaixamento_score': fracao,
  ciclo_meses: inteiroPositivo,

  // Ranking (R3)
  'ranking.pesos': pesosRanking,

  // Upload
  'upload.tamanho_max_mb': inteiroPositivo,
  'upload.formatos': z.array(z.enum(['wav', 'mp3'])).min(1),
  'upload.armazenar_sempre': z.boolean(),

  // LGPD
  'lgpd.dias_expurgo': inteiroPositivo,
} as const;

export type ChaveConfiguracao = keyof typeof ESQUEMAS_CONFIGURACAO;

export type ValorConfiguracao<C extends ChaveConfiguracao> = z.output<
  (typeof ESQUEMAS_CONFIGURACAO)[C]
>;

/**
 * Chaves cujo valor o cliente ainda não fechou.
 *
 * Encolheu com a leitura do protótipo da R2, que tem precedência sobre o board
 * (AGENTS.md) e decidiu a escuta mínima (60%), os cinco critérios obrigatórios
 * e a base de cálculo da remuneração. Sobra o que o protótipo não decide ou
 * decide de forma contraditória:
 *
 * - `upload.armazenar_sempre` e `escuta_exigida_quando_link` — o protótipo
 *   oferece link *ou* arquivo, e não diz o que fazer com a medição de escuta
 *   quando a origem é streaming ([#7]).
 * - `compartilhamento.acrescimo_retido` — a copy diz que a equipe confere antes
 *   de liberar o acréscimo, mas o cálculo o concede na hora ([#8]).
 * - `remuneracao.base` — resolvido pelo protótipo, mas a divergência de
 *   semântica com a tabela do board é grande o bastante para o número
 *   continuar marcado até o cliente confirmar ([#5]).
 */
export const CHAVES_PENDENTES: readonly ChaveConfiguracao[] = [
  'remuneracao.base',
  'upload.armazenar_sempre',
  'escuta_exigida_quando_link',
  'compartilhamento.acrescimo_retido',
];

export function ehChavePendente(chave: ChaveConfiguracao): boolean {
  return CHAVES_PENDENTES.includes(chave);
}

export const TODAS_AS_CHAVES = Object.keys(ESQUEMAS_CONFIGURACAO) as readonly ChaveConfiguracao[];
