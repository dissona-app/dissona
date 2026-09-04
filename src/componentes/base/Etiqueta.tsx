import type { ReactNode } from 'react';

import estilos from './Etiqueta.module.css';

export type TomEtiqueta = 'neutro' | 'info' | 'sucesso' | 'alerta' | 'erro';
export type DotEtiqueta = 'sucesso' | 'pendente' | 'desativado' | 'erro';

export type PropsEtiqueta = {
  readonly tom?: TomEtiqueta;
  /** Dot colorido a esquerda. Indicador grafico, nunca a unica pista. */
  readonly dot?: DotEtiqueta;
  readonly children: ReactNode;
};

const CLASSE_TOM: Record<TomEtiqueta, string | undefined> = {
  neutro: estilos.neutro,
  info: estilos.info,
  sucesso: estilos.sucesso,
  alerta: estilos.alerta,
  erro: estilos.erro,
};

const CLASSE_DOT: Record<DotEtiqueta, string | undefined> = {
  sucesso: estilos.dotSucesso,
  pendente: estilos.dotPendente,
  desativado: estilos.dotDesativado,
  erro: estilos.dotErro,
};

/**
 * Badge de status.
 *
 * O texto e sempre a informacao; o dot apenas reforca. Status comunicado so
 * por cor reprovaria a WCAG 1.4.1.
 */
export function Etiqueta({ tom = 'neutro', dot, children }: PropsEtiqueta) {
  return (
    <span className={[estilos.base, CLASSE_TOM[tom]].filter(Boolean).join(' ')}>
      {dot !== undefined ? (
        <span
          className={[estilos.dot, CLASSE_DOT[dot]].filter(Boolean).join(' ')}
          aria-hidden="true"
        />
      ) : null}
      {children}
    </span>
  );
}
