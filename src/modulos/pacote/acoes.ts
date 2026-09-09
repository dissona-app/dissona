'use server';

/**
 * Server Actions da tela 21 e 21.1.
 *
 * Cada ação faz quatro coisas, nesta ordem: valida com Zod, confere a
 * permissão do módulo, chama o serviço e revalida o cache. **Cálculo nenhum**
 * acontece aqui — `desconto_percentual` sai de `servico.descontoDerivado`, que
 * é a mesma função que a tela usa para mostrar o número antes de salvar.
 *
 * A checagem de permissão é redundante com a RLS de propósito: a RLS é a
 * fronteira real, e esta é a terceira camada de §5.2. A diferença prática é a
 * mensagem — a RLS devolve zero linhas afetadas, e o usuário precisa saber que
 * foi negado, não que "não aconteceu nada".
 */

import { revalidatePath } from 'next/cache';

import { executar, falha, sucesso } from '@/lib/acoes';
import type { ResultadoDeAcao } from '@/lib/acoes';
import { lerConfiguracao } from '@/lib/configuracao';
import { CodigoErro, falhar } from '@/lib/erros';
import { ROTA } from '@/lib/guarda-rota';
import { lerPermissao, ModuloAdmin } from '@/modulos/admin/permissoes';

import { esquemaAlternarAtivo, esquemaDadosDePacote, esquemaIdDePacote } from './esquemas';
import * as repositorio from './repositorio';
import { base, descontoDerivado, validarDados } from './servico';
import type { DadosDePacote } from './tipos';

const CAMINHO_LISTA = `${ROTA.ADMIN}/pacotes`;

/**
 * `revalidatePath` na lista **e** na Carteira do artista.
 *
 * O segundo é o que faz a promessa da tela ser verdade: "Ativo aparece na
 * Carteira do artista na hora em que você salva." Sem ele, o pacote entra no
 * banco e a Carteira continua servindo o cache antigo — e a frase da tela
 * passa a ser falsa por um bug de cache, que é o tipo de erro que ninguém
 * procura no lugar certo.
 */
function revalidar(): void {
  revalidatePath(CAMINHO_LISTA);
  revalidatePath(`${ROTA.ARTISTA}/carteira`);
  revalidatePath(`${ROTA.ARTISTA}/pacotes`);
}

async function exigirEscrita(): Promise<void> {
  const { podeEscrever } = await lerPermissao(ModuloAdmin.PACOTES);
  if (!podeEscrever) falhar(CodigoErro.NAO_AUTORIZADO, { modulo: ModuloAdmin.PACOTES });
}

/** Converte a entrada validada em `DadosDePacote` e checa o que só o TS checa. */
async function prepararDados(dados: DadosDePacote): Promise<number> {
  const valorDaClave = BigInt(await lerConfiguracao('clave_valor_centavos'));
  validarDados(dados, valorDaClave);
  return descontoDerivado(dados.valor, base(dados.quantidade, valorDaClave));
}

export async function criarPacote(
  entrada: unknown,
): Promise<ResultadoDeAcao<{ readonly pacoteId: string }>> {
  return executar(async () => {
    const analise = esquemaDadosDePacote.safeParse(entrada);
    if (!analise.success) return falhaDeCampo(analise.error.issues);

    await exigirEscrita();
    const desconto = await prepararDados(analise.data);
    const pacoteId = await repositorio.inserir(analise.data, desconto);

    revalidar();
    return sucesso({ pacoteId });
  });
}

export async function atualizarPacote(
  pacoteId: unknown,
  entrada: unknown,
): Promise<ResultadoDeAcao> {
  return executar(async () => {
    const id = esquemaIdDePacote.safeParse({ pacoteId });
    if (!id.success) return falha(CodigoErro.ENTRADA_INVALIDA, 'pacoteId');

    const analise = esquemaDadosDePacote.safeParse(entrada);
    if (!analise.success) return falhaDeCampo(analise.error.issues);

    await exigirEscrita();
    const desconto = await prepararDados(analise.data);
    await repositorio.atualizar(id.data.pacoteId, analise.data, desconto);

    revalidar();
    revalidatePath(`${CAMINHO_LISTA}/${id.data.pacoteId}`);
    return sucesso();
  });
}

/** Ação "Ativar" / "Desativar" da lista. */
export async function alternarAtivo(entrada: unknown): Promise<ResultadoDeAcao> {
  return executar(async () => {
    const analise = esquemaAlternarAtivo.safeParse(entrada);
    if (!analise.success) return falha(CodigoErro.ENTRADA_INVALIDA);

    await exigirEscrita();
    await repositorio.definirAtivo(analise.data.pacoteId, analise.data.ativo);

    revalidar();
    return sucesso();
  });
}

/**
 * Ação "Excluir pacote", com confirmação — exclusão **lógica**.
 *
 * O que o modal promete ("Compras já feitas continuam válidas") é a razão de
 * não haver `delete` aqui nem policy de `delete` na `0007`:
 * `pedido_clave.pacote_clave_id` referencia esta linha, e apagá-la em cascata
 * destruiria a conciliação de uma compra que já aconteceu.
 */
export async function excluirPacote(entrada: unknown): Promise<ResultadoDeAcao> {
  return executar(async () => {
    const analise = esquemaIdDePacote.safeParse(entrada);
    if (!analise.success) return falha(CodigoErro.ENTRADA_INVALIDA, 'pacoteId');

    await exigirEscrita();
    await repositorio.excluir(analise.data.pacoteId);

    revalidar();
    return sucesso();
  });
}

/**
 * Primeiro `issue` do Zod → campo do formulário.
 *
 * Só o primeiro: a tela 21.1 tem quatro campos, e mostrar quatro erros de uma
 * vez num formulário desse tamanho não ajuda ninguém a consertar o primeiro.
 */
function falhaDeCampo(issues: readonly { readonly path: readonly PropertyKey[] }[]) {
  const primeiro = issues[0];
  const campo = primeiro?.path[0];
  return falha(CodigoErro.ENTRADA_INVALIDA, typeof campo === 'string' ? campo : undefined);
}
