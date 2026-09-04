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
  },
} as const;
