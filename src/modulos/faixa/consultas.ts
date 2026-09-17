import 'server-only';

/** Leituras do envio (3) para Server Components. */

import { lerConfiguracoes } from '@/lib/configuracao';

import { buscar } from './repositorio';
import { passoAlcancado, podeAbrir } from './servico';
import type { FaixaEmEdicao, LimitesDeUpload, PassoDoEnvio } from './tipos';

export type { FaixaEmEdicao, LimitesDeUpload } from './tipos';

/**
 * Os limites de upload, de `configuracao`. Nunca constantes do código.
 *
 * ⚠️ **O mesmo número mora em dois lugares, e eles têm de concordar.**
 * `upload.tamanho_max_mb` é 50 no seed da `0004`; o bucket `faixas` declara
 * `file_size_limit = 52428800` em `0000_storage.sql`, junto com a lista de MIME
 * aceitos. Desde que o navegador sobe o arquivo direto (RF-036), **quem aplica
 * o limite é o bucket** — a validação daqui é o que produz a mensagem que a
 * tela mostra, lendo do Storage o tamanho e o MIME do objeto já gravado.
 *
 * Mudar um sem o outro não dá erro: dá uma recusa com a mensagem errada, ou um
 * arquivo aceito acima do que a tela prometeu. Quem mexer em um, mexe nos dois.
 */
export async function lerLimitesDeUpload(): Promise<LimitesDeUpload> {
  const config = await lerConfiguracoes(['upload.tamanho_max_mb', 'upload.formatos']);
  return {
    tamanhoMaxMb: config['upload.tamanho_max_mb'],
    formatos: config['upload.formatos'],
  };
}

export type EstadoDoPasso =
  | { readonly estado: 'ok'; readonly faixa: FaixaEmEdicao }
  | { readonly estado: 'inexistente' }
  /** A faixa existe, mas o passo pedido ainda não foi alcançado. */
  | { readonly estado: 'adiantado'; readonly ate: PassoDoEnvio }
  /** Já foi para curadoria — o conteúdo está congelado por trigger. */
  | { readonly estado: 'em_curadoria' };

/**
 * A faixa de um passo do wizard, com a guarda de progresso.
 *
 * Devolve união discriminada em vez de lançar: a página decide entre 404,
 * redirecionar para o passo certo e mostrar o aviso de faixa congelada — três
 * respostas diferentes que uma exceção só achataria.
 */
export async function lerFaixaDoPasso(
  faixaId: string,
  passo: PassoDoEnvio,
): Promise<EstadoDoPasso> {
  const faixa = await buscar(faixaId);
  if (faixa === null) return { estado: 'inexistente' };

  if (faixa.situacao !== 'rascunho' && faixa.situacao !== 'aguardando_selecao') {
    return { estado: 'em_curadoria' };
  }

  if (!podeAbrir(faixa, passo)) {
    return { estado: 'adiantado', ate: passoAlcancado(faixa) };
  }

  return { estado: 'ok', faixa };
}
