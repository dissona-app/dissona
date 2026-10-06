'use server';

/**
 * Server Actions das cinco etapas da avaliação (14).
 *
 * ## O rascunho nasce aqui, não na leitura
 *
 * `garantirRascunho` é chamada por toda ação que escreve. Abrir a tela não cria
 * linha nenhuma — quem só foi olhar a faixa não deixa rascunho para trás —, e a
 * primeira escrita, inclusive a da escuta medida, é o que materializa a
 * `avaliacao`.
 *
 * ## "Salvar e sair" é o mesmo salvamento, com outro destino
 *
 * Cada etapa tem dois `type="submit"` no mesmo `<form>`, distinguidos por um
 * campo `destino`. Os dois gravam exatamente a mesma coisa; só muda para onde a
 * pessoa vai depois, e qual `passo_atual` fica registrado — é ele que sustenta
 * a retomada.
 *
 * "Voltar" **não** é ação: é link para a etapa anterior. Voltar não é um ato de
 * gravação, e como submit ele precisaria burlar a validação do passo para
 * deixar sair de um campo obrigatório vazio.
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { executar, falha, falhaDeCampos, sucesso } from '@dissona/nucleo/lib/acoes';
import type { ResultadoDeAcao } from '@dissona/nucleo/lib/acoes';
import { CodigoErro } from '@dissona/nucleo/lib/erros';
import { ROTA } from '@dissona/nucleo/lib/guarda-rota';

import { lerRegras } from './consultas';
import {
  esquemaCompartilhamento,
  esquemaEscuta,
  esquemaNotaDeCriterio,
  esquemaOutras,
  esquemaSubjetiva,
} from './esquemas';
import {
  buscarRascunho,
  concluir,
  garantirRascunho,
  listarCriterios,
  marcarEnvioComoOuvido,
  registrarEscuta,
  removerCompartilhamento,
  removerNota,
  salvarCompartilhamento,
  salvarNota,
  salvarPasso,
  salvarSubjetiva,
} from './repositorio';
import { impedimentosParaConcluir } from './servico';
import type { PassoDaAvaliacao } from '@dissona/nucleo/modulos/avaliacao/tipos';
import { numeroDoPasso } from '@dissona/nucleo/modulos/avaliacao/tipos';

function texto(dados: FormData, campo: string): string {
  const valor = dados.get(campo);
  return typeof valor === 'string' ? valor : '';
}

function motivosPorCampo(
  issues: readonly { readonly path: readonly PropertyKey[]; readonly message: string }[],
): Record<string, string> {
  const motivos: Record<string, string> = {};
  for (const issue of issues) {
    const campo = issue.path[0];
    if (typeof campo !== 'string' || campo in motivos) continue;
    motivos[campo] = issue.message;
  }
  return motivos;
}

function rotaDoPasso(envioId: string, passo: PassoDaAvaliacao): string {
  return `${ROTA.CURADOR_AVALIAR}/${envioId}/${passo}`;
}

/** "Salvar e sair" volta para a fila; o resto segue o wizard. */
function saiu(dados: FormData): boolean {
  return texto(dados, 'destino') === 'sair';
}

/**
 * Grava o progresso e devolve para onde ir.
 *
 * `passo_atual` guarda o passo em que a pessoa **vai estar**, e não o que
 * acabou de preencher: é isso que faz "Salvar e sair" no meio das notas trazer
 * de volta para as notas, e o avanço trazer de volta para a etapa seguinte.
 */
async function avancar(
  avaliacaoId: string,
  envioId: string,
  dados: FormData,
  proximo: PassoDaAvaliacao,
  atual: PassoDaAvaliacao,
): Promise<string> {
  const destino = saiu(dados) ? atual : proximo;
  await salvarPasso(avaliacaoId, numeroDoPasso(destino));
  return saiu(dados) ? ROTA.CURADOR_FILA : rotaDoPasso(envioId, proximo);
}

/**
 * 14 · as notas objetivas.
 *
 * Uma submissão traz **todos** os onze critérios, inclusive os vazios: um
 * critério que perdeu a nota precisa perder a linha em `nota_criterio`, senão a
 * média objetiva continuaria contando um valor que a tela já não mostra.
 *
 * As chaves vêm do catálogo, nunca do formulário. Iterar sobre o que o cliente
 * mandou deixaria `nota_criterio.criterio` aceitar qualquer string — a FK a
 * recusaria, mas com um erro de banco cru no lugar de nada acontecer.
 */
