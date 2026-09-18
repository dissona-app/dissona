import { apagarObjetosDaPasta, BALDES_DO_EXPURGO } from './storage.ts';

/**
 * Job diário do expurgo (LGPD) — a metade que o SQL não alcança.
 *
 * `expurgar_contas_excluidas()` (migration `0011`) **anonimiza** as linhas:
 * zera nome, handle, foto, cidade, dados de cobrança e chave Pix, e preserva o
 * que tem retenção fiscal. O que ela não consegue fazer é apagar os **objetos
 * de Storage**, porque SQL não fala com a Storage API — e era isso que ficava
 * para trás: até esta função existir, a foto, os áudios e as exportações de uma
 * conta excluída continuavam no bucket indefinidamente.
 *
 * ## A ordem importa, e é esta
 *
 * 1. lista quem está elegível, com o mesmo critério da função SQL;
 * 2. apaga a pasta `<perfilId>/` de `avatares`, `faixas` e `exportacoes`;
 * 3. chama a RPC, que anonimiza.
 *
 * Inverter perderia o alvo: depois de anonimizar, `situacao` vira `excluida` e
 * as linhas deixam de casar com o critério — não haveria como saber de quem
 * eram os objetos. Apagar antes é seguro no outro sentido: se a RPC falhar
 * depois, a conta continua elegível e a próxima execução termina o serviço. O
 * contrário (anonimizar e falhar ao apagar) deixaria lixo que ninguém mais
 * encontra.
 *
 * ## Por que a pasta inteira, e não `foto_caminho`
 *
 * As policies dos buckets (`0000_storage`) exigem que todo objeto comece com
 * `<auth.uid()>/`, e `perfil.id` **é** o `auth.users.id`. A pasta é, portanto, o
 * conjunto completo do que aquela conta subiu — inclusive o que uma coluna
 * desatualizada não apontaria mais.
 *
 * ## Autenticação
 *
 * Quem chama é o `pg_cron` do nosso projeto, por `pg_net`, apresentando a
 * **service role key** no `Authorization`. A função compara com a sua própria
 * `SUPABASE_SERVICE_ROLE_KEY` antes de qualquer leitura.
 *
 * Usar a service key como credencial — em vez de um segredo só dela — é
 * deliberado: ela é injetada automaticamente no ambiente da função, então não
 * há um terceiro segredo para alguém esquecer de configurar, e o Vault guarda
 * uma chave em vez de duas. `verify_jwt` continua ligado, e é a primeira
 * peneira: o gateway recusa quem não apresenta credencial nenhuma antes de este
 * código rodar.
 *
 * ⚠️ **Não basta o gateway.** Com `verify_jwt`, qualquer credencial válida do
 * projeto passa por ele — inclusive a de uma pessoa logada. Quem separa "é do
 * projeto" de "é o cron" é a comparação aqui dentro. Um expurgo aberto a
 * qualquer sessão autenticada seria um botão de apagar dados de terceiros.
 */

const TEMPO_LIMITE_MS = 60_000;

function json(corpo: unknown, estado: number): Response {
  return new Response(JSON.stringify(corpo), {
    status: estado,
    headers: { 'Content-Type': 'application/json' },
  });
}

type PerfilElegivel = { readonly id: string };

/**
 * A credencial apresentada é a service role key deste projeto?
 *
 * Comparação de tempo constante: um `===` sobre segredo vaza, pelo tempo de
 * resposta, quantos caracteres iniciais o palpite acertou. É barato fazer
 * certo, e caro descobrir que não se fez.
 */
function ehOCron(autorizacao: string | null, chave: string): boolean {
  const apresentada = (autorizacao ?? '').replace(/^Bearer\s+/i, '');
  if (apresentada.length !== chave.length) return false;

  let diferenca = 0;
  for (let i = 0; i < chave.length; i += 1) {
    diferenca |= apresentada.charCodeAt(i) ^ chave.charCodeAt(i);
  }
  return diferenca === 0;
}

Deno.serve(async (requisicao: Request): Promise<Response> => {
  if (requisicao.method !== 'POST') return json({ erro: 'metodo_nao_permitido' }, 405);

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const chave = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  // Fail-closed: sem configuração não se apaga nada, e o 503 diz que o
  // problema é nosso, não de quem chamou.
  if (url === '' || chave === '') return json({ erro: 'nao_configurado' }, 503);

  if (!ehOCron(requisicao.headers.get('Authorization'), chave)) {
    return json({ erro: 'nao_autorizado' }, 401);
  }

  const cabecalhos = {
    apikey: chave,
    Authorization: `Bearer ${chave}`,
    'Content-Type': 'application/json',
  };

  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);

  try {
    // O mesmo critério da função SQL: desativada há mais de `lgpd.dias_expurgo`.
    // O prazo vem de `configuracao`, nunca de um número aqui.
    const configuracao = await fetch(
      `${url}/rest/v1/configuracao?chave=eq.lgpd.dias_expurgo&select=valor`,
      { headers: cabecalhos, signal: controle.signal },
    );
    const linhas = (await configuracao.json()) as readonly { readonly valor: unknown }[];
    const dias = Number(linhas[0]?.valor);
    if (!Number.isFinite(dias)) return json({ erro: 'configuracao_ausente' }, 500);

    const corte = new Date(Date.now() - dias * 86_400_000).toISOString();
    const elegiveis = await fetch(
      `${url}/rest/v1/perfil?situacao=eq.desativada&desativada_em=lte.${corte}` +
        `&select=id&order=desativada_em.asc&limit=200`,
      { headers: cabecalhos, signal: controle.signal },
    );
    const perfis = (await elegiveis.json()) as readonly PerfilElegivel[];

    let objetos = 0;
    for (const perfil of perfis) {
      for (const balde of BALDES_DO_EXPURGO) {
        objetos += await apagarObjetosDaPasta(url, cabecalhos, balde, perfil.id, controle.signal);
      }
    }

    // Só depois de os objetos saírem. A RPC é `security definer` e revogada de
    // `authenticated`: quem a alcança é a service role, e é por isso que este
    // job precisa dela.
    const anonimizacao = await fetch(`${url}/rest/v1/rpc/expurgar_contas_excluidas`, {
      method: 'POST',
      headers: cabecalhos,
      body: JSON.stringify({ p_limite: 200 }),
      signal: controle.signal,
    });

    if (!anonimizacao.ok) {
      return json({ erro: 'anonimizacao_falhou', estado: anonimizacao.status }, 502);
    }

    const contas = (await anonimizacao.json()) as number;
    return json({ contas, objetos }, 200);
  } catch (erro) {
    const motivo = erro instanceof Error && erro.name === 'AbortError' ? 'tempo_limite' : 'falha';
    return json({ erro: motivo }, 504);
  } finally {
    clearTimeout(relogio);
  }
});
