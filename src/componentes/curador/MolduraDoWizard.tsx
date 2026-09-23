import type { ReactNode } from 'react';

import { OndasDeFundo } from '@/componentes/autenticacao/OndasDeFundo';
import { CURADOR_CADASTRO } from '@/textos/curador';

import estilos from './MolduraDoWizard.module.css';
import { OndasDoPainel } from './OndasDoPainel';

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
 * A barra de progresso é `<progress>` de verdade, e não uma `<div>` com
 * `width`: o valor é anunciado por leitor de tela sem `role` nem `aria-*`
 * escritos à mão.
 */
export function MolduraDoWizard({ passo, total, aside, children }: PropsMolduraDoWizard) {
  const indice = Math.min(Math.max(passo, 1), total) - 1;
  const titulo = CURADOR_CADASTRO.titulos[indice] ?? CURADOR_CADASTRO.titulos[0];
  const subtitulo = CURADOR_CADASTRO.subtitulos[indice] ?? CURADOR_CADASTRO.subtitulos[0];
  const largura = LARGURA_POR_PASSO[indice] ?? '660px';
  const contador = CURADOR_CADASTRO.passoDe(passo, total);

  const progresso = (
    <progress className={estilos.progresso} value={passo} max={total} aria-label={contador} />
  );

  if (aside !== undefined) {
    return (
      <MolduraDividida
        progresso={progresso}
        aside={aside}
        contador={contador}
        titulo={titulo}
        subtitulo={subtitulo}
      >
        {children}
      </MolduraDividida>
    );
  }

  return (
    <div className={estilos.pagina}>
      <OndasDeFundo />

      {progresso}

      <main
        className={estilos.miolo}
        style={{ '--wizard-largura': largura } as React.CSSProperties}
      >
        <div className={estilos.coluna}>
          <div className={estilos.cabecalho}>
            <span className={estilos.contador}>{contador}</span>
            <h1 className={estilos.titulo}>{titulo}</h1>
            <p className={estilos.subtitulo}>{subtitulo}</p>
          </div>

          {children}
        </div>
      </main>
    </div>
  );
}

/**
 * O passo 1 — `docs/R2/extraido/Curador.html`, ramo `cStep1`.
 *
 * Não é um card ao lado do formulário: é a tela dividida em duas colunas de
 * altura inteira (`grid-template-columns: 46% minmax(0,1fr)`). À esquerda, o
 * painel de marca com as ondas **dentro dele**, logotipo no alto e a promessa
 * embaixo; à direita, fundo branco, o contador no canto superior direito, o
 * formulário centrado na vertical e o rodapé preso ao pé da coluna.
 *
 * ## O rodapé preso ao pé, com o botão dentro do `<form>`
 *
 * No protótipo o rodapé é irmão do `<main>`, e os botões dele submetem o
 * passo. Aqui eles precisam estar **dentro** do `<form>` do passo — que é de
 * quem chama. O `<form>` vira `display: contents` (`.corpoDividido > form`):
 * a caixa dele some, e os filhos — o corpo dos campos e o rodapé — viram
 * itens diretos desta coluna flex. Com `margin-top: auto` no título e no
 * rodapé, o espaço livre se divide em dois: o bloco título+campos fica
 * centrado, e o rodapé encosta embaixo. Sem `role` nenhum perdido: um `<form>`
 * sem nome acessível não é *landmark*.
 *
 * ## O breakpoint de 980px é do protótipo
 *
 * `cSplitCols: s.w < 980 ? 'minmax(0,1fr)' : '46% minmax(0,1fr)'` e
 * `cSplitDisplay: s.w < 980 ? 'none' : 'flex'`. É o único `@media` desta
 * moldura, e não é inventado — os `@media` que a pendência #24 proíbe são os
 * que ninguém desenhou.
 */
function MolduraDividida({
  progresso,
  aside,
  contador,
  titulo,
  subtitulo,
  children,
}: {
  readonly progresso: ReactNode;
  readonly aside: ReactNode;
  readonly contador: string;
  readonly titulo: string;
  readonly subtitulo: string;
  readonly children: ReactNode;
}) {
  return (
    <div className={estilos.paginaDividida}>
      {progresso}

      <aside className={estilos.painelDividido}>
        <OndasDoPainel />
        {aside}
      </aside>

      <div className={estilos.colunaDividida}>
        <header className={estilos.cabecalhoDividido}>
          <span className={estilos.contador}>{contador}</span>
        </header>

        <main className={estilos.corpoDividido}>
          <div className={estilos.tituloDividido}>
            <h1 className={`${estilos.titulo ?? ''} ${estilos.tituloEstreito ?? ''}`}>{titulo}</h1>
            <p className={`${estilos.subtitulo ?? ''} ${estilos.subtituloEstreito ?? ''}`}>
              {subtitulo}
            </p>
          </div>

          {children}
        </main>
      </div>
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
