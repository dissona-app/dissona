/**
 * Leitura das variáveis de ambiente, com falha explícita.
 *
 * Falta de variável tem de estourar no boot com o nome da chave, e não virar
 * um `undefined` que só aparece como erro de rede três camadas depois.
 */

function obrigatoria(nome: string, valor: string | undefined): string {
  if (valor === undefined || valor.trim() === '') {
    throw new Error(
      `Variável de ambiente ausente: ${nome}. Copie .env.example para .env.local, ` +
        'ou configure o escopo correspondente na Vercel (ver README.md).',
    );
  }
  return valor;
}

export const ambiente = {
  supabase: {
    get url(): string {
      return obrigatoria('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);
    },
    get chavePublica(): string {
      return obrigatoria(
        'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      );
    },
    /**
     * Chave de serviço — ignora RLS. **Nunca** `NEXT_PUBLIC_`.
     *
     * Getter, e não constante, para a ausência estourar só quando alguém tenta
     * usá-la: a maior parte da aplicação não precisa dela, e um `throw` no boot
     * derrubaria o app inteiro por causa de um caminho que ninguém percorreu.
     */
    get chaveDeServico(): string {
      return obrigatoria('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY);
    },
  },
} as const;

/**
 * O login por SoundCloud está ligado?
 *
 * Não há credencial nossa a ler: o `client_id` e o segredo vivem no provider do
 * Supabase, e o app só pede a URL de autorização. Esta flag existe porque o
 * provider pode não estar configurado — e aí o botão precisa continuar na tela,
 * desabilitado e com o motivo, em vez de levar a pessoa a um erro do GoTrue.
 *
 * Sem prefixo `NEXT_PUBLIC_`: quem decide é o servidor, e os dois lugares que
 * leem isto são Server Components.
 */
export function soundcloudLigado(): boolean {
  return process.env.SOUNDCLOUD_LIGADO === 'true';
}

/**
 * A chave de serviço está configurada?
 *
 * Existe para o que **degrada** em vez de falhar. O caso concreto é a
 * notificação: gravar o alerta de "novo cadastro" para o admin passa pela
 * service role, e não gravá-lo não é razão para o cadastro da pessoa falhar.
 * Quem precisa dela de verdade — o painel de sessões ativas, o convite de
 * admin — chama `chaveDeServico` direto e estoura com o nome da variável.
 */
export function temChaveDeServico(): boolean {
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return chave !== undefined && chave.trim() !== '';
}
