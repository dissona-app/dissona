import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { ProvedorDeConsulta } from '@dissona/nucleo/lib/consulta/provedor';

import '@dissona/nucleo/estilos/global.css';

export const metadata: Metadata = {
  title: 'Dissona',
  description:
    'Avaliação estruturada e paga de músicas: artistas independentes e curadores profissionais.',
};

// Tipado explicitamente, e não pelo `LayoutProps<'/'>` global do Next: aquele
// tipo só existe depois de um `next build` ter gerado `.next/types`, o que
// tornaria `pnpm typecheck` dependente da ordem dos passos no CI.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <ProvedorDeConsulta>{children}</ProvedorDeConsulta>
      </body>
    </html>
  );
}
