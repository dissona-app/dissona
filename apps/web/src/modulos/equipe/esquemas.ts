import { z } from 'zod';

import { PAPEIS_ADMIN, NivelDeAcesso } from './tipos';

/**
 * Validação do módulo 27. Mensagens como **códigos**; a View traduz.
 */

const papelAdmin = z.enum(PAPEIS_ADMIN.map((cada) => cada.valor) as [string, ...string[]], {
  message: 'papel_invalido',
});

/**
 * Convite de membro (27.3).
 *
 * O protótipo rotula o campo "E-mail corporativo" e usa
 * `nome@dissona.com.br` de placeholder, mas **não** valida domínio — e é o
 * comportamento certo: a plataforma não sabe qual é o domínio do cliente, e
 * travar em `@dissona.com.br` impediria convidar uma pessoa terceirizada no
 * dia em que isso for preciso. O rótulo comunica a expectativa; a validação
 * não a impõe.
 */
export const esquemaConvite = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: 'email_vazio' })
    .pipe(z.email({ message: 'email_invalido' }))
    .transform((valor) => valor.toLowerCase()),
  papel: papelAdmin,
});

export const esquemaAlterarPapel = z.object({
  membroId: z.uuid({ message: 'membro_invalido' }),
  papel: papelAdmin,
});

export const esquemaAlterarAcesso = z.object({
  membroId: z.uuid({ message: 'membro_invalido' }),
  /** `'true'` / `'false'` como o `FormData` os carrega. */
  ativo: z.enum(['true', 'false']).transform((valor) => valor === 'true'),
});

export const esquemaReenvio = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: 'email_vazio' })
    .pipe(z.email({ message: 'email_invalido' }))
    .transform((valor) => valor.toLowerCase()),
  papel: papelAdmin,
});

/**
 * Dados pessoais (27.1).
 *
 * `nome_completo` tem `check char_length(btrim(...)) > 0` no banco; o `min(1)`
 * aqui é o que transforma esse `23514` numa mensagem de campo. Cargo é
 * opcional — o protótipo o mostra vazio para quem nunca preencheu.
 */
export const esquemaDadosPessoais = z.object({
  nome: z.string().trim().min(1, { message: 'nome_vazio' }).max(120, { message: 'nome_longo' }),
  cargo: z.string().trim().max(80, { message: 'cargo_longo' }),
});

/**
 * A matriz (27.4).
 *
 * Chega como um par de arrays paralelos — `celula` com `papel:modulo` e
 * `nivel` —, que é como um `FormData` carrega dezesseis `<select>` com nome
 * repetido. Recompor aqui deixa a ação fina e a validação num lugar só.
 */
export const esquemaMatriz = z
  .object({
    celulas: z.array(z.string()),
    niveis: z.array(z.enum([NivelDeAcesso.NENHUM, NivelDeAcesso.LER, NivelDeAcesso.ESCREVER])),
  })
  .superRefine((dados, ctx) => {
    if (dados.celulas.length !== dados.niveis.length) {
      ctx.addIssue({ code: 'custom', message: 'matriz_incompleta', path: ['matriz'] });
      return;
    }
    if (dados.celulas.some((celula) => !celula.includes(':'))) {
      ctx.addIssue({ code: 'custom', message: 'matriz_invalida', path: ['matriz'] });
    }
  });

/**
 * O motivo da decisão, que vai para `log_auditoria`.
 *
 * Opcional na tela: o protótipo não pede motivo em nenhuma das ações de 27.2, e
 * exigi-lo transformaria "Desativar" num formulário. O que existe é o **padrão**
 * — cada ação declara o seu, e ele é melhor que `null` no log.
 */
export const MOTIVO_MAXIMO = 300;

export const esquemaMotivo = z
  .string()
  .trim()
  .max(MOTIVO_MAXIMO, { message: 'motivo_longo' })
  .optional();
