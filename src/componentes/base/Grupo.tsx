'use client';

import type { KeyboardEvent } from 'react';
import { useId, useRef } from 'react';

import estilos from './Grupo.module.css';

export type OpcaoGrupo<V extends string> = {
  readonly valor: V;
  readonly rotulo: string;
  readonly desabilitada?: boolean;
};

export type PropsGrupo<V extends string> = {
  readonly rotulo: string;
  readonly opcoes: readonly OpcaoGrupo<V>[];
  readonly valor: V;
  readonly onMudar: (valor: V) => void;
  readonly erro?: string;
  /** Esconde o rótulo visualmente, mantendo-o para leitor de tela. */
  readonly rotuloOculto?: boolean;
};

/**
 * Segmented control com o padrão de teclado de `radiogroup`
 * (design-system.md §4.3): um único ponto de tabulação no grupo, e ←/→ move a
 * seleção entre as opções. Sem isso o teclado precisaria de um Tab por opção.
 */
export function Grupo<V extends string>({
  rotulo,
  opcoes,
  valor,
  onMudar,
  erro,
  rotuloOculto = false,
}: PropsGrupo<V>) {
  const id = useId();
  const idErro = `${id}-erro`;
  const trilha = useRef<HTMLDivElement>(null);

  const habilitadas = opcoes.filter((opcao) => opcao.desabilitada !== true);

  function mover(passo: number) {
    if (habilitadas.length === 0) return;
    const atual = habilitadas.findIndex((opcao) => opcao.valor === valor);
    // Circular: da última com → volta para a primeira.
    const proximo = (atual + passo + habilitadas.length) % habilitadas.length;
    const escolhida = habilitadas[proximo];
    if (escolhida === undefined) return;
    onMudar(escolhida.valor);
    // O foco acompanha a seleção, como manda o padrão de radiogroup.
    trilha.current?.querySelector<HTMLButtonElement>(`[data-valor="${escolhida.valor}"]`)?.focus();
  }

  function aoTeclar(evento: KeyboardEvent<HTMLDivElement>) {
    if (evento.key === 'ArrowRight' || evento.key === 'ArrowDown') {
      evento.preventDefault();
      mover(1);
    } else if (evento.key === 'ArrowLeft' || evento.key === 'ArrowUp') {
      evento.preventDefault();
      mover(-1);
    }
  }

  return (
    <div className={estilos.envolvente}>
      <span className={rotuloOculto ? 'dsn-apenas-leitor' : estilos.rotulo} id={id}>
        {rotulo}
      </span>

      <div
        ref={trilha}
        className={estilos.trilha}
        role="radiogroup"
        aria-labelledby={id}
        aria-describedby={erro !== undefined ? idErro : undefined}
        onKeyDown={aoTeclar}
      >
        {opcoes.map((opcao) => {
          const selecionada = opcao.valor === valor;
          return (
            <button
              key={opcao.valor}
              type="button"
              role="radio"
              data-valor={opcao.valor}
              aria-checked={selecionada}
              // Um só ponto de tabulação por grupo (§4.3).
              tabIndex={selecionada ? 0 : -1}
              disabled={opcao.desabilitada}
              className={[estilos.opcao, selecionada ? estilos.ativa : undefined]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onMudar(opcao.valor)}
            >
              {opcao.rotulo}
            </button>
          );
        })}
      </div>

      {erro !== undefined ? (
        <span className={estilos.erro} id={idErro} role="alert">
          {erro}
        </span>
      ) : null}
    </div>
  );
}
