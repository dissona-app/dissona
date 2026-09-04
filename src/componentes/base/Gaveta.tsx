'use client';

import type { MouseEvent, ReactNode } from 'react';
import { useId, useRef } from 'react';

import { useDialogo } from '@/hooks/useDialogo';

import estilos from './Gaveta.module.css';

export type PropsGaveta = {
  readonly aberta: boolean;
  readonly onFechar: () => void;
  readonly titulo: string;
  readonly descricao?: string;
  readonly estreita?: boolean;
  readonly rodape?: ReactNode;
  readonly children: ReactNode;
};

/**
 * Painel lateral. Usado para detalhe de item sem perder a lista de trás —
 * detalhe da fila do curador (13.1), detalhe de usuário no admin (20).
 *
 * Mesmo contrato de acessibilidade do `Modal`: é um diálogo modal, com foco
 * preso, ESC e devolução de foco.
 */
export function Gaveta({
  aberta,
  onFechar,
  titulo,
  descricao,
  estreita = false,
  rodape,
  children,
}: PropsGaveta) {
  const caixa = useRef<HTMLDivElement>(null);
  const id = useId();
  const idTitulo = `${id}-titulo`;
  const idDescricao = `${id}-descricao`;

  useDialogo({ aberto: aberta, onFechar, containerRef: caixa });

  if (!aberta) return null;

  function aoClicarNoBackdrop(evento: MouseEvent<HTMLDivElement>) {
    if (evento.target === evento.currentTarget) onFechar();
  }

  return (
    <div className={estilos.backdrop} onMouseDown={aoClicarNoBackdrop}>
      <div
        ref={caixa}
        className={[estilos.caixa, estreita ? estilos.estreita : undefined]
          .filter(Boolean)
          .join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={descricao !== undefined ? idDescricao : undefined}
        tabIndex={-1}
      >
        <div className={estilos.cabecalho}>
          <div>
            <h2 className={estilos.titulo} id={idTitulo}>
              {titulo}
            </h2>
            {descricao !== undefined ? (
              <p className={estilos.descricao} id={idDescricao}>
                {descricao}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            className={estilos.fechar}
            onClick={onFechar}
            aria-label="Fechar"
            title="Fechar"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className={estilos.corpo}>{children}</div>

        {rodape !== undefined ? <div className={estilos.rodape}>{rodape}</div> : null}
      </div>
    </div>
  );
}
