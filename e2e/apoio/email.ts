import { clienteDeServico } from './banco';

/**
 * Os links que normalmente chegariam por e-mail.
 *
 * ## O problema
 *
 * Verificação de e-mail (RF-004), recuperação de senha (RF-005) e a do admin
 * (RF-029) só acontecem de verdade quando alguém **abre o link**. Sem caixa de
 * entrada, os três ficariam provados pela metade: dá para afirmar que a tela
 * diz "enviamos um e-mail", e nada além disso.
 *
 * ## A saída, e por que ela não é uma encenação
 *
 * `auth.admin.generateLink` produz **o mesmo token** que o e-mail carregaria,
 * sem enviar nada. O teste monta a URL que o template monta e navega até ela —
 * passando pelo mesmo route handler (`/api/auth/confirmar`), pela mesma troca
 * de token, pelo mesmo redirecionamento. O que é substituído é o **transporte**,
 * não o mecanismo: o formulário continua sendo submetido de verdade, e o token
 * é um objeto real do GoTrue, com a mesma validade e o mesmo uso único.
 *
 * ## E resolve o limite de envio, de quebra
 *
 * O SMTP embutido do Supabase entrega cerca de dois e-mails por hora
 * (BACKLOG.md). Um punhado de cenários de autenticação estouraria isso na
 * primeira execução, e a suíte passaria a falhar com `over_email_send_rate_limit`
 * de forma intermitente — o pior tipo de vermelho, porque some sozinho. Gerando
 * o link, a suíte envia **zero** e-mails.
 *
 * O que fica de fora, e está registrado na matriz: que o e-mail de fato sai,
 * chega e tem o link certo. Isso depende de provedor transacional dedicado
 * (open-questions #10) e não é observável daqui.
 */

export type TipoDeLink = 'signup' | 'recovery';

export type LinkDeEmail = {
  /** O `token_hash` que o template do e-mail interpola. */
  readonly tokenHash: string;
  /** O caminho a visitar, já montado como o e-mail o montaria. */
  readonly caminho: string;
};

/**
 * Gera o link e devolve o caminho pronto.
 *
 * `signup` funciona tanto para conta nova quanto para conta existente ainda não
 * confirmada — que é o estado real de quem acabou de se cadastrar e quer o
 * reenvio. Para conta nova, a senha é obrigatória, porque é o momento em que a
 * conta nasce.
 */
export async function gerarLinkDeEmail(
  tipo: TipoDeLink,
  email: string,
  opcoes?: { readonly senha?: string; readonly proximo?: string },
): Promise<LinkDeEmail> {
  const { data, error } = await clienteDeServico().auth.admin.generateLink(
    tipo === 'signup'
      ? { type: 'signup', email, password: opcoes?.senha ?? '' }
      : { type: 'recovery', email },
  );

  if (error !== null) {
    throw new Error(`gerar link "${tipo}" para ${email}: ${error.message}`);
  }

  const tokenHash = data.properties.hashed_token;
  const parametros = new URLSearchParams({ token_hash: tokenHash, type: tipo });
  if (opcoes?.proximo !== undefined) parametros.set('proximo', opcoes.proximo);

  return { tokenHash, caminho: `/api/auth/confirmar?${parametros.toString()}` };
}

/** O mesmo caminho, para um token que o teste já tem em mãos. */
export function caminhoDoToken(tokenHash: string, tipo: TipoDeLink): string {
  return `/api/auth/confirmar?${new URLSearchParams({ token_hash: tokenHash, type: tipo }).toString()}`;
}
