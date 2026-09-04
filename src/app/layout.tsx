import type { Metadata } from 'next';
import type { ReactNode } from 'react';

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
      <body>{children}</body>
    </html>
  );
}
