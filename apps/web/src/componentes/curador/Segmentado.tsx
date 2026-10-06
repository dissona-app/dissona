import estilos from './Segmentado.module.css';

export type OpcaoSegmentada = {
  readonly valor: string;
  readonly rotulo: string;
};

export type PropsSegmentado = {
  readonly name: string;
  readonly rotulo: string;
  readonly opcoes: readonly OpcaoSegmentada[];
  readonly valorInicial?: string | undefined;
  readonly erro?: string;
};

/**
 * Escolha única em segmented control, com **radio de verdade**.
 *
 * ## Por que não o `Grupo` do Design System
 *
 * `Grupo` é `role="radiogroup"` feito de `<button>`, com valor controlado por
 * `onMudar`. Isso serve para o que ele foi feito — filtro de lista, em que o
 * valor não é enviado —, e não serve aqui por duas razões:
 *
 *  - `<button>` não vai no `FormData`. Usá-lo num formulário exigiria estado
 *    controlado mais um `<input type="hidden">`, e sem JavaScript o hidden
 *    ficaria travado no valor inicial: a pessoa não conseguiria escolher.
 *  - Radio nativo **já tem** o padrão de teclado que o `Grupo` reimplementa —
 *    um ponto de tabulação por grupo, setas movendo a seleção. Reimplementar
 *    isso é aceitável quando não há alternativa; aqui há.
 *
 * O Design System §2.2.5 registra que "radio não existe no Release 2" e que a
 * escolha única aparece como segmented control. A aparência aqui é a do
 * segmented; a mecânica é a do radio. É o que satisfaz as duas coisas.
 *
 * Server Component: não há estado nenhum a manter — o `:checked` do CSS
 * desenha a seleção.
 */
export function Segmentado({ name, rotulo, opcoes, valorInicial, erro }: PropsSegmentado) {
  return (
    <fieldset className={estilos.grupo}>
      <legend className={estilos.legenda}>{rotulo}</legend>

      <div className={estilos.trilha}>
        {opcoes.map((opcao) => (
          <label key={opcao.valor} className={estilos.opcao}>
            <input
              type="radio"
              name={name}
              value={opcao.valor}
              defaultChecked={opcao.valor === valorInicial}
              className={estilos.entrada}
            />
            <span className={estilos.pastilha}>{opcao.rotulo}</span>
          </label>
        ))}
      </div>

      {erro !== undefined ? (
        <span className={estilos.erro} role="alert">
          {erro}
        </span>
      ) : null}
    </fieldset>
  );
}
