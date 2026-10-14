import type { CSSProperties } from 'react';

import f1 from './capas/f1.png';
import f2 from './capas/f2.png';
import f3 from './capas/f3.png';
import f4 from './capas/f4.png';
import f5 from './capas/f5.png';
import estilos from './OrbitaDeFundo.module.css';

/**
 * O fundo "Órbita" das telas de entrada — porte literal de `lfOrbita` do
 * protótipo aprovado (`docs/prototipo-aprovado/`, 30/09/2026).
 *
 * Cinco anéis concêntricos giram em sentidos alternados levando capas de disco
 * e notas musicais; um arco laranja percorre cada anel e um brilho roxo marca o
 * centro. Tudo em CSS, sem JavaScript: as posições são calculadas aqui, no
 * servidor, e só a rotação anima. `prefers-reduced-motion` para tudo.
 *
 * `centro` é a posição horizontal do centro: `76%` no login, com o herói à
 * esquerda; `50%` nas demais telas, com o cartão no meio.
 */

const CAPAS = [f1.src, f2.src, f3.src, f4.src, f5.src];

const ANEIS = [
  { r: 20, n: 6, tam: 5, dur: 110, horario: true },
  { r: 33, n: 9, tam: 6, dur: 160, horario: false },
  { r: 50, n: 13, tam: 6.6, dur: 220, horario: true },
  { r: 63, n: 16, tam: 6.2, dur: 290, horario: false },
  { r: 77, n: 19, tam: 5.6, dur: 360, horario: true },
] as const;

const NOTAS = ['♪', '♫', '♩', '♬'];
const CORES_DAS_NOTAS = ['#B780E7', '#E35336', '#C6B4DE', '#7F47DD'];

function ponto(angulo: number) {
  return {
    left: `${(50 + 50 * Math.cos(angulo)).toFixed(3)}%`,
    top: `${(50 + 50 * Math.sin(angulo)).toFixed(3)}%`,
  };
}

export function OrbitaDeFundo({ centro = '76%' }: { readonly centro?: '76%' | '50%' }) {
  const noMeio = centro === '50%';

  return (
    <div className={estilos.base} aria-hidden="true" data-orbita="">
      <div className={estilos.brilho} style={{ left: centro }} />

      {ANEIS.map((anel, indiceDoAnel) => {
        const diametro = `${anel.r * 2}vmax`;
        const giro = anel.horario ? estilos.horario : estilos.antiHorario;
        const contraGiro = anel.horario ? estilos.antiHorario : estilos.horario;
        const duracao = { animationDuration: `${anel.dur}s` } as CSSProperties;

        return (
          <div
            key={anel.r}
            className={estilos.anel}
            style={{ left: centro, width: diametro, height: diametro }}
          >
            <span
              className={estilos.trilha}
              style={{
                borderColor: `rgba(183,128,231,${(0.26 - indiceDoAnel * 0.035).toFixed(3)})`,
              }}
            />
            <div className={`${estilos.giro} ${giro}`} style={duracao}>
              <span className={estilos.arco} />
              {Array.from({ length: anel.n }, (_, i) => {
                const angulo = (i / anel.n) * Math.PI * 2 + indiceDoAnel * 0.7;
                const anguloDaNota = angulo + Math.PI / anel.n;
                const cor = CORES_DAS_NOTAS[(i * 3 + indiceDoAnel) % 4] ?? '#B780E7';
                const capa = CAPAS[(i + indiceDoAnel * 2) % CAPAS.length];
                return (
                  <span key={i}>
                    <span
                      className={estilos.disco}
                      style={{
                        ...ponto(angulo),
                        width: `${anel.tam}vmax`,
                        height: `${anel.tam}vmax`,
                        backgroundImage: `radial-gradient(circle, #140d1a 0 7%, rgba(20,13,26,0) 7.5%), url('${capa}')`,
                      }}
                    />
                    <span
                      className={estilos.nota}
                      style={{
                        ...ponto(anguloDaNota),
                        fontSize: `${(anel.tam * 0.5).toFixed(2)}vmax`,
                        color: cor,
                        textShadow: `0 0 14px ${cor}`,
                      }}
                    >
                      <span className={`${estilos.notaGiro} ${contraGiro}`} style={duracao}>
                        {NOTAS[(i + indiceDoAnel) % 4]}
                      </span>
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className={noMeio ? estilos.veuCentro : estilos.veuLateral} />
      <div className={estilos.veuVertical} />
    </div>
  );
}
