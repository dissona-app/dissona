import { OrbitaDeFundo } from '@dissona/nucleo/componentes/autenticacao/OrbitaDeFundo';
import type { ReactNode } from 'react';

import { ENVIAR } from '@dissona/nucleo/textos/prototipo';
import type { PassoDoEnvio } from '@/modulos/faixa/tipos';

import estilos from './MolduraDoEnvio.module.css';

export type PropsMolduraDoEnvio = {
  /** `curadores` é o quarto passo do indicador — a seleção, depois da revisão. */
  readonly passo: PassoDoEnvio | 'curadores';
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
const ORDEM_NO_INDICADOR: Readonly<Record<PassoDoEnvio | 'curadores', number>> = {
  faixa: 0,
  contexto: 1,
  curadores: 2,
  revisao: 3,
};

export function MolduraDoEnvio({ passo, children }: PropsMolduraDoEnvio) {
  // Ordem do protótipo aprovado: envio, contexto, escolher curador, revisar.
  const indice = ORDEM_NO_INDICADOR[passo];

  // Protótipo aprovado: um cartão com a faixa escura no topo — título,
  // contador e os passos em barras — e o conteúdo numa área clara embaixo.
  return (
    <div className={estilos.base} data-botoes="frase">
      <header className={estilos.faixa}>
        <div className={estilos.faixaTopo}>
          <h2 className={estilos.heroi}>{ENVIAR.herois[indice]}</h2>
          <p className={estilos.contador}>{ENVIAR.passoDe(indice + 1, ENVIAR.passos.length)}</p>
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

      {/* Protótipo aprovado: o corpo é areia com a órbita bem apagada atrás. */}
      <div className={estilos.corpo}>
        <span className={estilos.orbita} aria-hidden="true">
          <OrbitaDeFundo centro="50%" />
        </span>
        <div className={estilos.conteudoDoCorpo}>{children}</div>
      </div>
    </div>
  );
}
