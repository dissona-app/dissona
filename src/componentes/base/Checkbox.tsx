'use client';

import type { InputHTMLAttributes, ReactNode } from 'react';
import { useId } from 'react';

import estilos from './Checkbox.module.css';

export type PropsCheckbox = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'className' | 'id' | 'type' | 'children'
> & {
  /** Conteúdo do rótulo. Aceita nó porque o aceite de termos tem dois links. */
  readonly children: ReactNode;
  /** Texto já traduzido pela View. */
  readonly erro?: string;
};

/**
 * Caixa de seleção — Design System §2.2.4.
 *
 * O protótipo desenha a caixa como um `<span>`, sem `<input type="checkbox">`
 * nenhum. Aqui existe um input de verdade, visualmente escondido, e o `<span>`
 * é só a pintura. A diferença não é purismo:
 *
 *  - **Sem JavaScript o formulário continua funcionando.** Um `<span>` com
 *    `onClick` não vai no `FormData`, e o cadastro é a tela em que uma falha de
 *    hidratação impediria alguém de criar conta.
 *  - **Teclado e leitor de tela de graça.** Espaço alterna, `Tab` alcança,
 *    `aria-invalid` e `aria-describedby` funcionam sem `role="checkbox"` nem
 *    gestão manual de `aria-checked`.
 *
 * O foco visível fica no `<span>` via `:focus-visible` do input irmão — é o que
 * mantém o anel de foco do Design System §4.3 sobre a caixa pintada.
 */
export function Checkbox({ children, erro, required = false, ...resto }: PropsCheckbox) {
  const id = useId();
  const idErro = `${id}-erro`;

  return (
    <div className={estilos.envolvente}>
      <label className={estilos.rotulo} htmlFor={id}>
        <input
          {...resto}
          id={id}
          type="checkbox"
          className={estilos.entrada}
          required={required}
          aria-required={required || undefined}
          aria-invalid={erro !== undefined || undefined}
          aria-describedby={erro === undefined ? undefined : idErro}
        />
        <span
          className={[estilos.caixa, erro !== undefined ? estilos.invalida : undefined]
            .filter(Boolean)
            .join(' ')}
          aria-hidden="true"
        >
          <svg
            className={estilos.marca}
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            focusable="false"
          >
            <path d="m5 13 4.5 4.5L19 7" />
          </svg>
        </span>
        <span className={estilos.texto}>{children}</span>
      </label>

      {erro !== undefined ? (
        <span className={estilos.erro} id={idErro} role="alert">
          {erro}
        </span>
      ) : null}
    </div>
  );
}
