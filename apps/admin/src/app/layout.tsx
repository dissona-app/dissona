import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { ProvedorDeBaseDoAdmin } from '@dissona/nucleo/componentes/shell/BaseDoAdmin';
import { ProvedorDeConsulta } from '@dissona/nucleo/lib/consulta/provedor';

import '@dissona/nucleo/estilos/global.css';

export const metadata: Metadata = {
  title: 'Dissona · Admin',
  description: 'Painel administrativo da Dissona.',
  // O painel existe, mas não é para ser encontrado por busca.
  robots: { index: false, follow: false },
};

/**
 * Raiz do painel administrativo — app próprio, em `painel.dissona.com.br`.
 *
 * Base `''` para o shell compartilhado: as tabelas de navegação e de título do
 * pacote usam o caminho interno (`/admin/equipe`), e aqui o endereço real é
 * limpo (`/equipe`). Ver `@dissona/nucleo/lib/rotas-admin`.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <ProvedorDeConsulta>
          <ProvedorDeBaseDoAdmin base="">{children}</ProvedorDeBaseDoAdmin>
        </ProvedorDeConsulta>
      </body>
    </html>
  );
}
