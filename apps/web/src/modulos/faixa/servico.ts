/**
 * Regra do envio (módulo 3).
 *
 * **Puro** — sem `server-only`, sem Supabase, sem importar o repositório.
 * Quem orquestra é `acoes.ts`.
 */

import { z } from 'zod';

import { normalizarLink } from '@dissona/nucleo/lib/link';

import type {
  FaixaEmEdicao,
  LimitesDeUpload,
  MetadadosDetectados,
  PassoDoEnvio,
  ProvedorDeLink,
} from './tipos';

/** MIME aceitos por extensão configurada. O navegador varia o rótulo do wav. */
const MIME_POR_FORMATO: Readonly<Record<string, readonly string[]>> = {
  mp3: ['audio/mpeg', 'audio/mp3'],
  wav: ['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave'],
};

export type FalhaDoArquivo = 'ausente' | 'formato' | 'tamanho';

/**
 * Valida o arquivo de áudio contra `configuracao`.
 *
 * Roda **no servidor**, sempre. O `accept` do `<input>` é conveniência: ele
 * filtra o seletor de arquivos e nada mais — arrastar outro arquivo, ou um
 * POST montado à mão, passa por ele sem obstáculo.
 *
 * O tipo é conferido pelo MIME e não pela extensão do nome: o nome vem do
 * cliente e renomear `.exe` para `.mp3` é trivial.
 */
export function validarAudio(
  arquivo: File | null,
  limites: LimitesDeUpload,
): FalhaDoArquivo | null {
  if (arquivo === null || arquivo.size === 0) return 'ausente';
  return conferir(arquivo.size, arquivo.type, limites);
}

/**
 * A mesma regra, sobre o que o **Storage** diz de um objeto já gravado.
 *
 * É o caminho do upload direto do navegador (RF-036): o arquivo nunca passa
 * pelo servidor Next, e o que a ação recebe é um caminho. Quem responde tamanho
 * e MIME é o Storage, não o formulário — a validação continua fora do alcance
 * de quem monta o POST à mão.
 *
 * `null` como objeto significa "não existe, ou não é seu": a RLS de `0000_storage`
 * esconde a pasta alheia, e os dois casos pedem a mesma resposta.
 */
export function validarAudioNoStorage(
  objeto: { readonly tamanhoBytes: number; readonly mime: string } | null,
  limites: LimitesDeUpload,
): FalhaDoArquivo | null {
  if (objeto === null || objeto.tamanhoBytes === 0) return 'ausente';
  return conferir(objeto.tamanhoBytes, objeto.mime, limites);
}

function conferir(
  tamanhoBytes: number,
  mime: string,
  limites: LimitesDeUpload,
): FalhaDoArquivo | null {
  const aceitos = limites.formatos.flatMap((formato) => MIME_POR_FORMATO[formato] ?? []);
  if (!aceitos.includes(mime)) return 'formato';

  if (tamanhoBytes > limites.tamanhoMaxMb * 1024 * 1024) return 'tamanho';

  return null;
}

/**
 * Até onde a faixa já chegou no wizard.
 *
 * Derivado dos campos, e não de uma coluna de progresso: cada passo tem campo
 * obrigatório próprio, então a presença dele **é** a conclusão do passo. Quem
 * abre `/revisao` sem contexto é devolvido para `/contexto`.
 */
export function passoAlcancado(faixa: FaixaEmEdicao): PassoDoEnvio {
  if (faixa.arquivoCaminho === null || faixa.titulo.trim() === '') return 'faixa';
  if (faixa.genero === null || (faixa.contextoCurador ?? '').trim() === '') return 'contexto';
  return 'revisao';
}

/** O passo pedido é alcançável? Adiantar-se no wizard não pode. */
export function podeAbrir(faixa: FaixaEmEdicao, passo: PassoDoEnvio): boolean {
  const ordem: readonly PassoDoEnvio[] = ['faixa', 'contexto', 'revisao'];
  return ordem.indexOf(passo) <= ordem.indexOf(passoAlcancado(faixa));
}

