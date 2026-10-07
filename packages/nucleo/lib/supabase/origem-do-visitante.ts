/**
 * Os cabeçalhos do **visitante** que o Supabase Auth precisa ver.
 *
 * O login roda no servidor (Server Action), e não no navegador. Sem isto o
 * GoTrue registrava a sessão com o `User-Agent` do processo — `node` — e o IP
 * do servidor, e o painel "Sessões ativas" mostrava toda sessão como
 * "Dispositivo não identificado", com o IP da hospedagem.
 *
 * O IP vem do cabeçalho da borda: `cf-connecting-ip` no Cloudflare,
 * `x-real-ip` ou o primeiro de `x-forwarded-for` nos outros casos.
 *
 * Função pura sobre um leitor de cabeçalhos, para servir ao middleware
 * (`NextRequest.headers`) e ao servidor (`headers()`).
 */
export function cabecalhosDoVisitante(cabecalhos: {
  get(nome: string): string | null;
}): Record<string, string> {
  const saida: Record<string, string> = {};

  const agente = cabecalhos.get('user-agent');
  if (agente !== null && agente !== '') saida['user-agent'] = agente;

  const ip =
    cabecalhos.get('cf-connecting-ip') ??
    cabecalhos.get('x-real-ip') ??
    cabecalhos.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    null;
  if (ip !== null && ip !== '') saida['x-forwarded-for'] = ip;

  return saida;
}
