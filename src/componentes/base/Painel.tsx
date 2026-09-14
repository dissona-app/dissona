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
 *
 * ## Por que o `aria-label`
 *
 * `<section>` só é exposta como **landmark `region`** quando tem nome
 * acessível; sem ele, o elemento é genérico e some da lista de regiões do
 * leitor de tela — numa tela com três ou quatro painéis, é a diferença entre
 * navegar por seções e varrer tudo de cima a baixo.
 *
 * `aria-label` e não `aria-labelledby`: apontar para o heading exigiria um id
 * único, e `useId` é hook — este componente é Server Component de propósito,
 * já que não tem estado nenhum. O texto é o mesmo do título, então o custo é
 * uma duplicação que o leitor de tela anuncia como "região, <título>", que é
 * exatamente o esperado.
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
      aria-label={titulo}
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
