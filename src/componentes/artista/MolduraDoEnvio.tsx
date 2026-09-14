import type { ReactNode } from 'react';

import { Passos } from '@/componentes/base/Passos';
import { ENVIAR } from '@/textos/prototipo';
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

  return (
    <div className={estilos.base}>
      <header className={estilos.cabecalho}>
        <p className={estilos.contador}>{ENVIAR.passoDe(indice + 1, PASSOS.length)}</p>
        <h2 className={estilos.heroi}>{ENVIAR.herois[indice]}</h2>
      </header>

      <Passos passos={[...ENVIAR.passos]} atual={indice} />

      {children}
    </div>
  );
}
