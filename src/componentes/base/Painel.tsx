import type { ReactNode } from 'react';

import estilos from './Painel.module.css';

export type PropsPainel = {
  readonly titulo: string;
  readonly sublegenda?: string;
  /** Botao ou link a direita do titulo. */
  readonly acao?: ReactNode;
  readonly semMoldura?: boolean;
  /** Nivel do heading. A pagina define a hierarquia, nao o componente. */
  readonly nivel?: 2 | 3 | 4;
  readonly children: ReactNode;
};

/**
 * Secao de pagina.
 *
 * O nivel do heading e parametro porque a hierarquia de headings tem de ser
 * continua na pagina (design-system 4.6): um painel dentro de outro nao pode
 * repetir o mesmo nivel.
 */
export function Painel({
  titulo,
  sublegenda,
  acao,
  semMoldura = false,
  nivel = 2,
  children,
}: PropsPainel) {
  const Titulo = (nivel === 2 ? 'h2' : nivel === 3 ? 'h3' : 'h4') as 'h2' | 'h3' | 'h4';

  return (
    <section
      className={[estilos.base, semMoldura ? estilos.semMoldura : undefined]
        .filter(Boolean)
        .join(' ')}
    >
      <div className={estilos.cabecalho}>
        <div className={estilos.textos}>
          <Titulo className={estilos.titulo}>{titulo}</Titulo>
          {sublegenda !== undefined ? (
            <span className={estilos.sublegenda}>{sublegenda}</span>
          ) : null}
        </div>
        {acao !== undefined ? <div className={estilos.acao}>{acao}</div> : null}
      </div>

      <div className={estilos.corpo}>{children}</div>
    </section>
  );
}
