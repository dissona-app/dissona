'use client';

import { useEffect } from 'react';

import type { Papel } from '@/lib/papeis';

export type PropsRegistrarAmbiente = {
  readonly papel: Papel;
  readonly acao: (papel: Papel) => Promise<void>;
};

/**
 * Grava o ambiente em uso (RF-008), uma vez por troca.
 *
 * ## Por que um componente, e por que no cliente
 *
 * "Entro no último ambiente usado" precisa de um momento em que "usar" fique
 * evidente, e esse momento é a chegada. Um layout é Server Component: escrever
 * no banco durante a renderização é efeito colateral em render, que o Next pode
 * repetir ou pular conforme o cache. Daí um efeito no cliente, disparado uma
 * vez depois da pintura.
 *
 * ## Por que ele nem sempre é renderizado
 *
 * O layout só o monta quando `ultimo_ambiente` **difere** do ambiente atual.
 * Sem essa condição, seria uma escrita no banco por navegação — e a informação
 * muda quando a pessoa troca de ambiente, não quando ela abre outra página do
 * mesmo.
 *
 * A falha é silenciosa de propósito: é preferência de navegação, e o pior
 * resultado de não gravar é cair no ambiente do artista no próximo login. Um
 * erro na tela por causa disso seria desproporcional.
 */
export function RegistrarAmbiente({ papel, acao }: PropsRegistrarAmbiente) {
  useEffect(() => {
    void acao(papel).catch((erro: unknown) => {
      console.error('[shell] não foi possível registrar o ambiente em uso:', erro);
    });
  }, [papel, acao]);

  return null;
}
