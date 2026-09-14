import type { ReactNode } from 'react';

import { CURADOR_CADASTRO } from '@/textos/curador';

import estilos from './MolduraDoWizard.module.css';
import { OndasDeFundo } from '@/componentes/autenticacao/OndasDeFundo';

export type PropsMolduraDoWizard = {
  /** 1 a 8. Decide o título, o subtítulo e a barra de progresso. */
  readonly passo: number;
  readonly total: number;
  /**
   * Painel ao lado — só o passo 1 tem, e por isso ele é o único `cCentrado:
   * false` do protótipo.
   */
  readonly aside?: ReactNode;
  /**
   * O conteúdo do passo — e ele inclui o `<form>` **inteiro**, rodapé
   * incluído.
   *
   * A moldura não tem slot de ações de propósito: "Voltar", "Pular" e
   * "Continuar" são três `type="submit"` do mesmo formulário, distinguidos por
   * `formAction`, e um slot fora do `<form>` os quebraria.
   */
  readonly children: ReactNode;
};

/**
 * Moldura dos oito passos — Design System §3.3 e §3.4 ("formulário em passos").
 *
 * Tela cheia, fora do shell do curador. É por isso que o wizard mora em
 * `(app)/(cadastro)` e não em `(app)/(painel)`: no protótipo ele não tem
 * sidebar, e no primeiro acesso não haveria o que navegar nela.
 *
 * As larguras por passo são as do protótipo — `['404px','720px','720px',
 * '760px','620px','760px','560px','660px']` —, e elas não são decorativas: o
 * passo 2 tem doze chips de gênero e precisa de 720px para não virar uma
 * coluna; o passo 7 tem uma bio e fica melhor estreito. Vêm por variável CSS
 * para não exigir uma classe por passo.
 *
 * A barra de progresso é `<progress>` de verdade, e não uma `<div>` com
 * `width`: o valor é anunciado por leitor de tela sem `role` nem `aria-*`
 * escritos à mão.
 */
export function MolduraDoWizard({ passo, total, aside, children }: PropsMolduraDoWizard) {
  const indice = Math.min(Math.max(passo, 1), total) - 1;
  const titulo = CURADOR_CADASTRO.titulos[indice] ?? CURADOR_CADASTRO.titulos[0];
  const subtitulo = CURADOR_CADASTRO.subtitulos[indice] ?? CURADOR_CADASTRO.subtitulos[0];
  const largura = LARGURA_POR_PASSO[indice] ?? '660px';

  return (
    <div className={estilos.pagina}>
      <OndasDeFundo />

      <progress
        className={estilos.progresso}
        value={passo}
        max={total}
        aria-label={CURADOR_CADASTRO.passoDe(passo, total)}
      />

      <main
        className={aside === undefined ? estilos.miolo : estilos.mioloDividido}
        style={{ '--wizard-largura': largura } as React.CSSProperties}
      >
        {aside === undefined ? null : <aside className={estilos.painel}>{aside}</aside>}

        <div className={estilos.coluna}>
          <div className={estilos.cabecalho}>
            <span className={estilos.contador}>{CURADOR_CADASTRO.passoDe(passo, total)}</span>
            {/* Passo 1 divide a tela com o painel de marca, e ali o título é um
                degrau menor — ver `.tituloEstreito` no CSS. */}
            <h1 className={aside === undefined ? estilos.titulo : tituloEstreito}>{titulo}</h1>
            <p className={aside === undefined ? estilos.subtitulo : subtituloEstreito}>
              {subtitulo}
            </p>
          </div>

          {children}
        </div>
      </main>
    </div>
  );
}

/** Larguras medidas no protótipo, uma por passo. */
const LARGURA_POR_PASSO = [
  '404px',
  '720px',
  '720px',
  '760px',
  '620px',
  '760px',
  '560px',
  '660px',
] as const;

const tituloEstreito = `${estilos.titulo ?? ''} ${estilos.tituloEstreito ?? ''}`;
const subtituloEstreito = `${estilos.subtitulo ?? ''} ${estilos.subtituloEstreito ?? ''}`;
