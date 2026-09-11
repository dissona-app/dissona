import 'server-only';

/**
 * A origem absoluta desta requisição — `https://host`, sem barra final.
 *
 * Necessária para montar `emailRedirectTo` e `redirectTo`: o Supabase Auth
 * precisa de URL absoluta, e o link do e-mail sai quebrado sem ela.
 *
 * Vem do cabeçalho, e não de uma variável de ambiente, porque o mesmo build
 * atende a três origens diferentes — `localhost:3000`, o domínio de Preview da
 * Vercel (que muda a cada branch) e o de produção. Uma variável fixa mandaria o
 * link de um Preview para produção, o que é pior que quebrado: parece
 * funcionar.
 *
 * ⚠️ Toda origem usada aqui tem de estar nas **Redirect URLs** do Supabase
 * Auth, senão o Auth recusa o redirecionamento. É o item da R0 que a fatia de
 * autenticação depende.
 */

import { headers } from 'next/headers';

export async function origemDaRequisicao(): Promise<string> {
  const cabecalhos = await headers();

  // `origin` é o caminho direto, e existe em toda navegação de documento.
  const origin = cabecalhos.get('origin');
  if (origin !== null && origin !== '') return origin.replace(/\/$/, '');

  // Atrás do proxy da Vercel, `host` já é o domínio público e
  // `x-forwarded-proto` diz o esquema. Sem o proxy (dev), `host` é
  // `localhost:3000` e o esquema é `http`.
  const host = cabecalhos.get('x-forwarded-host') ?? cabecalhos.get('host');
  if (host === null || host === '') {
    throw new Error(
      'Não foi possível determinar a origem da requisição: nem `origin` nem `host` ' +
        'chegaram nos cabeçalhos.',
    );
  }

  const esquema =
    cabecalhos.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');

  return `${esquema}://${host}`;
}
