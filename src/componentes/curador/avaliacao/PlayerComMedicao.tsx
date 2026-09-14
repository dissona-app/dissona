'use client';

import { useCallback, useRef, useState } from 'react';

import { Aviso } from '@/componentes/base/Aviso';
import { Player } from '@/componentes/base/Player';
import type { EstadoEscuta } from '@/lib/escuta';
import { registrarEscutaMedida } from '@/modulos/avaliacao/acoes';
import { AVALIAR } from '@/textos/avaliacao';

import estilos from './PlayerComMedicao.module.css';

export type PropsPlayerComMedicao = {
  readonly envioId: string;
  /** URL assinada do áudio; `null` quando a faixa não tem arquivo que toque. */
  readonly src: string | null;
  readonly titulo: string;
  readonly artista: string;
  readonly minimoPercentual: number;
  /** O máximo já medido em sessões anteriores, de `avaliacao.escuta_percentual`. */
  readonly escutaSalva: number;
};

/**
 * Quanto o percentual precisa crescer para valer uma ida ao servidor.
 *
 * O `<Player>` publica a cada `timeupdate` — cerca de quatro vezes por segundo.
 * Gravar em todas seria uma escrita a cada 250 ms durante a faixa inteira, para
 * uma coluna cujo valor útil muda de ponto em ponto.
 */
const PASSO_PARA_GRAVAR = 5;

/** E, mesmo crescendo, no máximo uma gravação a cada dez segundos. */
const INTERVALO_MINIMO_MS = 10_000;

/**
 * O player da etapa 14, com a escuta persistida.
 *
 * ## O que é conveniência e o que é fronteira
 *
 * A medição é do cliente — `MedidorDeEscuta` credita intervalos distintos, e
 * não tempo de reprodução, então adiantar não conta. Mas quem **decide** é o
 * banco: `enviar_avaliacao` recusa com `DS001` abaixo de
 * `escuta_minima_percentual`, e a barra aqui é só o aviso antecipado.
 *
 * Persistir não é opcional, e não é por causa do gate: o medidor zera a cada
 * carregamento da página. Sem gravar, um F5 no meio da avaliação faria o
 * curador ouvir tudo de novo. O trigger `avaliacao_escuta_so_cresce` grava
 * `greatest(old, new)`, e é ele que torna seguro mandar medições fora de ordem
 * — e inócuo mandar uma medição menor.
 *
 * Falha de gravação é engolida de propósito: interromper quem está ouvindo por
 * causa de um POST perdido seria trocar um problema invisível por um visível e
 * pior. A próxima medição tenta de novo, e a conclusão relê do banco.
 */
export function PlayerComMedicao({
  envioId,
  src,
  titulo,
  artista,
  minimoPercentual,
  escutaSalva,
}: PropsPlayerComMedicao) {
  const [medido, setMedido] = useState(escutaSalva);
  const ultimoGravado = useRef(escutaSalva);
  const ultimaGravacaoEm = useRef(0);

  const aoMudar = useCallback(
    (estado: EstadoEscuta) => {
      // O que a tela mostra é o **máximo** entre o que já estava no banco e o
      // que esta sessão mediu — a mesma regra do trigger. Sem isso a barra
      // recomeçaria do zero depois de um F5, contradizendo o que foi gravado.
      setMedido((anterior) => Math.max(anterior, estado.percentual));

      const agora = Date.now();
      const cresceu = estado.percentual - ultimoGravado.current;
      const completou = estado.percentual >= 100;

      if (cresceu < PASSO_PARA_GRAVAR && !completou) return;
      if (agora - ultimaGravacaoEm.current < INTERVALO_MINIMO_MS && !completou) return;
      if (cresceu <= 0) return;

      ultimoGravado.current = estado.percentual;
      ultimaGravacaoEm.current = agora;
      void registrarEscutaMedida(envioId, estado.percentual);
    },
    [envioId],
  );

  const atingiu = medido >= minimoPercentual;

  return (
    <div className={estilos.base}>
      {/* Sem arquivo, o aviso toma o lugar do player — e só dele. A frase do
          mínimo continua: ela é informação sobre a avaliação, não sobre o
          player, e some-la esconderia justamente por que a conclusão vai ser
          recusada. */}
      {src === null ? (
        <Aviso tom="alerta" estatico>
          {AVALIAR.semAudio}
        </Aviso>
      ) : (
        <Player
          src={src}
          titulo={titulo}
          artista={artista}
          minimoPercentual={minimoPercentual}
          onEscutaMudar={aoMudar}
        />
      )}

      <p className={atingiu ? estilos.notaAtingida : estilos.nota} aria-live="polite">
        {AVALIAR.escutaMedida(minimoPercentual)}
      </p>
    </div>
  );
}
