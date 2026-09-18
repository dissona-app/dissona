'use client';

import { ONBOARDING } from '@/textos/prototipo';

import { useEstadoDoTour } from './estado-do-tour';
import estilos from './NavegadorDoTour.module.css';

/**
 * O painel lateral da tela 1.5 — **não** é o "Como funciona" do cadastro.
 *
 * Parecem o mesmo bloco (overline, quatro passos numerados), e não são: aqui
 * cada linha é um `<button>` que salta para aquele passo do tour, e a linha do
 * passo atual fica destacada. O card do cadastro (1.1) é texto estático, com um
 * título grande e a nota de LGPD no pé, que este não tem.
 *
 * Os números vêm de `ONBOARDING.comoFunciona`, que traz os textos **curtos** —
 * os longos, com a micro-nota, são os do card à esquerda.
 */
export function NavegadorDoTour() {
  const { indice, irPara } = useEstadoDoTour();
  const passos = ONBOARDING.comoFunciona.passos;

  return (
    <>
      <span className={estilos.overline}>{ONBOARDING.comoFunciona.titulo}</span>

      <div className={estilos.lista}>
        {passos.map((passo, i) => {
          const atual = i === indice;
          return (
            <button
              key={passo.numero}
              type="button"
              className={[estilos.linha, atual ? estilos.linhaAtual : undefined]
                .filter(Boolean)
                .join(' ')}
              onClick={() => irPara(i)}
              // `aria-current="step"` e não `aria-pressed`: são etapas de um
              // percurso, e não botões de liga-desliga.
              aria-current={atual ? 'step' : undefined}
            >
              <span className={estilos.numero} aria-hidden="true">
                {passo.numero}
              </span>
              <span className={estilos.textos}>
                <span className={estilos.titulo}>{passo.titulo}</span>
                <span className={estilos.texto}>{passo.texto}</span>
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
