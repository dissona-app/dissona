import { z } from 'zod';

import { senhaAtendePolitica } from '@/lib/senha';

/**
 * Credenciais das telas 1 e 19.
 *
 * As mensagens são **códigos**, não texto: `email_vazio`, não "Informe seu
 * e-mail.". A View traduz (architecture.md §8), e é o que permite a mesma
 * validação servir ao login do artista e ao do admin, que têm copy diferente
 * para a mesma falha — o protótipo diz "A senha é obrigatória." num e "Informe
 * sua senha." no outro.
 */

const email = z
  .string()
  .trim()
  .min(1, { message: 'email_vazio' })
  // O protótipo valida por `validEmail`, um regex simples. `z.email()` é mais
  // rigoroso, e ser mais rigoroso aqui só rejeita endereço que o Supabase Auth
  // também rejeitaria — com a diferença de rejeitar antes da ida ao servidor.
  .pipe(z.email({ message: 'email_invalido' }))
  .transform((valor) => valor.toLowerCase());

export const esquemaCredenciais = z.object({
  email,
  // Sem `min(8)` no **login**: a política de senha (≥8 com número,
  // architecture.md §5.3) vale no cadastro e na redefinição. Aplicá-la aqui
  // diria a quem tem senha antiga curta que a senha "é inválida", quando o
  // problema é que ela está errada — ou pior, revelaria o formato da senha
  // aceita.
  senha: z.string().min(1, { message: 'senha_vazia' }),
  /** Para onde voltar depois de entrar. Preenchido pela guarda de rota. */
  proximo: z.string().optional(),
});

export type Credenciais = z.infer<typeof esquemaCredenciais>;

/**
 * Cadastro — tela 1.1.
 *
 * Aqui a política de senha **vale**, ao contrário do login: é o momento em que
 * ela é escolhida. A regra vem de `lib/senha.ts`, o mesmo módulo que alimenta o
 * medidor de força da tela — se fossem duas implementações, o formulário
 * mostraria "Senha forte" e recusaria o envio.
 *
 * O aceite é `z.literal('on')` porque é o que um checkbox HTML manda quando
 * marcado; desmarcado, ele simplesmente não vai no `FormData`, e o `literal`
 * falha com o código certo. Validar o aceite no servidor não é formalidade: ele
 * é obrigação de LGPD (RF-010), e o `perfil.aceite_termos_em` só é gravado
 * porque este campo passou.
 */
/**
 * O papel escolhido em 1.4 — ou, nas rotas exclusivas por perfil (`/artista/*`,
 * `/curador/*`), já no cadastro. Compartilhado pelos dois schemas para não
 * duplicar a lista de valores.
 */
export const esquemaPapel = z.enum(['artista', 'curador'], { message: 'papel_invalido' });

export const esquemaCadastro = z
  .object({
    nome: z.string().trim().min(1, { message: 'nome_vazio' }),
    email,
    senha: z.string().refine(senhaAtendePolitica, { message: 'senha_fraca' }),
    confirmar: z.string().min(1, { message: 'confirmar_vazio' }),
    aceite: z.literal('on', { message: 'aceite_obrigatorio' }).transform(() => true),
    // Ausente em `/cadastrar`: o papel só é conhecido nas rotas exclusivas por
    // perfil, e quem não o envia continua indo para `/selecao-de-perfil`.
    papel: esquemaPapel.optional(),
  })
  // O `path` põe o erro no campo de confirmação, e não no de senha: quem digita
  // diferente errou a repetição, não a senha.
  .refine((dados) => dados.senha === dados.confirmar, {
    message: 'senhas_diferentes',
    path: ['confirmar'],
  });

export type Cadastro = z.infer<typeof esquemaCadastro>;

/** Só o e-mail — recuperação de senha (1.2) e reenvio da verificação. */
export const esquemaEmail = z.object({ email });

