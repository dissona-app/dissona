'use client';

import { useActionState } from 'react';

import { Aviso } from '@/componentes/base/Aviso';
import { Botao } from '@/componentes/base/Botao';
import type { ResultadoDeAcao } from '@/lib/acoes';
import { FILA as TEXTOS } from '@/textos/prototipo';

export type PropsIniciarAvaliacao = {
  readonly envioId: string;
  readonly acao: (dados: FormData) => Promise<ResultadoDeAcao>;
};

/**
 * "Iniciar avaliação" (13.1).
 *
 * Cliente só para poder mostrar a falha. Ela é real e não rara: o envio pode
 * ter saído de `recebeu`/`ouviu` em outra aba, ou ter sido devolvido pelo job
 * de 7 dias entre o carregamento da página e o clique. Sem isto, o botão
 * pareceria não fazer nada.
 */
export function IniciarAvaliacao({ envioId, acao }: PropsIniciarAvaliacao) {
  const [resultado, enviar, pendente] = useActionState<ResultadoDeAcao | null, FormData>(
    async (_anterior, dados) => acao(dados),
    null,
  );

  const falhou = resultado !== null && !resultado.ok;

  return (
    <form action={enviar}>
      <input type="hidden" name="envioId" value={envioId} />

      {falhou ? <Aviso tom="erro">{TEXTOS.erroNaoEstaMaisNaFila}</Aviso> : null}

      <Botao type="submit" carregando={pendente}>
        {TEXTOS.iniciarAvaliacao}
      </Botao>
    </form>
  );
}
