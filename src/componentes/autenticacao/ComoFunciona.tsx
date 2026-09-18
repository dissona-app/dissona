import estilos from './ComoFunciona.module.css';

export type PassoNumerado = {
  readonly numero: string;
  readonly titulo: string;
  readonly texto: string;
};

export type PropsComoFunciona = {
  /** Rótulo de 11 px acima do título. */
  readonly overline?: string;
  readonly titulo: string;
  readonly passos: readonly PassoNumerado[];
  /** A nota de LGPD do pé. */
  readonly nota?: string;
};

/**
 * O painel "Como funciona" da tela 1.1 — o aside da moldura de autenticação.
 *
 * Componente próprio, e não JSX solto na página, porque o painel da 1.5 se
 * parece com ele: mesma coluna, mesmo overline, quatro passos numerados. Não é
 * o mesmo, e a separação deixa isso explícito — lá as linhas são **botões**
 * que saltam para o passo do tour (`NavegadorDoTour`), aqui é texto estático
 * com título grande e a nota de LGPD no pé.
 *
 * `<h2>`, e não `<h1>`: o `<h1>` da página é o card à esquerda.
 */
export function ComoFunciona({ overline, titulo, passos, nota }: PropsComoFunciona) {
  return (
    <>
      <div className={estilos.cabecalho}>
        {overline !== undefined ? <span className={estilos.overline}>{overline}</span> : null}
        <h2 className={estilos.titulo}>{titulo}</h2>
      </div>

      <ol className={estilos.passos}>
        {passos.map((passo) => (
          <li key={passo.numero} className={estilos.passo}>
            <span className={estilos.passoNumero} aria-hidden="true">
              {passo.numero}
            </span>
            <span className={estilos.passoTexto}>
              <strong className={estilos.passoTitulo}>{passo.titulo}</strong>
              {passo.texto}
            </span>
          </li>
        ))}
      </ol>

      {nota !== undefined ? <p className={estilos.nota}>{nota}</p> : null}
    </>
  );
}
