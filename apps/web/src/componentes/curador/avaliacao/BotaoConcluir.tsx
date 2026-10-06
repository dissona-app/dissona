'use client';

import { useActionState } from 'react';

import { Aviso } from '@dissona/nucleo/componentes/base/Aviso';
import { Botao } from '@dissona/nucleo/componentes/base/Botao';
import type { ResultadoDeAcao } from '@dissona/nucleo/lib/acoes';
import { CodigoErro } from '@dissona/nucleo/lib/erros';
import { AVALIAR } from '@dissona/nucleo/textos/avaliacao';

import estilos from './BotaoConcluir.module.css';

export type PropsBotaoConcluir = {
  readonly envioId: string;
  /** O mínimo de escuta, para a mensagem de `DS001` poder dizer o número. */
  readonly escutaMinima: number;
  readonly escutaMedida: number;
  readonly acao: (dados: FormData) => Promise<ResultadoDeAcao>;
};

/**
 * "Concluir e liberar crédito" (14.4).
 *
 * ## Por que os erros aparecem aqui, e não numa página de erro
 *
 * `enviar_avaliacao` recusa com `DS001`–`DS005`, e as cinco recusas são
 * **acionáveis**: falta escuta, falta critério, falta feedback, o envio saiu da
 * fila, a avaliação já foi concluída. Deixar qualquer uma subir para o
 * `error.tsx` custaria à pessoa o contexto inteiro da tela na hora em que ela
 * mais precisa dele.
 *
 * A tradução mora aqui porque é View: o serviço devolve `CodigoErro`, nunca
 * texto (architecture.md §8).
 */
export function BotaoConcluir({ envioId, escutaMinima, escutaMedida, acao }: PropsBotaoConcluir) {
  const [resultado, enviar, pendente] = useActionState<ResultadoDeAcao | null, FormData>(
    async (_anterior, dados) => acao(dados),
    null,
  );

  const falhou = resultado !== null && !resultado.ok;

  return (
    <form action={enviar} className={estilos.base}>
      <input type="hidden" name="envioId" value={envioId} />

      {falhou ? (
        <Aviso tom="erro">{mensagem(resultado.codigo, escutaMinima, escutaMedida)}</Aviso>
      ) : null}

      <Botao type="submit" variante="perigo" blocoInteiro carregando={pendente}>
        {AVALIAR.concluir}
      </Botao>

      <p className={estilos.nota}>{AVALIAR.concluirNota}</p>
    </form>
  );
}

function mensagem(codigo: CodigoErro, escutaMinima: number, escutaMedida: number): string {
  if (codigo === CodigoErro.ESCUTA_INSUFICIENTE) {
    return AVALIAR.erroEscuta(escutaMinima, Math.floor(escutaMedida));
  }
  if (codigo === CodigoErro.CRITERIO_OBRIGATORIO_AUSENTE) return AVALIAR.erroCriterios;
  if (codigo === CodigoErro.FEEDBACK_OBRIGATORIO) return AVALIAR.erroFeedback;
  if (codigo === CodigoErro.AVALIACAO_JA_CONCLUIDA) return AVALIAR.erroJaConcluida;
  if (codigo === CodigoErro.ENVIO_SITUACAO_INVALIDA) return AVALIAR.erroSituacao;
  if (codigo === CodigoErro.NAO_ENCONTRADO) return AVALIAR.erroNaoDisponivel;
  // `ENTRADA_INVALIDA` chega quando falta a escolha de compartilhamento — o
  // único impedimento que não tem código `DSnnn` próprio.
  if (codigo === CodigoErro.ENTRADA_INVALIDA) return AVALIAR.erroCompartilhamentoSemEscolha;
  return AVALIAR.erroInesperado;
}
