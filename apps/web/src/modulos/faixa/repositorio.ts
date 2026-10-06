import 'server-only';

/**
 * Único ponto que toca `faixa` e os buckets `faixas` e `capas`.
 *
 * A RLS restringe tudo ao dono (`perfil_artista_id = meu_perfil_artista_id()`),
 * e o trigger `faixa_conteudo_congelado_em_curadoria` recusa alteração de
 * conteúdo fora de `rascunho` — então o repositório não repete a checagem de
 * situação: ele a deixa estourar como `DS013`, que a View traduz.
 */

import { CodigoErro, falhar } from '@dissona/nucleo/lib/erros';
import {
  metadadosDoObjeto as lerMetadadosDoObjeto,
  type ObjetoNoStorage,
} from '@dissona/nucleo/lib/supabase/armazenamento';
import { estourarSeErro } from '@dissona/nucleo/lib/supabase/erros';
import { criarClienteServidor } from '@dissona/nucleo/lib/supabase/servidor';
import type { Database } from '@dissona/nucleo/lib/supabase/tipos-bd';

import { lerMetadados } from './servico';
import type { FaixaEmEdicao, MetadadosDetectados } from './tipos';

/** O tipo gerado do `update` — nunca um `Record<string, unknown>` solto. */
type PatchDeFaixa = Database['public']['Tables']['faixa']['Update'];

const COLUNAS =
  'id, titulo, capa_caminho, estilo, genero, contexto_curador, lancada, data_lancamento, origem, url_spotify, url_youtube, arquivo_caminho, duracao_segundos, situacao, metadados_detectados';

type Linha = {
  readonly id: string;
  readonly titulo: string;
  readonly capa_caminho: string | null;
  readonly estilo: string | null;
  readonly genero: string | null;
  readonly contexto_curador: string | null;
  readonly lancada: boolean | null;
  readonly data_lancamento: string | null;
  readonly origem: FaixaEmEdicao['origem'];
  readonly url_spotify: string | null;
  readonly url_youtube: string | null;
  readonly arquivo_caminho: string | null;
  readonly duracao_segundos: number | null;
  readonly situacao: FaixaEmEdicao['situacao'];
  readonly metadados_detectados: unknown;
};

function paraDominio(linha: Linha): FaixaEmEdicao {
  return {
    id: linha.id,
    titulo: linha.titulo,
    capaCaminho: linha.capa_caminho,
    estilo: linha.estilo,
    genero: linha.genero,
    contextoCurador: linha.contexto_curador,
    lancada: linha.lancada,
    dataLancamento: linha.data_lancamento,
    origem: linha.origem,
    urlSpotify: linha.url_spotify,
    urlYoutube: linha.url_youtube,
    arquivoCaminho: linha.arquivo_caminho,
    duracaoSegundos: linha.duracao_segundos,
    situacao: linha.situacao,
    metadadosDetectados: lerMetadados(linha.metadados_detectados),
  };
}

/** Uma faixa do artista da sessão. `null` quando não existe ou a RLS a esconde. */
export async function buscar(faixaId: string): Promise<FaixaEmEdicao | null> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from('faixa')
    .select(COLUNAS)
    .eq('id', faixaId)
    .maybeSingle();

  estourarSeErro(error);
  return data === null || data === undefined ? null : paraDominio(data);
}

export type NovaFaixa = {
  readonly perfilArtistaId: string;
  readonly titulo: string;
  readonly estilo: string | null;
  readonly origem: FaixaEmEdicao['origem'];
  readonly urlSpotify: string | null;
  readonly urlYoutube: string | null;
  readonly arquivoCaminho: string;
  readonly capaCaminho: string | null;
  readonly lancada: boolean | null;
  readonly dataLancamento: string | null;
  readonly duracaoSegundos: number | null;
  readonly metadadosDetectados: MetadadosDetectados | null;
};

export async function inserir(dados: NovaFaixa): Promise<string> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from('faixa')
    .insert({
      perfil_artista_id: dados.perfilArtistaId,
      titulo: dados.titulo,
      estilo: dados.estilo,
      origem: dados.origem,
      url_spotify: dados.urlSpotify,
      url_youtube: dados.urlYoutube,
      arquivo_caminho: dados.arquivoCaminho,
      capa_caminho: dados.capaCaminho,
      lancada: dados.lancada,
      data_lancamento: dados.dataLancamento,
      duracao_segundos: dados.duracaoSegundos,
      metadados_detectados: dados.metadadosDetectados,
      situacao: 'rascunho',
    })
    .select('id')
    .single();

  estourarSeErro(error);
  if (data === null) falhar(CodigoErro.NAO_AUTORIZADO, { operacao: 'inserir_faixa' });
  return data.id;
}

