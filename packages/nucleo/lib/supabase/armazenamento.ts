import 'server-only';

/**
 * Leitura do metadado de um objeto do Storage.
 *
 * Existe porque o arquivo passou a subir do **navegador** direto ao bucket: a
 * Server Action recebe só um caminho, e precisa de uma fonte sobre o arquivo
 * que não seja o cliente. Esta é ela.
 */

import { criarClienteServidor } from './servidor';

/** Os buckets em que a aplicação escreve a partir de um `<input type="file">`. */
export type BaldeDeUpload = 'faixas' | 'capas' | 'avatares' | 'materiais';

/** O que o Storage sabe sobre um objeto já gravado. */
export type ObjetoNoStorage = {
  readonly tamanhoBytes: number;
  /**
   * MIME **declarado no upload**, não inferido dos bytes.
   *
   * É o mesmo dado que `File.type` daria, e vem de quem subiu. O Storage é
   * oráculo confiável para **tamanho**; para tipo ele só repete o que lhe
   * disseram. Quem monta o upload à mão escolhe o `contentType` — por isso o
   * bucket também declara `allowed_mime_types`.
   */
  readonly mime: string;
};

/**
 * Lê tamanho e MIME de um objeto do bucket, ou `null` se ele não existe.
 *
 * Roda com a sessão da pessoa (`criarClienteServidor`), então um caminho de
 * outra pessoa volta `null` em vez de metadado — a RLS esconde a pasta alheia.
 * "Não existe" e "não é seu" são a mesma resposta de propósito: distinguir os
 * dois contaria que o objeto existe.
 *
 * `list` com `search` faz busca por **prefixo**, não por igualdade, então o nome
 * é conferido aqui. Um `search` que casasse por acaso devolveria o objeto
 * errado — e o tamanho errado é justamente o que o limite deveria barrar.
 */
export async function metadadosDoObjeto(
  balde: BaldeDeUpload,
  caminho: string,
): Promise<ObjetoNoStorage | null> {
  const supabase = await criarClienteServidor();

  const corte = caminho.lastIndexOf('/');
  if (corte <= 0) return null;
  const pasta = caminho.slice(0, corte);
  const nome = caminho.slice(corte + 1);

  const { data, error } = await supabase.storage.from(balde).list(pasta, { search: nome });
  if (error !== null) return null;

  const objeto = (data ?? []).find((cada) => cada.name === nome);
  if (objeto === undefined) return null;

  const tamanho = objeto.metadata?.['size'];
  const mime = objeto.metadata?.['mimetype'];

  return {
    tamanhoBytes: typeof tamanho === 'number' ? tamanho : 0,
    mime: typeof mime === 'string' ? mime : '',
  };
}

/**
 * URL pública de um objeto de bucket público — hoje só `avatares`.
 *
 * `avatares` é público desde a `0000_storage`, então não precisa de URL
 * assinada: a foto de perfil é o que os curadores veem antes de ouvir alguém.
 *
 * O `?v=` **não é enfeite**: o upload usa `upsert` num nome fixo
 * (`<uid>/perfil.jpg`), então trocar a foto não muda a URL, e sem o parâmetro o
 * CDN continuaria servindo a antiga. A versão é qualquer coisa que mude junto
 * com a foto — `perfil.atualizado_em` serve.
 */
export async function urlPublicaDoAvatar(
  caminho: string | null,
  versao?: string | null,
): Promise<string | null> {
  if (caminho === null || caminho === '') return null;

  const supabase = await criarClienteServidor();
  const { data } = supabase.storage.from('avatares').getPublicUrl(caminho);

  if (versao === null || versao === undefined || versao === '') return data.publicUrl;
  return `${data.publicUrl}?v=${encodeURIComponent(versao)}`;
}
