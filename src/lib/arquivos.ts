/**
 * Limites e conferência de arquivo — foto de perfil e anexo de credencial.
 *
 * Mora em `lib/` porque serve **três** módulos: o wizard do curador (12), o
 * perfil do artista (7.1) e os dados do membro admin (27.1). Estava em
 * `modulos/curador/esquemas.ts`, que continua reexportando tudo para que
 * nenhum ponto de uso precise mudar de import — o mesmo tratamento que
 * `lib/link.ts` e `lib/armazenamento.ts` já tinham recebido.
 *
 * Não são números de negócio, e por isso não vêm de `configuracao`: espelham o
 * que o bucket aceita (`0000_storage.sql` — 2 MB e jpeg/png/webp em
 * `avatares`), e um valor de aplicação maior que o do bucket faria o upload
 * direto falhar com erro do Storage em vez da mensagem do produto.
 */

/**
 * Foto de perfil e anexo de credencial.
 *
 * Os limites são do protótipo: "JPG ou PNG, até 2 MB" (tela 27.1 do admin, a
 * única que os declara). O anexo de comprovação aceita PDF também, e 5 MB —
 * certificado escaneado passa de 2 MB com frequência, e recusá-lo faria a
 * pessoa perder a credencial por causa do scanner dela.
 */
export const FOTO_TIPOS = ['image/jpeg', 'image/png'] as const;
export const FOTO_MAX_BYTES = 2 * 1024 * 1024;

export const ANEXO_TIPOS = ['application/pdf', 'image/jpeg', 'image/png'] as const;
export const ANEXO_MAX_BYTES = 5 * 1024 * 1024;

export type ResultadoDeArquivo =
  | { readonly ok: true; readonly arquivo: File | null }
  | { readonly ok: false; readonly motivo: 'tipo' | 'tamanho' };

/**
 * Confere um arquivo do formulário sem lê-lo inteiro na memória.
 *
 * `File` do `FormData` já traz `type` e `size`, e os dois bastam para recusar
 * antes do upload. Um arquivo ausente (`size === 0`) não é erro: os dois campos
 * são opcionais.
 */
export function conferirArquivo(
  valor: unknown,
  tiposAceitos: readonly string[],
  maxBytes: number,
): ResultadoDeArquivo {
  if (!(valor instanceof File) || valor.size === 0) return { ok: true, arquivo: null };
  if (!tiposAceitos.includes(valor.type)) return { ok: false, motivo: 'tipo' };
  if (valor.size > maxBytes) return { ok: false, motivo: 'tamanho' };
  return { ok: true, arquivo: valor };
}

/**
 * Extensão a partir do MIME — uma definição só, cliente e servidor.
 *
 * O nome do arquivo vem do cliente e renomear `.exe` para `.jpg` é trivial, por
 * isso a extensão sai do tipo. E por isso ela precisa ser **a mesma** dos dois
 * lados desde que o navegador passou a subir direto: quem nomeia o objeto é o
 * cliente, e quem valida é o servidor — se divergirem, o servidor procura um
 * objeto que não existe.
 *
 * `image/webp` está aqui e **não** está em `FOTO_TIPOS`, de propósito. O bucket
 * `avatares` aceita webp e a aplicação não; mapear webp para `.jpg` faria um
 * upload recusado sobrescrever a foto válida que já estava lá.
 */
export function extensaoDoMime(mime: string): string {
  if (mime === 'application/pdf') return '.pdf';
  if (mime === 'image/png') return '.png';
  if (mime === 'image/webp') return '.webp';
  return '.jpg';
}

export type ResultadoDoObjeto =
  { readonly ok: true } | { readonly ok: false; readonly motivo: 'tipo' | 'tamanho' | 'ausente' };

/**
 * A mesma regra de `conferirArquivo`, sobre o metadado do objeto já gravado.
 *
 * É o caminho do upload direto do navegador: a ação recebe um caminho, e quem
 * conta tamanho e MIME é o Storage. `objeto === null` cobre dois casos
 * indistinguíveis por desenho — o objeto não existe, ou é de outra pessoa e a
 * RLS o esconde. Separá-los contaria que ele existe.
 *
 * Ao contrário de `conferirArquivo`, ausência **é** erro aqui: um caminho foi
 * informado, então alguém acredita que há um arquivo. "Não anexou" se diz não
 * mandando caminho nenhum.
 */
export function conferirObjeto(
  objeto: { readonly tamanhoBytes: number; readonly mime: string } | null,
  tiposAceitos: readonly string[],
  maxBytes: number,
): ResultadoDoObjeto {
  if (objeto === null || objeto.tamanhoBytes === 0) return { ok: false, motivo: 'ausente' };
  if (!tiposAceitos.includes(objeto.mime)) return { ok: false, motivo: 'tipo' };
  if (objeto.tamanhoBytes > maxBytes) return { ok: false, motivo: 'tamanho' };
  return { ok: true };
}