export async function salvarNotasObjetivas(dados: FormData): Promise<ResultadoDeAcao> {
  const envioId = texto(dados, 'envioId');

  const resultado = await executar(async () => {
    const criterios = await listarCriterios();

    const analisadas = criterios.map((criterio) =>
      esquemaNotaDeCriterio.safeParse({
        criterio: criterio.chave,
        nota: texto(dados, `nota.${criterio.chave}`),
        justificativa: texto(dados, `justificativa.${criterio.chave}`),
      }),
    );

    const invalida = analisadas.findIndex((analise) => !analise.success);
    if (invalida >= 0) {
      const analise = analisadas[invalida];
      const criterio = criterios[invalida];
      if (analise !== undefined && !analise.success && criterio !== undefined) {
        return falhaDeCampos(CodigoErro.ENTRADA_INVALIDA, {
          [criterio.chave]: Object.values(motivosPorCampo(analise.error.issues))[0] ?? 'invalido',
        });
      }
    }

    const avaliacaoId = await garantirRascunho(envioId);

    for (const analise of analisadas) {
      if (!analise.success) continue;
      const { criterio, nota, justificativa } = analise.data;

      // Sem nota não há linha: `nota_criterio.nota` é `not null`, e guardar uma
      // justificativa órfã contaria como critério respondido no acréscimo.
      if (nota === null) {
        await removerNota(avaliacaoId, criterio);
        continue;
      }

      await salvarNota(avaliacaoId, { criterio, nota, justificativa });
    }

    return sucesso(await avancar(avaliacaoId, envioId, dados, 'subjetiva', 'notas'));
  });

  if (!resultado.ok) return resultado;
  revalidatePath(rotaDoPasso(envioId, 'notas'));
  redirect(resultado.dados);
}

/** 14.1 · nota subjetiva e feedback escrito. */
export async function salvarNotaSubjetiva(dados: FormData): Promise<ResultadoDeAcao> {
  const envioId = texto(dados, 'envioId');

  const resultado = await executar(async () => {
    const analise = esquemaSubjetiva.safeParse({
      notaSubjetiva: texto(dados, 'notaSubjetiva'),
      feedback: texto(dados, 'feedback'),
    });

    if (!analise.success) {
      return falhaDeCampos(CodigoErro.ENTRADA_INVALIDA, motivosPorCampo(analise.error.issues));
    }

    const avaliacaoId = await garantirRascunho(envioId);
    await salvarSubjetiva(avaliacaoId, analise.data.notaSubjetiva, analise.data.feedback);

    return sucesso(await avancar(avaliacaoId, envioId, dados, 'compartilhamento', 'subjetiva'));
  });

  if (!resultado.ok) return resultado;
  revalidatePath(rotaDoPasso(envioId, 'subjetiva'));
  redirect(resultado.dados);
}

/**
 * 14.2 · a modalidade de compartilhamento.
 *
 * ## Por que `outros` não grava nada aqui
 *
 * `compartilhamento_outros_exige_descricao` recusa a linha sem dizer onde a
 * faixa vai circular, e essa resposta é de 14.3. As saídas seriam inventar uma
 * descrição para satisfazer o `check` — dado falso no banco — ou adiar a
 * gravação. A segunda é a escolhida: a escolha anterior é removida, a linha
 * nasce completa em 14.3, e enquanto isso o estado é honestamente "sem
 * escolha".
 *
 * Nas outras quatro modalidades a descrição preservada seria sempre `null`, e
 * por isso não há nada a mesclar.
 */
export async function salvarEscolhaDeCompartilhamento(dados: FormData): Promise<ResultadoDeAcao> {
  const envioId = texto(dados, 'envioId');

  const resultado = await executar(async () => {
    const analise = esquemaCompartilhamento.safeParse({
      modalidade: texto(dados, 'modalidade'),
      url: texto(dados, 'url'),
    });

    if (!analise.success) {
      return falhaDeCampos(CodigoErro.ENTRADA_INVALIDA, motivosPorCampo(analise.error.issues));
    }

    const avaliacaoId = await garantirRascunho(envioId);
    const { modalidade, url } = analise.data;

    if (modalidade === 'outros') {
      const anterior = await buscarRascunho(envioId);
      const descricao = anterior?.compartilhamento?.descricao ?? null;

      // Já houve uma passagem por 14.3: a descrição existe, e refazer a escolha
      // não deve apagá-la.
      if (descricao === null) await removerCompartilhamento(avaliacaoId);
      else await salvarCompartilhamento(avaliacaoId, { modalidade, descricao, url });
    } else {
      await salvarCompartilhamento(avaliacaoId, { modalidade, descricao: null, url });
    }

    const proximo = modalidade === 'outros' ? 'outras' : 'remuneracao';
    return sucesso(await avancar(avaliacaoId, envioId, dados, proximo, 'compartilhamento'));
  });

  if (!resultado.ok) return resultado;
  revalidatePath(rotaDoPasso(envioId, 'compartilhamento'));
  redirect(resultado.dados);
}

/** 14.3 · "Outras formas" — só existe quando a modalidade é `outros`. */
export async function salvarOutrasFormas(dados: FormData): Promise<ResultadoDeAcao> {
  const envioId = texto(dados, 'envioId');

  const resultado = await executar(async () => {
    const analise = esquemaOutras.safeParse({
      descricao: texto(dados, 'descricao'),
      url: texto(dados, 'url'),
    });

    if (!analise.success) {
      return falhaDeCampos(CodigoErro.ENTRADA_INVALIDA, motivosPorCampo(analise.error.issues));
    }

    const avaliacaoId = await garantirRascunho(envioId);

    // Descrição vazia é rascunho, não escolha: gravar `outros` sem ela
    // violaria `compartilhamento_outros_exige_descricao`. Ver o comentário de
    // `salvarEscolhaDeCompartilhamento`.
    if (analise.data.descricao === null) {
      await removerCompartilhamento(avaliacaoId);
    } else {
      await salvarCompartilhamento(avaliacaoId, {
        modalidade: 'outros',
        descricao: analise.data.descricao,
        url: analise.data.url,
      });
    }

    return sucesso(await avancar(avaliacaoId, envioId, dados, 'remuneracao', 'outras'));
  });

  if (!resultado.ok) return resultado;
  revalidatePath(rotaDoPasso(envioId, 'outras'));
  redirect(resultado.dados);
}

