import type { ReactNode } from 'react';

// `(admin)` — login próprio e painel. O shell entra em `admin/layout.tsx`,
// que é onde o painel começa; a tela de login fica fora dele.
export default function LayoutAdmin({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
