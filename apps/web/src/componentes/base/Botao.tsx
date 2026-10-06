import type { ButtonHTMLAttributes, ReactNode } from 'react';

import estilos from './Botao.module.css';

export type VarianteBotao =
  | 'primario'
  | 'secundario'
  | 'ghost'
  | 'neutro'
  /** Texto em vermelho, sem caixa — "Remover" numa linha de lista. */
  | 'destrutivo'
  /**
   * Vermelho sólido. É o botão que **executa** a ação destrutiva dentro do
   * diálogo de confirmação ("Excluir minha conta"), e o único vermelho cheio do
   * protótipo — fora dele, vermelho é aviso, não convite.
   */
  | 'perigo'
  /**
   * Vermelho com contorno. É o que **abre** a confirmação ("Excluir conta"):
   * diz que a consequência é grave sem ter o peso de um primário.
   */
  | 'perigoContorno';
export type TamanhoBotao = 'md' | 'denso' | 'sm';

export type PropsBotao = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> & {
  readonly variante?: VarianteBotao;
  readonly tamanho?: TamanhoBotao;
  readonly carregando?: boolean;
  readonly blocoInteiro?: boolean;
  readonly children: ReactNode;
};

const CLASSE_TAMANHO: Record<TamanhoBotao, string> = {
  md: estilos.md ?? '',
  denso: estilos.denso ?? '',
  sm: estilos.sm ?? '',
};

const CLASSE_VARIANTE: Record<VarianteBotao, string> = {
  primario: estilos.primario ?? '',
  secundario: estilos.secundario ?? '',
  ghost: estilos.ghost ?? '',
  neutro: estilos.neutro ?? '',
  destrutivo: estilos.destrutivo ?? '',
  perigo: estilos.perigo ?? '',
  perigoContorno: estilos.perigoContorno ?? '',
};

/** Variantes sem caixa não recebem padding de tamanho. */
const SEM_CAIXA: readonly VarianteBotao[] = ['ghost', 'destrutivo'];

export function Botao({
  variante = 'primario',
  tamanho = 'md',
  carregando = false,
  blocoInteiro = false,
  disabled = false,
  type = 'button',
  children,
  ...resto
}: PropsBotao) {
  const classes = [
    estilos.base,
    CLASSE_VARIANTE[variante],
    SEM_CAIXA.includes(variante) ? estilos.semPadding : CLASSE_TAMANHO[tamanho],
    blocoInteiro ? estilos.blocoInteiro : undefined,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      {...resto}
      type={type}
      className={classes}
      // Carregando desabilita de fato: sem isto, um duplo clique dispara a
      // Server Action duas vezes e pode consumir Clave em dobro.
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
    >
      {carregando ? <span className={estilos.spinner} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
