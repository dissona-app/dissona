import { z } from 'zod';

import { esquemaLinkOpcional } from '@dissona/nucleo/lib/link';
import { GENEROS_DO_ARTISTA } from '@dissona/nucleo/textos/prototipo';

/**
 * Validação dos três passos do envio.
 *
 * As mensagens são **códigos**; a View traduz (architecture.md §8).
 *
 * O arquivo de áudio **não** entra aqui: ele é `File`, não texto, e a regra
 * dele depende de `configuracao` — vive em `servico.validarAudio`, que a ação
 * chama com os limites já lidos.
 */

const textoOpcional = (maximo: number, codigo: string) =>
  z
    .string()
    .trim()
    .max(maximo, { message: codigo })
    .transform((valor) => (valor === '' ? null : valor));

/** Passo 1 — os detalhes da faixa. */
export const esquemaDetalhes = z
  .object({
    titulo: z
      .string()
      .trim()
      .min(1, { message: 'titulo_vazio' })
      .max(160, { message: 'titulo_longo' }),
    estilo: textoOpcional(80, 'estilo_longo'),
    urlSpotify: esquemaLinkOpcional,
    urlYoutube: esquemaLinkOpcional,
    // `null` = a pergunta "A faixa já foi lançada?" não foi respondida. Só o
    // caminho por link a faz; no caminho por arquivo ela nem aparece.
    lancada: z.enum(['sim', 'nao']).nullable(),
    dataLancamento: z
      .string()
      .trim()
      .transform((valor) => (valor === '' ? null : valor))
      .refine((valor) => valor === null || /^\d{4}-\d{2}-\d{2}$/.test(valor), {
        message: 'data_invalida',
      }),
  })
  .refine((dados) => dados.lancada !== 'sim' || dados.dataLancamento !== null, {
    message: 'data_obrigatoria',
    path: ['dataLancamento'],
  });

export type EntradaDeDetalhes = z.input<typeof esquemaDetalhes>;

/**
 * Passo 2 — gênero e contexto.
 *
 * O contexto é **obrigatório** (RF-038 e o BACKLOG). O protótipo o chama de
 * opcional — "Opcional, mas é o que faz a devolutiva render" —, mas a própria
 * tela de revisão dele trata o vazio como caso ruim ("O curador vai ouvir sem
 * direcionamento"). A divergência está registrada em 07-pendências.
 */
export const esquemaContexto = z.object({
  genero: z.enum(GENEROS_DO_ARTISTA, { message: 'genero_invalido' }),
  contexto: z
    .string()
    .trim()
    .min(1, { message: 'contexto_vazio' })
    .max(1000, { message: 'contexto_longo' }),
});

export type EntradaDeContexto = z.input<typeof esquemaContexto>;

/** Detecção por link — o passo 1 antes de haver faixa. */
export const esquemaDeteccao = z.object({
  url: z
    .string()
    .trim()
    .min(1, { message: 'link_vazio' })
    .refine((valor) => /(spotify\.com|youtube\.com|youtu\.be)/i.test(valor), {
      message: 'link_nao_suportado',
    }),
});
