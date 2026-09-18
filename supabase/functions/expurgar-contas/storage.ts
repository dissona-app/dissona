/**
 * Apagar a pasta de uma conta, bucket a bucket.
 *
 * Separado do `index.ts` para ser testável sem servidor: a regra que importa —
 * listar antes de apagar, e apagar por caminho completo — é a que erra em
 * silêncio quando escrita de memória.
 */

/**
 * Os três buckets em que uma conta escreve.
 *
 * `capas` e `materiais` ficam de fora **de propósito**: a capa pertence à
 * faixa, que sobrevive por causa da avaliação já paga, e `materiais` guarda a
 * comprovação de credencial, que o expurgo já remove pela linha em
 * `credencial_curador`. Se um dia mudarem de lado, muda aqui e não em três
 * lugares.
 */
export const BALDES_DO_EXPURGO = ['avatares', 'faixas', 'exportacoes'] as const;

export type BaldeDoExpurgo = (typeof BALDES_DO_EXPURGO)[number];

type ObjetoListado = { readonly name: string };

/**
 * Apaga tudo que há em `<pasta>/` e devolve quantos objetos saíram.
 *
 * A API de remoção exige os **caminhos completos**, então a listagem vem
 * primeiro. `list` devolve nomes relativos à pasta — daí o prefixo ser
 * recomposto aqui; mandar o nome puro apagaria um objeto da raiz, se existisse
 * um com o mesmo nome, e não o da pessoa.
 *
 * Pasta vazia não é erro: uma conta pode nunca ter subido foto.
 */
export async function apagarObjetosDaPasta(
  url: string,
  cabecalhos: Record<string, string>,
  balde: BaldeDoExpurgo,
  pasta: string,
  sinal: AbortSignal,
): Promise<number> {
  const listagem = await fetch(`${url}/storage/v1/object/list/${balde}`, {
    method: 'POST',
    headers: cabecalhos,
    body: JSON.stringify({ prefix: `${pasta}/`, limit: 1000 }),
    signal: sinal,
  });

  if (!listagem.ok) return 0;

  const objetos = (await listagem.json()) as readonly ObjetoListado[];
  const caminhos = objetos.map((objeto) => `${pasta}/${objeto.name}`);
  if (caminhos.length === 0) return 0;

  const remocao = await fetch(`${url}/storage/v1/object/${balde}`, {
    method: 'DELETE',
    headers: cabecalhos,
    body: JSON.stringify({ prefixes: caminhos }),
    signal: sinal,
  });

  return remocao.ok ? caminhos.length : 0;
}
