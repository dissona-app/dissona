import { z } from 'zod';

import { senhaAtendePolitica } from '@/lib/senha';

/**
 * Validação das trocas de credencial e da exclusão de conta.
 *
 * Mensagens como códigos, como no resto do projeto. A senha **atual** nunca
 * passa pela política: ela já existe, e aplicar a regra nova a ela diria a quem
 * tem senha antiga curta que ela "é inválida" — quando o problema seria só que
 * a política mudou.
 */

const senhaAtual = z.string().min(1, { message: 'senha_atual_vazia' });

export const esquemaTrocaDeSenha = z
  .object({
    senhaAtual,
    senha: z.string().refine(senhaAtendePolitica, { message: 'senha_fraca' }),
    confirmar: z.string().min(1, { message: 'confirmar_vazio' }),
  })
  .refine((dados) => dados.senha === dados.confirmar, {
    message: 'senhas_diferentes',
    path: ['confirmar'],
  });

export const esquemaTrocaDeEmail = z.object({
  senhaAtual,
  email: z
    .string()
    .trim()
    .min(1, { message: 'email_vazio' })
    .pipe(z.email({ message: 'email_invalido' }))
    .transform((valor) => valor.toLowerCase()),
});

/**
 * A palavra que confirma a exclusão.
 *
 * Literal, e sensível à caixa — é o que o protótipo pede (`placeholder="EXCLUIR"`)
 * e é o ponto do controle: digitar seis letras maiúsculas é deliberado de um
 * jeito que clicar não é. Aceitar "excluir" minúsculo enfraqueceria isso sem
 * ganhar nada.
 */
export const PALAVRA_DE_EXCLUSAO = 'EXCLUIR';

export const esquemaExclusao = z.object({
  senhaAtual,
  confirmacao: z.literal(PALAVRA_DE_EXCLUSAO, { message: 'palavra_incorreta' }),
});

export const esquemaSessao = z.object({
  sessaoId: z.uuid({ message: 'sessao_invalida' }),
});
