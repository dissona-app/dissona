'use client';

import type { RefObject } from 'react';
import { useEffect } from 'react';

/**
 * Comportamento de diálogo modal: foco preso, ESC, devolução de foco e
 * bloqueio de rolagem do fundo.
 *
 * Nenhum desses comportamentos existe nos protótipos da R2 — lá o backdrop é
 * puramente decorativo (design-system.md §4.3, item 2). Sem eles, o Tab escapa
 * para o conteúdo atrás do modal e quem usa teclado ou leitor de tela fica
 * navegando numa tela que visualmente não está mais lá.
 *
 * Compartilhado por `Modal` e `Gaveta`, que diferem só na apresentação.
 */

const FOCAVEIS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export type OpcoesDialogo = {
  readonly aberto: boolean;
  readonly onFechar: () => void;
  readonly containerRef: RefObject<HTMLElement | null>;
};

export function useDialogo({ aberto, onFechar, containerRef }: OpcoesDialogo): void {
  // Devolve o foco a quem abriu o diálogo, e bloqueia a rolagem do fundo.
  useEffect(() => {
    if (!aberto) return;

    const disparador =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Foco no primeiro controle do diálogo; se não houver, no próprio
    // container, para o leitor de tela anunciar o título.
    const container = containerRef.current;
    const primeiro = container?.querySelector<HTMLElement>(FOCAVEIS);
    (primeiro ?? container)?.focus();

    return () => {
      document.body.style.overflow = overflowAnterior;
      disparador?.focus();
    };
  }, [aberto, containerRef]);

  // ESC fecha, e Tab circula dentro do diálogo.
  useEffect(() => {
    if (!aberto) return;

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        evento.stopPropagation();
        onFechar();
        return;
      }

      if (evento.key !== 'Tab') return;

      const container = containerRef.current;
      if (container === null) return;

      const focaveis = Array.from(container.querySelectorAll<HTMLElement>(FOCAVEIS)).filter(
        (elemento) => elemento.offsetParent !== null,
      );
      if (focaveis.length === 0) {
        // Diálogo sem controle nenhum: não há para onde tabular.
        evento.preventDefault();
        return;
      }

      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (primeiro === undefined || ultimo === undefined) return;

      const ativo = document.activeElement;

      if (evento.shiftKey && (ativo === primeiro || ativo === container)) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && ativo === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    }

    document.addEventListener('keydown', aoTeclar, true);
    return () => document.removeEventListener('keydown', aoTeclar, true);
  }, [aberto, onFechar, containerRef]);
}
