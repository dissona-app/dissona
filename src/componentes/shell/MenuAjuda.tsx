'use client';

import type { KeyboardEvent } from 'react';
import { useEffect, useId, useRef, useState } from 'react';

import estilos from './MenuAjuda.module.css';

export type ItemMenu = {
  readonly rotulo: string;
  readonly onAcionar: () => void;
};

export type PropsMenuAjuda = {
  readonly itens: readonly ItemMenu[];
};

/**
 * Dropdown de ajuda — o "Rever onboarding" mora aqui (BACKLOG, TASK-006).
 *
 * O protótipo da R2 não implementa nenhum comportamento de teclado no
 * dropdown do usuário (design-system.md §4.3, item 3). Aqui: ESC fecha, ↑/↓
 * navegam, o foco volta ao disparador ao fechar, e clicar fora fecha.
 */
export function MenuAjuda({ itens }: PropsMenuAjuda) {
  const [aberto, setAberto] = useState(false);
  const envolvente = useRef<HTMLDivElement>(null);
  const disparador = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLUListElement>(null);
  const id = useId();
  const idMenu = `${id}-menu`;

  // Clique fora fecha.
  useEffect(() => {
    if (!aberto) return;
    function aoApontar(evento: PointerEvent) {
      const alvo = evento.target;
      if (alvo instanceof Node && envolvente.current?.contains(alvo) === false) {
        setAberto(false);
      }
    }
    document.addEventListener('pointerdown', aoApontar);
    return () => document.removeEventListener('pointerdown', aoApontar);
  }, [aberto]);

  // Ao abrir, o foco vai para o primeiro item.
  useEffect(() => {
    if (!aberto) return;
    menu.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, [aberto]);

  function fechar(devolverFoco = true) {
    setAberto(false);
    if (devolverFoco) disparador.current?.focus();
  }

  function moverFoco(passo: number) {
    const botoes = Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('button') ?? []);
    if (botoes.length === 0) return;
    const atual = botoes.findIndex((botao) => botao === document.activeElement);
    const proximo = (atual + passo + botoes.length) % botoes.length;
    botoes[proximo]?.focus();
  }

  function aoTeclarNoMenu(evento: KeyboardEvent<HTMLUListElement>) {
    if (evento.key === 'Escape') {
      evento.preventDefault();
      fechar();
    } else if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      moverFoco(1);
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      moverFoco(-1);
    } else if (evento.key === 'Tab') {
      // Tab sai do menu — fecha, mas sem roubar o foco de volta, para que a
      // tabulação siga o fluxo natural da página.
      fechar(false);
    }
  }

  return (
    <div className={estilos.envolvente} ref={envolvente}>
      <button
        ref={disparador}
        type="button"
        className={estilos.disparador}
        onClick={() => setAberto((anterior) => !anterior)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-controls={aberto ? idMenu : undefined}
        aria-label="Ajuda"
        title="Ajuda"
      >
        <span aria-hidden="true">?</span>
      </button>

      {aberto ? (
        <ul ref={menu} id={idMenu} className={estilos.menu} role="menu" onKeyDown={aoTeclarNoMenu}>
          {itens.map((item) => (
            <li key={item.rotulo} role="none">
              <button
                type="button"
                role="menuitem"
                className={estilos.item}
                onClick={() => {
                  item.onAcionar();
                  fechar();
                }}
              >
                {item.rotulo}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
