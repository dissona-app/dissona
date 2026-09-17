import { z } from 'zod';

import { esquemaLinkOpcional } from '@/lib/link';
import { GENEROS_DO_ARTISTA } from '@/textos/prototipo';

import { MAXIMO_DA_BIO, MAXIMO_DE_GENEROS } from './tipos';

/**
 * Validação do perfil do artista (7.1).
 *
 * As mensagens são **códigos**; a View traduz (architecture.md §8).
 *
 * Cada regra aqui espelha um `check` da migration `0002` ou `0001`, e o
 * espelho é deliberado: sem ele, a bio de 281 caracteres só falharia no banco,
 * como `23514` genérico, depois de a pessoa ter preenchido a tela inteira — e
 * sem dizer qual campo. O banco continua sendo a fronteira real; isto é a
 * mensagem de erro decente.
 */

/**
 * Campo de texto opcional: vazio vira `null`.
 *
 * `null` e não `''` porque as colunas são anuláveis e um texto vazio gravado
 * faria `cidade IS NOT NULL` mentir para quem consultar depois.
 */
function textoOpcional(maximo: number, codigo: string) {
  return z
    .string()
    .trim()
    .max(maximo, { message: codigo })
    .transform((valor) => (valor === '' ? null : valor));
}

/** Espelha `check (handle ~ '^[a-z0-9_]{3,30}$')` da `0001`. */
const esquemaHandle = z
  .string()
  .trim()
  .toLowerCase()
  .transform((valor) => (valor === '' ? null : valor))
  .refine((valor) => valor === null || /^[a-z0-9_]{3,30}$/.test(valor), {
    message: 'handle_formato',
  });

export const esquemaDadosDoPerfil = z.object({
  nomeExibicao: textoOpcional(80, 'nome_exibicao_longo'),
  cidade: textoOpcional(80, 'cidade_longa'),
  handle: esquemaHandle,
  bio: textoOpcional(MAXIMO_DA_BIO, 'bio_longa'),
  // A mensagem vai no `z.enum`, não no `z.array`: em Zod v4 o `message` do
  // array só vale para o array em si (tipo errado), e o elemento fora do
  // catálogo cai na mensagem padrão do enum — que não está em `MOTIVOS`, e
  // some da tela sem deixar rastro.
  generos: z
    .array(z.enum(GENEROS_DO_ARTISTA, { message: 'genero_desconhecido' }))
    .max(MAXIMO_DE_GENEROS, { message: 'generos_demais' }),
  linkInstagram: esquemaLinkOpcional,
  linkSpotify: esquemaLinkOpcional,
  linkYoutube: esquemaLinkOpcional,
  linkSite: esquemaLinkOpcional,
});

export type EntradaDoPerfil = z.input<typeof esquemaDadosDoPerfil>;
