'use client';

import type { SelectHTMLAttributes } from 'react';
import { useId } from 'react';

import estilos from './Selecao.module.css';

export type OpcaoSelecao = {
  readonly valor: string;
  readonly rotulo: string;
  readonly desabilitada?: boolean;
};

export type PropsSelecao = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'className' | 'id' | 'children'
> & {
  readonly rotulo: string;
  readonly opcoes: readonly OpcaoSelecao[];
  readonly erro?: string;
  readonly variante?: 'formulario' | 'tabela';
  /** Rótulo da opção vazia. Sem ele o select não tem estado "nada escolhido". */
  readonly placeholder?: string;
  /**
   * Esconde o rótulo visualmente, mantendo-o para leitor de tela.
   *
   * Para o `<select>` dentro de linha de tabela, onde o cabeçalho da coluna já
   * diz "Papel" e repetir o rótulo em cada uma das quatro linhas é ruído. É o
   * que o protótipo faz com `aria-label="Papel"` — a diferença é que aqui o
   * texto continua sendo um `<label>` de verdade, associado por `htmlFor`, que
   * é mais robusto que um `aria-label` (design-system §4.4).
   */
  readonly rotuloOculto?: boolean;
};

export function Selecao({
  rotulo,
  opcoes,
  erro,
  variante = 'formulario',
  placeholder,
  rotuloOculto = false,
  required = false,
  ...resto
}: PropsSelecao) {
  const id = useId();
  const idErro = `${id}-erro`;

  const classes = [
    estilos.entrada,
    variante === 'tabela' ? estilos.tabela : estilos.formulario,
    erro !== undefined ? estilos.invalido : undefined,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={estilos.envolvente}>
      <label className={rotuloOculto ? 'dsn-apenas-leitor' : estilos.rotulo} htmlFor={id}>
        {rotulo}
      </label>

      <select
        {...resto}
        id={id}
        className={classes}
        required={required}
        aria-required={required || undefined}
        aria-invalid={erro !== undefined || undefined}
        aria-describedby={erro !== undefined ? idErro : undefined}
      >
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {opcoes.map((opcao) => (
          <option key={opcao.valor} value={opcao.valor} disabled={opcao.desabilitada}>
            {opcao.rotulo}
          </option>
        ))}
      </select>

      {erro !== undefined ? (
        <span className={estilos.erro} id={idErro} role="alert">
          {erro}
        </span>
      ) : null}
    </div>
  );
}
