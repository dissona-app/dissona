import estilos from './Passos.module.css';

export type PropsPassos = {
  readonly passos: readonly string[];
  /** Indice do passo atual, base zero. */
  readonly atual: number;
  readonly rotulo?: string;
};

/**
 * Stepper de wizard - cadastro do curador em 8 passos, envio em 3.
 *
 * E uma lista ordenada de verdade, e nao divs: o leitor de tela anuncia
 * "1 de 8" sem precisar de ARIA extra. O passo atual leva `aria-current`.
 */
export function Passos({ passos, atual, rotulo = 'Progresso' }: PropsPassos) {
  return (
    <nav aria-label={rotulo}>
      <ol className={estilos.base}>
        {passos.map((texto, indice) => {
          const estado =
            indice < atual ? estilos.concluido : indice === atual ? estilos.atual : estilos.futuro;

          return (
            <li key={texto} className={[estilos.passo, estado].filter(Boolean).join(' ')}>
              <span className={estilos.numeral} aria-hidden="true">
                {indice + 1}
              </span>
              <span className={estilos.rotulo} aria-current={indice === atual ? 'step' : undefined}>
                {texto}
              </span>
              {indice < passos.length - 1 ? (
                <span className={estilos.conector} aria-hidden="true" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
