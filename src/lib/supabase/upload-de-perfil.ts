import 'server-only';

/**
 * Resolve o arquivo que uma tela de perfil mandou, seja qual for o caminho.
 *
 * Nasceu dentro de `modulos/curador/servico.ts`, a serviço do wizard. Passou
 * para cá quando o perfil do artista (7.1) e os dados do membro admin (27.1)
 * ganharam foto: são três telas com a mesma pergunta — "o que veio, e posso
 * confiar nele?" — e uma resposta só.
 */

import { caminhoEhDoUsuario } from '@/lib/armazenamento';
import { conferirArquivo, conferirObjeto, extensaoDoMime } from '@/lib/arquivos';
import { estourarSeErro } from '@/lib/supabase/erros';
import { criarClienteServidor } from '@/lib/supabase/servidor';

import { metadadosDoObjeto } from './armazenamento';

/** Por que um arquivo foi recusado. `alheio` é caminho de outra pessoa. */
export type MotivoDeArquivo = 'tipo' | 'tamanho' | 'ausente' | 'alheio';

export type ArquivoResolvido =
  | { readonly ok: true; readonly caminho: string | null }
  | { readonly ok: false; readonly motivo: MotivoDeArquivo };

/**
 * Sobe um arquivo pelo servidor — o caminho de quem está sem JavaScript.
 *
 * `upsert` com nome fixo (`<uid>/perfil.jpg`): a pessoa tem **uma** foto, e
 * versionar avatares deixaria lixo no bucket a cada troca. A extensão sai do
 * MIME, e não do nome, porque renomear `.exe` para `.jpg` é trivial.
 */
export async function subirArquivoDePerfil(
  balde: 'avatares' | 'materiais',
  usuarioId: string,
  nomeBase: string,
  arquivo: File,
): Promise<string> {
  const supabase = await criarClienteServidor();

  const caminho = `${usuarioId}/${nomeBase}${extensaoDoMime(arquivo.type)}`;

  const { error } = await supabase.storage
    .from(balde)
    .upload(caminho, arquivo, { upsert: true, contentType: arquivo.type });

  estourarSeErro(error);
  return caminho;
}

/**
 * As duas origens possíveis de um arquivo, resolvidas num caminho.
 *
 * **Caminho** é o navegador tendo subido direto ao bucket — o normal desde que
 * o anexo de 5 MB deixou de caber no corpo de uma Server Action na Vercel.
 * **Arquivo** é o `multipart` de sempre, que continua existindo para quem está
 * sem JavaScript.
 *
 * A ordem interna importa. `caminhoEhDoUsuario` vem **antes** da leitura do
 * Storage: sem isso o servidor iria ao bucket por causa de uma string arbitrária
 * vinda do formulário, e o próprio pedido já contaria se o objeto existe.
 *
 * No sucesso devolve o caminho **que o cliente mandou**, e não um recalculado. É
 * o `data.path` que o Storage respondeu; remontá-lo aqui reintroduziria a chance
 * de cliente e servidor discordarem sobre a extensão.
 */
export async function resolverArquivoDoFormulario(
  usuarioId: string,
  balde: 'avatares' | 'materiais',
  nomeBase: 'perfil' | 'formacao',
  caminhoEnviado: string | null,
  arquivoBruto: unknown,
  tiposAceitos: readonly string[],
  maxBytes: number,
): Promise<ArquivoResolvido> {
  if (caminhoEnviado !== null && caminhoEnviado !== '') {
    if (!caminhoEhDoUsuario(caminhoEnviado, usuarioId)) return { ok: false, motivo: 'alheio' };

    const objeto = await metadadosDoObjeto(balde, caminhoEnviado);
    const conferido = conferirObjeto(objeto, tiposAceitos, maxBytes);
    if (!conferido.ok) return { ok: false, motivo: conferido.motivo };

    return { ok: true, caminho: caminhoEnviado };
  }

  const conferido = conferirArquivo(arquivoBruto, tiposAceitos, maxBytes);
  if (!conferido.ok) return { ok: false, motivo: conferido.motivo };
  if (conferido.arquivo === null) return { ok: true, caminho: null };

  return {
    ok: true,
    caminho: await subirArquivoDePerfil(balde, usuarioId, nomeBase, conferido.arquivo),
  };
}