/**
 * Aplica um `update` e **exige** que ele tenha alcançado a linha.
 *
 * Zero linhas afetadas não é erro no PostgREST — é o que acontece quando a
 * policy esconde a linha. Sem conferir a contagem, a pessoa clicaria
 * "Continuar" e seguiria para o passo 2 com o passo 1 não salvo.
 */
async function atualizarExigindoLinha(faixaId: string, patch: PatchDeFaixa): Promise<void> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase.from('faixa').update(patch).eq('id', faixaId).select('id');

  estourarSeErro(error);
  if ((data ?? []).length === 0) {
    falhar(CodigoErro.NAO_AUTORIZADO, { operacao: 'atualizar_faixa', faixaId });
  }
}

export async function atualizarDetalhes(
  faixaId: string,
  dados: Omit<NovaFaixa, 'perfilArtistaId' | 'arquivoCaminho'> & {
    readonly arquivoCaminho?: string;
  },
): Promise<void> {
  const patch: PatchDeFaixa = {
    titulo: dados.titulo,
    estilo: dados.estilo,
    origem: dados.origem,
    url_spotify: dados.urlSpotify,
    url_youtube: dados.urlYoutube,
    capa_caminho: dados.capaCaminho,
    lancada: dados.lancada,
    data_lancamento: dados.dataLancamento,
    duracao_segundos: dados.duracaoSegundos,
    metadados_detectados: dados.metadadosDetectados,
  };
  // Só sobrescreve o áudio quando veio arquivo novo — reenviar o passo 1 sem
  // trocar o arquivo não pode apagar o que já está no bucket.
  if (dados.arquivoCaminho !== undefined) patch['arquivo_caminho'] = dados.arquivoCaminho;

  await atualizarExigindoLinha(faixaId, patch);
}

export async function atualizarContexto(
  faixaId: string,
  genero: string,
  contexto: string,
): Promise<void> {
  await atualizarExigindoLinha(faixaId, { genero, contexto_curador: contexto });
}

/**
 * Sobe um arquivo e devolve o caminho **tal como o Storage o gravou**.
 *
 * ⚠️ O caminho tem de começar com o `auth.uid()`: as policies de `0000_storage`
 * comparam `(storage.foldername(name))[1]` com ele, e a policy de leitura do
 * curador (`0006b`) compara `storage.objects.name` com `faixa.arquivo_caminho`
 * por **igualdade exata**. Um caminho montado à mão que divirja do gravado não
 * dá erro nenhum — o player do curador simplesmente não toca. Por isso o
 * retorno vem de `data.path`, e não da string que entrou.
 */
export async function subirAudio(
  usuarioId: string,
  faixaRef: string,
  arquivo: File,
): Promise<string> {
  const supabase = await criarClienteServidor();

  const extensao = arquivo.type.includes('wav') ? '.wav' : '.mp3';
  const caminho = `${usuarioId}/${faixaRef}${extensao}`;

  const { data, error } = await supabase.storage
    .from('faixas')
    .upload(caminho, arquivo, { upsert: true, contentType: arquivo.type });

  estourarSeErro(error);
  if (data === null) falhar(CodigoErro.NAO_AUTORIZADO, { operacao: 'subir_audio' });
  return data.path;
}

export async function subirCapa(
  usuarioId: string,
  faixaRef: string,
  arquivo: File,
): Promise<string> {
  const supabase = await criarClienteServidor();

  const extensao = arquivo.type === 'image/png' ? '.png' : '.jpg';
  const caminho = `${usuarioId}/${faixaRef}${extensao}`;

  const { data, error } = await supabase.storage
    .from('capas')
    .upload(caminho, arquivo, { upsert: true, contentType: arquivo.type });

  estourarSeErro(error);
  if (data === null) falhar(CodigoErro.NAO_AUTORIZADO, { operacao: 'subir_capa' });
  return data.path;
}

/** O perfil de artista da sessão, para carimbar a faixa nova. */
export async function meuPerfilArtista(): Promise<string | null> {
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase.from('perfil_artista').select('id').maybeSingle();

  estourarSeErro(error);
  return data?.id ?? null;
}

/**
 * Tamanho e MIME de um objeto dos baldes deste modulo.
 *
 * Delegacao estreita para `lib/supabase/armazenamento`: a leitura e a mesma
 * para todo bucket, mas a uniao de baldes fica por modulo — assim nenhuma acao
 * do envio consegue pedir metadado de `materiais` por engano.
 */
export async function metadadosDoObjeto(
  balde: 'faixas' | 'capas',
  caminho: string,
): Promise<ObjetoNoStorage | null> {
  return lerMetadadosDoObjeto(balde, caminho);
}
