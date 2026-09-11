'use client';

import Link from 'next/link';
import type { KeyboardEvent, ReactNode } from 'react';
import { useEffect, useId, useRef, useState } from 'react';

import estilos from './MenuAjuda.module.css';

/**
 * Um item do menu, em três formas — e cada uma existe por uma razão.
 *
 *  - `href`: navegação. "Rever onboarding" e "Configurações" são links, e devem
 *    ser anunciados como links.
 *  - `acao`: Server Action. "Sair" precisa de POST, e como `<form>` ele
 *    funciona **sem JavaScript** — num menu de conta isso importa, porque sair
 *    é a saída de emergência de qualquer estado quebrado.
 *  - `onAcionar`: só para o que é puramente de cliente.
 */
export type ItemMenu = {
  readonly rotulo: string;
  readonly href?: string;
  /**
   * Server Action. A assinatura é a que `<form action>` exige — ela recebe o
   * `FormData` mesmo quando não o usa, e `sair` (que devolve `Promise<never>`,
   * porque redireciona) encaixa nela sem ajuste.
   */
  readonly acao?: (dados: FormData) => void | Promise<void>;
  readonly onAcionar?: () => void;
};

export type PropsMenuAjuda = {
  readonly itens: readonly ItemMenu[];
  /** Conteúdo do disparador. Padrão: o "?" de ajuda. */
  readonly disparador?: ReactNode;
  /** Rótulo acessível do disparador. */
  readonly rotulo?: string;
  /** Bloco de identificação no topo do menu — o nome e o e-mail da conta. */
  readonly cabecalho?: ReactNode;
};

/**
 * Dropdown do header — o menu de ajuda e o menu da conta.
 *
 * O protótipo da R2 não implementa comportamento de teclado nenhum no dropdown
 * do usuário (design-system.md §4.3, item 3). Aqui: ESC fecha, ↑/↓ navegam, o
 * foco volta ao disparador ao fechar, e clicar fora fecha.
 *
 * Um componente para os dois menus, e não dois: a mecânica de foco é a parte
 * difícil e a parte que se quebra em silêncio. Duplicá-la garantiria que um dos
 * dois ficasse sem ESC no primeiro refactor.
 */
export function MenuAjuda({ itens, disparador, rotulo = 'Ajuda', cabecalho }: PropsMenuAjuda) {
  const [aberto, setAberto] = useState(false);
  const envolvente = useRef<HTMLDivElement>(null);
  const gatilho = useRef<HTMLButtonElement>(null);
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

  // Ao abrir, o foco vai para o primeiro item — seja ele link ou botão.
  useEffect(() => {
    if (!aberto) return;
    menu.current?.querySelector<HTMLElement>('a, button')?.focus();
  }, [aberto]);

  function fechar(devolverFoco = true) {
    setAberto(false);
    if (devolverFoco) gatilho.current?.focus();
  }

  function moverFoco(passo: number) {
    const focaveis = Array.from(menu.current?.querySelectorAll<HTMLElement>('a, button') ?? []);
    if (focaveis.length === 0) return;
    const atual = focaveis.findIndex((elemento) => elemento === document.activeElement);
    const proximo = (atual + passo + focaveis.length) % focaveis.length;
    focaveis[proximo]?.focus();
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
        ref={gatilho}
        type="button"
        className={disparador === undefined ? estilos.disparador : estilos.disparadorLivre}
        onClick={() => setAberto((anterior) => !anterior)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-controls={aberto ? idMenu : undefined}
        aria-label={rotulo}
        title={rotulo}
      >
        {disparador ?? <span aria-hidden="true">?</span>}
      </button>

      {aberto ? (
        <ul ref={menu} id={idMenu} className={estilos.menu} role="menu" onKeyDown={aoTeclarNoMenu}>
          {cabecalho !== undefined ? (
            <li className={estilos.cabecalho} role="none">
              {cabecalho}
            </li>
          ) : null}

          {itens.map((item) => (
            <li key={item.rotulo} role="none">
              <ItemDoMenu item={item} aoConcluir={() => fechar()} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ItemDoMenu({
  item,
  aoConcluir,
}: {
  readonly item: ItemMenu;
  readonly aoConcluir: () => void;
}) {
  if (item.href !== undefined) {
    return (
      <Link role="menuitem" className={estilos.item} href={item.href}>
        {item.rotulo}
      </Link>
    );
  }

  if (item.acao !== undefined) {
    // `<form action>` com Server Action: navega por POST e funciona sem JS.
    // Sem `aoConcluir` — a ação redireciona, e o menu vai embora com a página.
    return (
      <form action={item.acao}>
        <button type="submit" role="menuitem" className={estilos.item}>
          {item.rotulo}
        </button>
      </form>
    );
  }

  return (
    <button
      type="button"
      role="menuitem"
      className={estilos.item}
      onClick={() => {
        item.onAcionar?.();
        aoConcluir();
      }}
    >
      {item.rotulo}
    </button>
  );
}