/**
 * Nova senha e confirmação — redefinição (1.3 / 19.2) e troca em Conta.
 *
 * Não tem `senhaAtual`: quem chega pelo link do e-mail já provou a posse da
 * caixa, e exigir a senha atual de quem esqueceu a senha é o que o fluxo existe
 * para evitar. A troca em Conta acrescenta a reautenticação por cima deste
 * schema.
 */
export const esquemaNovaSenha = z
  .object({
    senha: z.string().refine(senhaAtendePolitica, { message: 'senha_fraca' }),
    confirmar: z.string().min(1, { message: 'confirmar_vazio' }),
  })
  .refine((dados) => dados.senha === dados.confirmar, {
    message: 'senhas_diferentes',
    path: ['confirmar'],
  });

/**
 * Colhe **todos** os erros de campo de um `safeParse`, e não só o primeiro.
 *
 * `issues` pode trazer mais de um problema para o mesmo campo; o primeiro por
 * campo é o que a tela mostra, e é o mais específico porque o Zod avalia na
 * ordem em que o schema declara.
 */
export function motivosPorCampo(issues: readonly z.core.$ZodIssue[]): Record<string, string> {
  const motivos: Record<string, string> = {};

  for (const issue of issues) {
    const campo = issue.path[0];
    if (typeof campo !== 'string') continue;
    if (campo in motivos) continue;
    motivos[campo] = issue.message;
  }

  return motivos;
}

/**
 * Destino pós-login, validado.
 *
 * Só caminho relativo começando com uma barra, e **nunca** `//`. Sem isto,
 * `?proximo=https://exemplo.invalido` faz o nosso login redirecionar para
 * fora — *open redirect* clássico, e especialmente caro numa tela de login,
 * onde a página de destino pode pedir a senha de novo com cara de nossa.
 */
export function destinoSeguro(proximo: string | undefined, padrao: string): string {
  if (proximo === undefined) return padrao;
  if (!proximo.startsWith('/')) return padrao;
  if (proximo.startsWith('//')) return padrao;
  return proximo;
}

/**
 * O papel escolhido em 1.4.
 *
 * `enum` e não `string`: o `FormData` vem do cliente, e `admin` num campo
 * escondido forjado chegaria ao banco. A policy o recusaria — é o que a `0001`
 * garante —, mas com `42501` no lugar de uma mensagem, e um erro de
 * autorização onde devia haver uma validação de entrada.
 */
export const esquemaPapelEscolhivel = z.object({
  papel: esquemaPapel,
});

/** Os três provedores. O SoundCloud só chega aqui com a flag ligada. */
export const esquemaProvedorSocial = z.object({
  provedor: z.enum(['google', 'facebook', 'soundcloud'], { message: 'provedor_invalido' }),
  proximo: z.string().optional(),
});

/**
 * Confirmação do cadastro social — nome, aceite e, às vezes, o e-mail.
 *
 * A tela tem dois modos, e o schema serve aos dois. Com Google e Facebook o
 * endereço vem do provedor e é **exibido**, não editado: torná-lo editável
 * abriria a porta para confirmar a conta com um endereço que a pessoa não
 * provou possuir. Com SoundCloud não vem endereço nenhum — a API deles não
 * expõe e-mail — e aí o campo existe e é obrigatório.
 *
 * Obrigatório **no serviço**, não aqui: quem sabe se a sessão já tem e-mail é
 * quem tem a sessão na mão. Um schema que exigisse o campo sempre quebraria o
 * caminho do Google; um que nunca o exigisse deixaria passar conta sem
 * endereço. Por isso ele é opcional na forma e exigido no lugar que pode
 * decidir.
 */
const emailOpcional = z
  .string()
  .trim()
  .optional()
  // Campo em branco e campo ausente são a mesma coisa aqui: "não informou".
  .transform((valor) => (valor === undefined || valor === '' ? undefined : valor.toLowerCase()))
  .pipe(z.email({ message: 'email_invalido' }).optional());

export const esquemaConfirmacaoSocial = z.object({
  nome: z.string().trim().min(1, { message: 'nome_vazio' }),
  aceite: z.literal('on', { message: 'aceite_obrigatorio' }).transform(() => true),
  email: emailOpcional,
});
