import { describe, expect, it, vi } from 'vitest';

import { apagarObjetosDaPasta, BALDES_DO_EXPURGO } from '../storage';

/**
 * A metade do expurgo que sai do banco.
 *
 * O que se prova aqui é a regra que erra em silêncio: a listagem devolve nomes
 * **relativos** à pasta, e mandar o nome puro para a remoção apagaria o objeto
 * errado — ou nenhum — sem levantar erro.
 */

const CABECALHOS = { apikey: 'k', Authorization: 'Bearer k', 'Content-Type': 'application/json' };
const SINAL = new AbortController().signal;

function respostas(
  listados: readonly { readonly name: string }[],
  remocaoOk = true,
): ReturnType<typeof vi.fn> {
  return vi.fn(async (_url: string, opcoes: RequestInit) =>
    opcoes.method === 'DELETE'
      ? new Response('[]', { status: remocaoOk ? 200 : 400 })
      : new Response(JSON.stringify(listados), { status: 200 }),
  );
}

describe('apagarObjetosDaPasta', () => {
  it('remove pelo caminho completo, e não pelo nome solto', async () => {
    const buscar = respostas([{ name: 'perfil.jpg' }]);
    vi.stubGlobal('fetch', buscar);

    const quantos = await apagarObjetosDaPasta(
      'https://projeto.supabase.co',
      CABECALHOS,
      'avatares',
      'uid-1',
      SINAL,
    );

    expect(quantos).toBe(1);

    const remocao = buscar.mock.calls.find(([, opcoes]) => opcoes.method === 'DELETE');
    expect(JSON.parse(remocao?.[1].body as string)).toEqual({ prefixes: ['uid-1/perfil.jpg'] });

    vi.unstubAllGlobals();
  });

  it('pasta vazia não chama a remoção', async () => {
    const buscar = respostas([]);
    vi.stubGlobal('fetch', buscar);

    expect(
      await apagarObjetosDaPasta('https://p.supabase.co', CABECALHOS, 'faixas', 'uid-2', SINAL),
    ).toBe(0);
    expect(buscar.mock.calls.some(([, opcoes]) => opcoes.method === 'DELETE')).toBe(false);

    vi.unstubAllGlobals();
  });

  it('remoção recusada não conta como apagada', async () => {
    // Contar assim mesmo faria o job relatar sucesso sobre objeto que ficou.
    vi.stubGlobal('fetch', respostas([{ name: 'faixa.mp3' }], false));

    expect(
      await apagarObjetosDaPasta('https://p.supabase.co', CABECALHOS, 'faixas', 'uid-3', SINAL),
    ).toBe(0);

    vi.unstubAllGlobals();
  });

  it('os buckets do expurgo são os três que a conta escreve', () => {
    // `capas` e `materiais` ficam de fora de propósito — ver o comentário da
    // constante. Este teste existe para que sair ou entrar um bucket seja uma
    // decisão, e não um descuido.
    expect([...BALDES_DO_EXPURGO]).toEqual(['avatares', 'faixas', 'exportacoes']);
  });
});
