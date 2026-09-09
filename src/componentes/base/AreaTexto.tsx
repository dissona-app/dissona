'use client';

import type { TextareaHTMLAttributes } from 'react';
import { useId } from 'react';

import estilos from './AreaTexto.module.css';

export type VarianteAreaTexto = 'bio' | 'contexto' | 'bioCurador' | 'justificativa';

export type PropsAreaTexto = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'className' | 'id'
> & {
  readonly rotulo: string;
  readonly erro?: string;
  readonly variante?: VarianteAreaTexto;
  /**
   * Mostra o contador de caracteres. Os limites são números de negócio —
   * feedback 150, justificativa 250, bio 280 — e vêm de `configuracao`; este
   * componente só exibe o que recebe.
   */
  readonly limite?: number;
};

const CLASSE_VARIANTE: Record<VarianteAreaTexto, string | undefined> = {
  bio: estilos.bio,
  contexto: estilos.contexto,
  bioCurador: estilos.bioCurador,
  justificativa: estilos.justificativa,
};

export function AreaTexto({
  rotulo,
  erro,
  variante = 'contexto',
  limite,
  required = false,
  value,
  ...resto
}: PropsAreaTexto) {
  const id = useId();
  const idErro = `${id}-erro`;
  const idContador = `${id}-contador`;

  const usados = typeof value === 'string' ? value.length : 0;
  const excedido = limite !== undefined && usados > limite;

  const descricoes = [erro !== undefined ? idErro : null, limite !== undefined ? idContador : null]
    .filter(Boolean)
    .join(' ');

  const classes = [
    estilos.entrada,
    CLASSE_VARIANTE[variante],
    erro !== undefined || excedido ? estilos.invalido : undefined,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={estilos.envolvente}>
      <label
        className={[estilos.rotulo, required ? estilos.rotuloObrigatorio : undefined]
          .filter(Boolean)
          .join(' ')}
        htmlFor={id}
      >
        {rotulo}
      </label>

      <textarea
        {...resto}
        id={id}
        value={value}
        className={classes}
        required={required}
        aria-required={required || undefined}
        aria-invalid={erro !== undefined || excedido || undefined}
        aria-describedby={descricoes === '' ? undefined : descricoes}
      />

      {erro !== undefined || limite !== undefined ? (
        <div className={estilos.rodape}>
          {erro !== undefined ? (
            <span className={estilos.erro} id={idErro} role="alert">
              {erro}
            </span>
          ) : null}
          {limite !== undefined ? (
            <span
              className={[estilos.contador, excedido ? estilos.contadorExcedido : undefined]
                .filter(Boolean)
                .join(' ')}
              id={idContador}
            >
              {usados}/{limite}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
