import type { Metadata } from 'next';

import { MolduraDeAutenticacao } from '@dissona/nucleo/componentes/autenticacao/MolduraDeAutenticacao';
import { NavegadorDoTour } from '@dissona/nucleo/componentes/autenticacao/NavegadorDoTour';
import { ProvedorDoTour } from '@dissona/nucleo/componentes/autenticacao/estado-do-tour';
import { TourDeOnboarding } from '@dissona/nucleo/componentes/autenticacao/TourDeOnboarding';
import { ONBOARDING } from '@dissona/nucleo/textos/prototipo';

import { encerrarOnboarding } from '@/acoes/autenticacao';
import { linksDeTermos } from '@/lib/rotas';

export const metadata: Metadata = {
  title: 'Como o painel funciona · Dissona',
  robots: { index: false, follow: false },
};

/**
 * Onboarding do admin (1.5), em versão enxuta — o mesmo tour do site, com os
 * passos do admin. "Rever onboarding" reabre com `?rever=1`.
 */
export default async function Pagina({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly rever?: string }>;
}) {
  const { rever } = await searchParams;
  const passos = ONBOARDING.admin;

  return (
    <ProvedorDoTour total={passos.length}>
      <MolduraDeAutenticacao
        ambiente="admin"
        linksDeRodape={linksDeTermos()}
        aside={<NavegadorDoTour />}
      >
        <TourDeOnboarding
          passos={passos}
          acaoDeEncerrar={encerrarOnboarding}
          revendo={rever === '1'}
        />
      </MolduraDeAutenticacao>
    </ProvedorDoTour>
  );
}
