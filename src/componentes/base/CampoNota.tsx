'use client';

import type { ChangeEvent } from 'react';
import { useId } from 'react';

import estilos from './CampoNota.module.css';

export const NOTA_MINIMA = 0;
export const NOTA_MAXIMA = 5;
/** Uma casa decimal — `nota_criterio` e `avaliacao` guardam `numeric(2,1)`. */
export const NOTA_PASSO = 0.1;

export type PropsCampoNota = {
  readonly rotulo: string;
  /** `null` significa "ainda não avaliado", que é diferente de nota 0. */
  readonly valor: number | null;
  readonly onMudar: (valor: number) => void;
  readonly erro?: string;
  readonly desabilitado?: boolean;
  /** Texto de apoio à direita do rótulo, quando não há nota. */
  readonly textoSemNota?: string;
};

function formatarNota(valor: number): string {
  return valor.toFixed(1).replace('.', ',');
}

/**
 * Nota de 0 a 5 com uma casa decimal (design-system.md §2.2.7).
 *
 * `<input type="range">` nativo: já é operável por teclado, com setas e
 * Home/End, sem nada de ARIA extra. O valor anunciado é **o número**, não a
 * porcentagem que o navegador leria por padrão — exigência do §4.3, item 5.
 *
 * A trilha é preenchida com o gradiente da marca até a posição do valor. Nota
 * ainda não dada deixa a trilha vazia e o polegar no início, e é por isso que
 * `valor` aceita `null`: nota 0,0 é uma avaliação, ausência de nota não é.
 */
export function CampoNota({
  rotulo,
  valor,
  onMudar,
  erro,
  desabilitado = false,
  textoSemNota = 'Sem nota',
}: PropsCampoNota) {
  const id = useId();
  const idErro = `${id}-erro`;

  const efetivo = valor ?? NOTA_MINIMA;
  const fracao = (efetivo - NOTA_MINIMA) / (NOTA_MAXIMA - NOTA_MINIMA);
  const preenchimento = valor === null ? 0 : fracao * 100;

  function aoMudar(evento: ChangeEvent<HTMLInputElement>) {
    onMudar(Number(evento.target.value));
  }

  return (
    <div className={estilos.envolvente}>
      <div className={estilos.linhaRotulo}>
        <label className={estilos.rotulo} htmlFor={id}>
          {rotulo}
        </label>
        {valor === null ? (
          <span className={estilos.semNota}>{textoSemNota}</span>
        ) : (
          <span className={estilos.valor}>{formatarNota(valor)}</span>
        )}
      </div>

      <input
        id={id}
        type="range"
        className={estilos.trilha}
        min={NOTA_MINIMA}
        max={NOTA_MAXIMA}
        step={NOTA_PASSO}
        value={efetivo}
        disabled={desabilitado}
        onChange={aoMudar}
        aria-invalid={erro !== undefined || undefined}
        aria-describedby={erro !== undefined ? idErro : undefined}
        // Sem isto o leitor de tela anuncia "40%" em vez de "2,0".
        aria-valuetext={valor === null ? textoSemNota : formatarNota(valor)}
        style={{
          background:
            valor === null
              ? undefined
              : `var(--dsn-grad-brand-h) left center / ${preenchimento}% 100% no-repeat, var(--dsn-track)`,
        }}
      />

      <div className={estilos.extremos} aria-hidden="true">
        <span>{formatarNota(NOTA_MINIMA)}</span>
        <span>{formatarNota(NOTA_MAXIMA)}</span>
      </div>

      {erro !== undefined ? (
        <span className={estilos.erro} id={idErro} role="alert">
          {erro}
        </span>
      ) : null}
    </div>
  );
}
