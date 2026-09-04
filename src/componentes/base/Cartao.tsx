import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

import estilos from './Cartao.module.css';

export type VarianteCartao = 'padrao' | 'compacto' | 'kpi' | 'autenticacao';

type Comum = {
  readonly variante?: VarianteCartao;
  readonly elevado?: boolean;
  readonly selecionado?: boolean;
  readonly comErro?: boolean;
  readonly children: ReactNode;
};

const CLASSE_VARIANTE: Record<VarianteCartao, string | undefined> = {
  padrao: undefined,
  compacto: estilos.compacto,
  kpi: estilos.kpi,
  autenticacao: estilos.autenticacao,
};

function montarClasses(props: Comum, extra?: string): string {
  return [
    estilos.base,
    CLASSE_VARIANTE[props.variante ?? 'padrao'],
    props.elevado === true ? estilos.elevado : undefined,
    props.selecionado === true ? estilos.selecionado : undefined,
    props.comErro === true ? estilos.comErro : undefined,
    extra,
  ]
    .filter(Boolean)
    .join(' ');
}

export type PropsCartao = Comum & Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'children'>;

export function Cartao({
  variante,
  elevado,
  selecionado,
  comErro,
  children,
  ...resto
}: PropsCartao) {
  const classes = montarClasses({ variante, elevado, selecionado, comErro, children });
  return (
    <div {...resto} className={classes}>
      {children}
    </div>
  );
}

export type PropsCartaoClicavel = Comum &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & {
    /** Reflete selecao em lista de escolha unica - o R2 nao tem radio. */
    readonly pressionado?: boolean;
  };

/**
 * Card selecionavel. E um dos dois padroes de escolha unica do R2, junto do
 * segmented control (design-system.md 2.2.5).
 */
export function CartaoClicavel({
  variante,
  elevado,
  selecionado,
  comErro,
  pressionado,
  type = 'button',
  children,
  ...resto
}: PropsCartaoClicavel) {
  const classes = montarClasses(
    { variante, elevado, selecionado, comErro, children },
    estilos.clicavel,
  );
  return (
    <button {...resto} type={type} className={classes} aria-pressed={pressionado}>
      {children}
    </button>
  );
}
