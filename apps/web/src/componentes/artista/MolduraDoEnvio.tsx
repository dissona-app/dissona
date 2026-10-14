import type { ReactNode } from 'react';

import { ENVIAR } from '@dissona/nucleo/textos/prototipo';
import type { PassoDoEnvio } from '@/modulos/faixa/tipos';
import { PASSOS } from '@/modulos/faixa/tipos';

import estilos from './MolduraDoEnvio.module.css';

export type PropsMolduraDoEnvio = {
  readonly passo: PassoDoEnvio;
  readonly children: ReactNode;
};

/**
 * Moldura do wizard de envio (3).
 *
 * Server Component: o indicador de passo é derivado da rota, e não de estado.
 *
 * Genérica de propósito, ao contrário de `MolduraDoWizard` do curador — aquela
 * importa `CURADOR_CADASTRO` direto e tem largura fixa por passo, dos oito. Em
 * vez de generalizá-la e mexer num fluxo entregue, esta é a moldura do envio,
 * apoiada no `<Passos>` do Design System, cujo docblock já previa "envio em 3".
 */
export function MolduraDoEnvio({ passo, children }: PropsMolduraDoEnvio) {
  const indice = PASSOS.indexOf(passo);

  // Protótipo aprovado: um cartão com a faixa escura no topo — título,
  // contador e os passos em barras — e o conteúdo numa área clara embaixo.
  return (
    <div className={estilos.base}>
      <header className={estilos.faixa}>
        <div className={estilos.faixaTopo}>
          <h2 className={estilos.heroi}>{ENVIAR.herois[indice]}</h2>
          <p className={estilos.contador}>{ENVIAR.passoDe(indice + 1, PASSOS.length)}</p>
        </div>
        <nav aria-label="Progresso">
          <ol className={estilos.passos}>
            {ENVIAR.passos.map((texto, i) => (
              <li
                key={texto}
                className={[
                  estilos.passo,
                  i < indice ? estilos.feito : i === indice ? estilos.atual : undefined,
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span className={estilos.barra} aria-hidden="true" />
                <span aria-current={i === indice ? 'step' : undefined}>{texto}</span>
              </li>
            ))}
          </ol>
        </nav>
      </header>

      <div className={estilos.corpo}>{children}</div>
    </div>
  );
}
