/**
 * Formato de retorno das Server Actions.
 *
 * Uma Server Action que lança erro faz o Next renderizar o `error.tsx` — o que
 * é certo para falha de infraestrutura e **errado** para "informe o nome do
 * pacote": o usuário perde o formulário inteiro por causa de um campo. Então
 * erro de domínio volta como **valor**, e a View o coloca no campo.
 *
 * O que volta é `CodigoErro` e `campo`, nunca texto: a tradução é da View
 * (architecture.md §8), e é assim que o i18n da fatia 17 entra sem reescrever
 * ação nenhuma.
 *
 * Erro **não** previsto continua subindo. Engolir tudo num `catch` faria uma
 * falha de rede aparecer como validação de campo, que é a pior mensagem
 * possível: manda o usuário corrigir o que está certo.
 */

import type { CodigoErro, DetalhesErro } from './erros';
import { ehErroDominio } from './erros';

export type FalhaDeAcao = {
  readonly ok: false;
  readonly codigo: CodigoErro;
  /** Nome do campo do formulário, quando o erro é de um campo. */
  readonly campo?: string;
  readonly detalhes?: DetalhesErro;
};

export type SucessoDeAcao<T> = { readonly ok: true; readonly dados: T };

export type ResultadoDeAcao<T = undefined> = SucessoDeAcao<T> | FalhaDeAcao;

export function sucesso(): ResultadoDeAcao;
export function sucesso<T>(dados: T): ResultadoDeAcao<T>;
export function sucesso<T>(dados?: T): ResultadoDeAcao<T | undefined> {
  return { ok: true, dados };
}

export function falha(codigo: CodigoErro, campo?: string, detalhes?: DetalhesErro): FalhaDeAcao {
  return {
    ok: false,
    codigo,
    ...(campo === undefined ? {} : { campo }),
    ...(detalhes === undefined ? {} : { detalhes }),
  };
}

/**
 * Executa o corpo da ação convertendo `ErroDominio` em `FalhaDeAcao`.
 *
 * `campo` sai de `erro.detalhes.campo` quando o serviço o informou — é o que
 * liga `falhar(ENTRADA_INVALIDA, { campo: 'valor' })` ao `<input>` do valor,
 * sem a ação precisar conhecer os campos do formulário.
 */
export async function executar<T>(
  corpo: () => Promise<ResultadoDeAcao<T>>,
): Promise<ResultadoDeAcao<T>> {
  try {
    return await corpo();
  } catch (erro) {
    if (!ehErroDominio(erro)) throw erro;
    const campo = erro.detalhes?.['campo'];
    return falha(erro.codigo, typeof campo === 'string' ? campo : undefined, erro.detalhes);
  }
}
