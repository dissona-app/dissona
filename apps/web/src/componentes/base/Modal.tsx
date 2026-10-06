'use client';

import type { MouseEvent, ReactNode } from 'react';
import { useId, useRef } from 'react';

import { useDialogo } from '@/hooks/useDialogo';

import estilos from './Modal.module.css';

export type LarguraModal = 'estreita' | 'padrao' | 'larga';

/**
 * Cor do overline. É a única pista de cor do cabeçalho, e o protótipo a usa
 * para dizer de que natureza é o diálogo: neutro para reautenticação, vermelho
 * para o passo que apaga, laranja para a exclusão de pacote. O texto sempre
 * carrega a informação sozinho — a cor só reforça (WCAG 1.4.1).
 */
export type TomDoOverline = 'neutro' | 'perigo' | 'marca';

export type PropsModal = {
  readonly aberto: boolean;
  readonly onFechar: () => void;
  /**
   * Overline acima do título — "Reautenticação", "Passo 1 de 2 · LGPD".
   *
   * Vive no componente, e não no corpo de cada diálogo, porque no protótipo ele
   * é a **primeira** linha do cabeçalho: escrito no corpo, ele apareceria depois
   * da descrição, o que inverte a ordem de leitura ("por que estou vendo isto"
   * vem antes do que é).
   */
  readonly overline?: string;
  readonly tomDoOverline?: TomDoOverline;
  readonly titulo: string;
  readonly descricao?: string;
  readonly largura?: LarguraModal;
  readonly rodape?: ReactNode;
  /**
   * Impede fechar por clique no backdrop e por ESC. Para confirmação
   * destrutiva e para checkout em andamento, onde fechar sem querer custa
   * caro.
   */
  readonly persistente?: boolean;
  readonly children: ReactNode;
};

const CLASSE_TOM_OVERLINE: Record<TomDoOverline, string | undefined> = {
  neutro: undefined,
  perigo: estilos.overlinePerigo,
  marca: estilos.overlineMarca,
};

const CLASSE_LARGURA: Record<LarguraModal, string | undefined> = {
  estreita: estilos.estreita,
  padrao: undefined,
  larga: estilos.larga,
};

/**
 * Diálogo modal.
 *
 * Foco preso, ESC, devolução de foco ao disparador e bloqueio de rolagem do
 * fundo vêm de `useDialogo` — nenhum deles existe no protótipo da R2.
 */
export function Modal({
  aberto,
  onFechar,
  overline,
  tomDoOverline = 'neutro',
  titulo,
  descricao,
  largura = 'padrao',
  rodape,
  persistente = false,
  children,
}: PropsModal) {
  const caixa = useRef<HTMLDivElement>(null);
  const id = useId();
  const idTitulo = `${id}-titulo`;
  const idDescricao = `${id}-descricao`;

  useDialogo({
    aberto,
    onFechar: persistente ? () => undefined : onFechar,
    containerRef: caixa,
  });

  if (!aberto) return null;

  function aoClicarNoBackdrop(evento: MouseEvent<HTMLDivElement>) {
    // Só o clique no próprio backdrop fecha; clique que começou dentro da
    // caixa e terminou fora (arrastar seleção de texto) não deve fechar.
    if (persistente) return;
    if (evento.target === evento.currentTarget) onFechar();
  }

  return (
    <div className={estilos.backdrop} onMouseDown={aoClicarNoBackdrop}>
      <div
        ref={caixa}
        className={[estilos.caixa, CLASSE_LARGURA[largura]].filter(Boolean).join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={descricao !== undefined ? idDescricao : undefined}
        // Recebe foco quando o diálogo não tem controle focável nenhum.
        tabIndex={-1}
      >
        <div className={estilos.cabecalho}>
          <div className={estilos.textos}>
            {overline !== undefined ? (
              <span
                className={[estilos.overline, CLASSE_TOM_OVERLINE[tomDoOverline]]
                  .filter(Boolean)
                  .join(' ')}
              >
                {overline}
              </span>
            ) : null}
            <h2 className={estilos.titulo} id={idTitulo}>
              {titulo}
            </h2>
            {descricao !== undefined ? (
              <p className={estilos.descricao} id={idDescricao}>
                {descricao}
              </p>
            ) : null}
          </div>

          {persistente ? null : (
            <button
              type="button"
              className={estilos.fechar}
              onClick={onFechar}
              aria-label="Fechar"
              title="Fechar"
            >
              <span aria-hidden="true">×</span>
            </button>
          )}
        </div>

        <div className={estilos.corpo}>{children}</div>

        {rodape !== undefined ? <div className={estilos.rodape}>{rodape}</div> : null}
      </div>
    </div>
  );
}