/**
 * Rótulo da fonte, para a revisão (passo 3).
 *
 * Três formas no protótipo — arquivo, link detectado e preenchido à mão. Com a
 * decisão de **sempre** exigir o arquivo, "link" passa a significar "o link
 * trouxe os metadados", e não "a faixa toca do streaming".
 */
export function rotuloDaFonte(faixa: FaixaEmEdicao): 'arquivo' | 'link' | 'manual' {
  if (faixa.origem === 'link') return faixa.metadadosDetectados !== null ? 'link' : 'manual';
  return faixa.arquivoCaminho !== null ? 'arquivo' : 'manual';
}

// ---------------------------------------------------------------------------
// Detecção por link (3.1)
// ---------------------------------------------------------------------------

/**
 * O provedor de um link, **pelo host** — nunca por `includes` no texto.
 *
 * `evil.com/?spotify.com` casaria com uma regex solta, e a URL seguiria para o
 * `fetch` do servidor. O host tem de ser exatamente o do provedor, e o esquema
 * tem de ser https: é isso que impede a detecção de virar um proxy para
 * endereço arbitrário (SSRF).
 */
export function provedorDoLink(link: string): ProvedorDeLink | null {
  let url: URL;
  try {
    url = new URL(normalizarLink(link));
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;

  const host = url.hostname.toLowerCase();
  if (host === 'open.spotify.com') return 'spotify';
  if (
    ['www.youtube.com', 'youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'].includes(
      host,
    )
  ) {
    return 'youtube';
  }
  return null;
}

/** O endpoint oEmbed do provedor para o link. Nenhum dos dois exige chave. */
export function enderecoDoOembed(link: string): string | null {
  const provedor = provedorDoLink(link);
  if (provedor === null) return null;

  const alvo = encodeURIComponent(normalizarLink(link));
  return provedor === 'spotify'
    ? `https://open.spotify.com/oembed?url=${alvo}`
    : `https://www.youtube.com/oembed?format=json&url=${alvo}`;
}

const esquemaOembed = z.object({
  title: z.string().trim().min(1),
  author_name: z.string().trim().min(1).optional(),
  thumbnail_url: z.url({ protocol: /^https$/ }).optional(),
});

/**
 * Traduz a resposta oEmbed para o domínio. `null` quando ela não traz título —
 * sem título não há o que mostrar como "Faixa encontrada".
 */
export function interpretarOembed(link: string, carga: unknown): MetadadosDetectados | null {
  const provedor = provedorDoLink(link);
  const analise = esquemaOembed.safeParse(carga);
  if (provedor === null || !analise.success) return null;

  return {
    provedor,
    url: normalizarLink(link),
    titulo: analise.data.title,
    artista: analise.data.author_name ?? null,
    capaUrl: analise.data.thumbnail_url ?? null,
  };
}

const esquemaMetadados = z.object({
  provedor: z.enum(['spotify', 'youtube']),
  url: z.string(),
  titulo: z.string().min(1),
  artista: z.string().nullable(),
  capaUrl: z.url({ protocol: /^https$/ }).nullable(),
});

/**
 * Lê `metadados_detectados` — do banco ou do campo escondido do formulário.
 *
 * O formulário devolve o que a detecção trouxe, e isso é entrada do cliente:
 * a URL tem de apontar para um provedor suportado, ou o valor é descartado.
 */
export function lerMetadados(valor: unknown): MetadadosDetectados | null {
  let bruto = valor;
  if (typeof valor === 'string') {
    if (valor.trim() === '') return null;
    try {
      bruto = JSON.parse(valor);
    } catch {
      return null;
    }
  }
  const analise = esquemaMetadados.safeParse(bruto);
  if (!analise.success || provedorDoLink(analise.data.url) !== analise.data.provedor) return null;
  return analise.data;
}
