import { z } from 'zod';

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
