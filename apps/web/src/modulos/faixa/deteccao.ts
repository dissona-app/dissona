import 'server-only';

/**
 * Detecção de faixa por link — Spotify e YouTube, pelo **oEmbed** público.
 *
 * oEmbed, e não a Web API do Spotify nem a Data API do YouTube: as duas APIs
 * completas exigem credencial e cota, e o que a tela 3.1 mostra — capa e
 * título — o oEmbed dá sem chave. O custo é não ter duração nem, no Spotify, o
 * nome do artista; nenhum dos dois é campo da faixa que o artista não possa
 * preencher.
 *
 * A detecção **nunca bloqueia** o envio: o arquivo é sempre obrigatório, e o
 * link é enriquecimento. Qualquer falha — provedor fora do ar, link privado,
 * tempo esgotado — vira `null`, e a tela abre o preenchimento manual.
 */

import { enderecoDoOembed, interpretarOembed } from './servico';
import type { MetadadosDetectados } from './tipos';

/** Acima disto a pessoa já desistiu de esperar; o manual é melhor. */
const TEMPO_MAXIMO_MS = 5000;

export async function detectarPorLink(link: string): Promise<MetadadosDetectados | null> {
  const endereco = enderecoDoOembed(link);
  if (endereco === null) return null;

  try {
    const resposta = await fetch(endereco, {
      signal: AbortSignal.timeout(TEMPO_MAXIMO_MS),
      cache: 'no-store',
      // O host já foi conferido em `enderecoDoOembed`; um redirect para outro
      // lugar não é seguido. `manual`, e não `error`: o `fetch` do Cloudflare
      // Workers só aceita `follow` e `manual`, e com `error` a chamada lançava
      // — a detecção falhava calada. Um 3xx não é `ok`, e cai no `null` abaixo.
      redirect: 'manual',
      headers: { accept: 'application/json' },
    });
    if (!resposta.ok) return null;
    return interpretarOembed(link, await resposta.json());
  } catch {
    return null;
  }
}