/**
 * 14.4 · concluir.
 *
 * Manda para `enviar_avaliacao` o que está **gravado**, e não o que a tela tem
 * em mão: a etapa 5 não tem campo nenhum, e reenviar um estado de cliente aqui
 * abriria a porta para concluir com notas que nunca passaram pela validação das
 * etapas anteriores.
 *
 * A checagem local de `impedimentosParaConcluir` é conveniência — diz onde está
 * o problema antes da ida ao banco. A fronteira é a RPC, que refaz tudo e
 * recusa com `DS001`–`DS005`.
 */
export async function concluirAvaliacao(dados: FormData): Promise<ResultadoDeAcao> {
  const envioId = texto(dados, 'envioId');

  const resultado = await executar(async () => {
    const [avaliacao, regras] = await Promise.all([buscarRascunho(envioId), lerRegras()]);

    if (avaliacao === null) return falha(CodigoErro.NAO_ENCONTRADO);
    if (avaliacao.concluida) return falha(CodigoErro.AVALIACAO_JA_CONCLUIDA);

    const impedimentos = impedimentosParaConcluir(avaliacao, regras);
    const primeiro = impedimentos[0];
    if (primeiro !== undefined) {
      return falha(codigoDoImpedimento(primeiro.tipo), undefined, {
        impedimento: primeiro.tipo,
      });
    }

    // `impedimentosParaConcluir` já garantiu que os três existem; o TypeScript
    // não sabe disso, e um `!` aqui esconderia uma regressão futura.
    const compartilhamento = avaliacao.compartilhamento;
    if (compartilhamento === null || avaliacao.feedback === null) {
      return falha(CodigoErro.ENTRADA_INVALIDA);
    }

    await concluir(
      envioId,
      avaliacao.notas,
      avaliacao.notaSubjetiva ?? 0,
      avaliacao.feedback,
      avaliacao.escutaPercentual,
      compartilhamento,
    );

    return sucesso(rotaDoPasso(envioId, 'remuneracao'));
  });

  if (!resultado.ok) return resultado;

  // A fila perde o item (o envio vira `pronto`) e a carteira do curador ganha
  // o crédito — as duas telas precisam ser relidas.
  revalidatePath(ROTA.CURADOR_FILA);
  revalidatePath(rotaDoPasso(envioId, 'remuneracao'));
  redirect(resultado.dados);
}

function codigoDoImpedimento(tipo: string) {
  if (tipo === 'escuta') return CodigoErro.ESCUTA_INSUFICIENTE;
  if (tipo === 'criterios') return CodigoErro.CRITERIO_OBRIGATORIO_AUSENTE;
  if (tipo === 'feedback') return CodigoErro.FEEDBACK_OBRIGATORIO;
  return CodigoErro.ENTRADA_INVALIDA;
}

/**
 * A escuta medida pelo player, enquanto a faixa toca.
 *
 * Argumentos simples e não `FormData`: quem chama é um `useEffect` do
 * `<Player>`, não um formulário. Nada é revalidado — a barra de progresso já
 * está na tela, e um `revalidatePath` a cada tique remontaria a página inteira
 * no meio da escuta.
 *
 * Silenciosa por desenho: falhar em gravar a medição não pode interromper quem
 * está ouvindo. O gate real é `enviar_avaliacao` (`DS001`), e o que está no
 * banco é sempre o **máximo** já medido — `avaliacao_escuta_so_cresce`.
 *
 * Ao cruzar `escuta_minima_percentual`, carimba o envio como `ouviu` (RF-071).
 * O mínimo vem de `configuracao`, nunca daqui — é a mesma leitura que
 * `enviar_avaliacao` faz para decidir o `DS001`, então o estado que o artista
 * vê em `3.3` e o gate do curador não podem divergir.
 */
export async function registrarEscutaMedida(
  envioId: string,
  percentual: number,
): Promise<ResultadoDeAcao> {
  return executar(async () => {
    const analise = esquemaEscuta.safeParse(percentual);
    if (!analise.success) return falha(CodigoErro.ENTRADA_INVALIDA, 'escuta');

    const [avaliacaoId, regras] = await Promise.all([garantirRascunho(envioId), lerRegras()]);
    await registrarEscuta(avaliacaoId, analise.data);

    if (analise.data >= regras.escutaMinimaPercentual) {
      await marcarEnvioComoOuvido(envioId);
    }

    return sucesso(undefined);
  });
}
