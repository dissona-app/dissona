'use client';

import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * O passo atual do tour de onboarding (1.5), compartilhado entre duas colunas.
 *
 * O protótipo tem **dois** controles do mesmo passo: o card à esquerda, com
 * "Avançar"/"Voltar", e o navegador à direita, em que cada linha é um botão que
 * salta para aquele passo (`obGo1`…`obGo4`). Os dois leem e escrevem o mesmo
 * `obStep`.
 *
 * Um contexto, e não `useState` no pai comum, porque o pai comum é
 * `MolduraDeAutenticacao`: ela recebe `children` e `aside` como props e não tem
 * — nem deveria ter — ideia do que há dentro deles. O provedor é cliente e
 * envolve a moldura inteira; a moldura segue sendo componente de servidor.
 */

type EstadoDoTour = {
  readonly indice: number;
  readonly total: number;
  readonly irPara: (indice: number) => void;
};

const Contexto = createContext<EstadoDoTour | null>(null);

export function ProvedorDoTour({
  total,
  children,
}: {
  readonly total: number;
  readonly children: ReactNode;
}) {
  const [indice, setIndice] = useState(0);

  const valor = useMemo<EstadoDoTour>(
    () => ({
      indice,
      total,
      irPara: (destino) => setIndice(Math.min(Math.max(destino, 0), total - 1)),
    }),
    [indice, total],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

/** Estoura fora do provedor: é erro de montagem, e falhar cedo o expõe. */
export function useEstadoDoTour(): EstadoDoTour {
  const estado = useContext(Contexto);
  if (estado === null) {
    throw new Error('useEstadoDoTour precisa de <ProvedorDoTour> acima na árvore.');
  }
  return estado;
}
