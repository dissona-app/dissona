import type { ReactNode } from 'react';

import estilos from './EstadoVazio.module.css';

export type PropsEstadoVazio = {
  readonly titulo: string;
  readonly descricao?: string;
  readonly icone?: ReactNode;
  readonly acao?: ReactNode;
};

export function EstadoVazio({ titulo, descricao, icone, acao }: PropsEstadoVazio) {
  return (
    <div className={estilos.base}>
      {icone !== undefined ? (
        <span className={estilos.icone} aria-hidden="true">
          {icone}
        </span>
      ) : null}
      <p className={estilos.titulo}>{titulo}</p>
      {descricao !== undefined ? <p className={estilos.descricao}>{descricao}</p> : null}
      {acao !== undefined ? <div className={estilos.acao}>{acao}</div> : null}
    </div>
  );
}
