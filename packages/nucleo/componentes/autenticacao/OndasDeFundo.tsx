import estilos from './MolduraDeAutenticacao.module.css';

/**
 * Ondas do fundo das telas de autenticação.
 *
 * Portadas de `docs/R2/extraido/Admin.html` — três famílias de curvas (y=300,
 * 620 e 740), cada uma repetida com deslocamento vertical e opacidade
 * decrescente, dando o efeito de eco. O protótipo escreve os doze `<path>` à
 * mão; aqui são dados, porque doze cópias da mesma string de 240 caracteres
 * num TSX é onde um `d` acaba divergindo dos outros sem ninguém notar.
 *
 * `aria-hidden` e sem `pointer-events`: é decoração. E a animação infinita é
 * desligada pela guarda de `prefers-reduced-motion` do `global.css` — nenhum
 * dos três protótipos a declara, e sem ela isto reprova a WCAG 2.3.3.
 */

const CURVA_ALTA =
  'M0 300 C150 200 450 200 600 300 C750 400 1050 400 1200 300 ' +
  'C1350 200 1650 200 1800 300 C1950 400 2250 400 2400 300';

const CURVA_MEDIA =
  'M0 620 C180 520 420 720 600 630 C780 545 1020 735 1200 620 ' +
  'C1380 520 1620 720 1800 630 C1980 545 2220 735 2400 620';

const CURVA_BAIXA =
  'M0 740 C200 660 400 830 600 750 C800 670 1000 840 1200 740 ' +
  'C1400 660 1600 830 1800 750 C2000 670 2200 840 2400 740';

type Eco = {
  readonly curva: string;
  readonly cor: string;
  readonly opacidade: number;
  readonly espessura: number;
  readonly deslocamento: number;
};

/** Cores literais do protótipo — `--dsn-purple-500` e `--dsn-orange-500`. */
const ROXO = '#7F47DD';
const LARANJA = '#E35336';
const ROXO_ESCURO = '#5B2E8F';

const ECOS: readonly Eco[] = [
  { curva: CURVA_ALTA, cor: ROXO, opacidade: 0.42, espessura: 1.4, deslocamento: 0 },
  { curva: CURVA_ALTA, cor: ROXO, opacidade: 0.3, espessura: 1.1, deslocamento: 14 },
  { curva: CURVA_ALTA, cor: ROXO, opacidade: 0.2, espessura: 1, deslocamento: 28 },
  { curva: CURVA_ALTA, cor: ROXO, opacidade: 0.13, espessura: 1, deslocamento: 42 },
  { curva: CURVA_ALTA, cor: LARANJA, opacidade: 0.34, espessura: 1.2, deslocamento: -16 },
  { curva: CURVA_ALTA, cor: LARANJA, opacidade: 0.16, espessura: 1, deslocamento: -28 },

  { curva: CURVA_MEDIA, cor: ROXO_ESCURO, opacidade: 0.24, espessura: 1.2, deslocamento: 0 },
  { curva: CURVA_MEDIA, cor: ROXO_ESCURO, opacidade: 0.17, espessura: 1, deslocamento: 13 },
  { curva: CURVA_MEDIA, cor: ROXO_ESCURO, opacidade: 0.11, espessura: 1, deslocamento: 26 },
  { curva: CURVA_MEDIA, cor: LARANJA, opacidade: 0.2, espessura: 1, deslocamento: -13 },

  { curva: CURVA_BAIXA, cor: ROXO, opacidade: 0.18, espessura: 1, deslocamento: 0 },
  { curva: CURVA_BAIXA, cor: ROXO, opacidade: 0.11, espessura: 1, deslocamento: 12 },
];

export function OndasDeFundo() {
  return (
    <div className={estilos.fundo} aria-hidden="true">
      <svg
        className={estilos.ondas}
        viewBox="0 0 2400 900"
        preserveAspectRatio="none"
        focusable="false"
      >
        {ECOS.map((eco, indice) => (
          <path
            // A chave é o índice porque a lista é literal e imutável: nenhuma
            // reordenação é possível, e `d + deslocamento` repetiria.
            key={indice}
            d={eco.curva}
            fill="none"
            stroke={eco.cor}
            strokeOpacity={eco.opacidade}
            strokeWidth={eco.espessura}
            strokeLinecap="round"
            transform={`translate(0 ${eco.deslocamento})`}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <div className={estilos.clarao} />
    </div>
  );
}
