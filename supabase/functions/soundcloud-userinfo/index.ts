import { paraUserinfo } from './userinfo.ts';

/**
 * Endpoint de `userinfo` do provider `custom:soundcloud`.
 *
 * Quem chama aqui **não é o navegador**: é o GoTrue, server-to-server, logo
 * depois de trocar o `code` por token no SoundCloud. Ele faz um GET com
 * `Authorization: Bearer <access_token do SoundCloud>` — confirmado no fonte
 * deles, em `makeRequest`, que usa o client do `oauth2` e anexa o header — e
 * decodifica a resposta como JSON.
 *
 * Nós repassamos esse mesmo token ao `/me` do SoundCloud e devolvemos o que o
 * `userinfo.ts` traduz. A função é um tradutor sem estado: não guarda token,
 * não tem banco, não conhece usuário nosso.
 *
 * ## Por que `verify_jwt: false`
 *
 * O bearer que chega é do SoundCloud, não um JWT do Supabase. Com a verificação
 * ligada, o gateway recusaria a chamada com 401 antes deste código rodar, e o
 * login falharia com um erro que não diz nada. A autenticação real é a do
 * próprio SoundCloud: sem um token válido deles, o `/me` não responde e nós não
 * devolvemos nada.
 *
 * ## O que isto deliberadamente não faz
 *
 * Não aceita token por query string — só pelo header, porque query string vaza
 * em log de acesso. E a URL de destino é literal: não há parâmetro que redirecione
 * a chamada para outro host, que seria um SSRF de graça.
 */

const ME_DO_SOUNDCLOUD = 'https://api.soundcloud.com/me';
const TEMPO_LIMITE_MS = 8_000;

function json(corpo: unknown, estado: number): Response {
  return new Response(JSON.stringify(corpo), {
    status: estado,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (requisicao: Request): Promise<Response> => {
  if (requisicao.method !== 'GET') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  const autorizacao = requisicao.headers.get('Authorization');
  if (autorizacao === null || !autorizacao.startsWith('Bearer ')) {
    return json({ error: 'unauthorized' }, 401);
  }

  let resposta: Response;
  try {
    resposta = await fetch(ME_DO_SOUNDCLOUD, {
      headers: { Authorization: autorizacao, Accept: 'application/json' },
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    });
  } catch {
    // Timeout ou rede: 502, porque o defeito não é de quem está entrando.
    return json({ error: 'bad_gateway' }, 502);
  }

  // O status deles é o nosso, nos casos que têm significado próprio.
  //
  // 429 está aqui porque foi o que o SoundCloud devolveu no teste com token
  // inválido — e não 401, como seria de esperar. Traduzir isso para 502
  // esconderia um limite de taxa atrás de "o gateway falhou", que é o
  // diagnóstico errado para quem for investigar um login que parou de
  // funcionar. 403 vira 401: para o GoTrue, token que não autoriza é token que
  // não vale.
  if (resposta.status === 401 || resposta.status === 403) {
    return json({ error: 'unauthorized' }, 401);
  }
  if (resposta.status === 429) return json({ error: 'rate_limited' }, 429);
  if (!resposta.ok) return json({ error: 'bad_gateway' }, 502);

  let corpo: unknown;
  try {
    corpo = await resposta.json();
  } catch {
    return json({ error: 'bad_gateway' }, 502);
  }

  const userinfo = paraUserinfo(corpo);

  // Sem `sub` não adianta responder 200: o GoTrue aborta com "missing provider
  // id", e o erro chega à pessoa como um `server_error` sem explicação. Falhar
  // aqui deixa o motivo no log desta função.
  if (userinfo === null) return json({ error: 'sem_identificador' }, 502);

  return json(userinfo, 200);
});
