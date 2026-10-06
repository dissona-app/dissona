import estilos from './MolduraDoWizard.module.css';

/**
 * Ondas do painel de marca do passo 1 — `docs/R2/extraido/Curador.html`,
 * ramo `cStep1`.
 *
 * Não são as `OndasDeFundo` das telas de autenticação. O painel tem duas
 * camadas, e não três, com curvas e opacidades próprias (a segunda família
 * corta em y=430, e não em 620), e um clarão mais largo e mais opaco
 * (`92% 60% at 50% 48%`, 0.94 → 0.74 → 0 em 82%). Reaproveitar as do login
 * teria sido o mesmo erro de unificação que motivou esta correção.
 *
 * `aria-hidden` e sem `pointer-events`: é decoração. A animação é desligada
 * pela guarda de `prefers-reduced-motion` do `global.css`.
 */

const CURVA_ALTA =
  'M0 300 C150 200 450 200 600 300 C750 400 1050 400 1200 300 ' +
  'C1350 200 1650 200 1800 300 C1950 400 2250 400 2400 300';

const CURVA_MEIO =
  'M0 430 C200 545 400 315 600 430 C800 545 1000 315 1200 430 ' +
  'C1400 545 1600 315 1800 430 C2000 545 2200 315 2400 430';

type Eco = {
  readonly curva: string;
  readonly cor: string;
  readonly opacidade: number;
  readonly espessura: number;
  readonly deslocamento: number;
};

const CAMADA_A: readonly Eco[] = [
  { curva: CURVA_ALTA, cor: '#7F47DD', opacidade: 0.26, espessura: 1.2, deslocamento: 0 },
  { curva: CURVA_ALTA, cor: '#7F47DD', opacidade: 0.15, espessura: 1, deslocamento: 14 },
  { curva: CURVA_ALTA, cor: '#E35336', opacidade: 0.16, espessura: 1, deslocamento: -16 },
];

const CAMADA_B: readonly Eco[] = [
  { curva: CURVA_MEIO, cor: '#5B2E8F', opacidade: 0.2, espessura: 1.1, deslocamento: 0 },
  { curva: CURVA_MEIO, cor: '#5B2E8F', opacidade: 0.12, espessura: 1, deslocamento: 13 },
];

function Camada({ ecos, classe }: { readonly ecos: readonly Eco[]; readonly classe?: string }) {
  return (
    <svg className={classe} viewBox="0 0 2400 900" preserveAspectRatio="none" focusable="false">
      {ecos.map((eco, indice) => (
        <path
          key={indice}
          d={eco.curva}
          fill="none"
          stroke={eco.cor}
          strokeOpacity={eco.opacidade}
          strokeWidth={eco.espessura}
          strokeLinecap="round"
          transform={eco.deslocamento === 0 ? undefined : `translate(0 ${eco.deslocamento})`}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

export function OndasDoPainel() {
  return (
    <div className={estilos.ondasDoPainel} aria-hidden="true">
      <div className={estilos.derivaA}>
        <Camada ecos={CAMADA_A} classe={estilos.ondaA} />
      </div>
      <div className={estilos.derivaB}>
        <Camada ecos={CAMADA_B} classe={estilos.ondaB} />
      </div>
      <div className={estilos.claraoDoPainel} />
    </div>
  );
}
