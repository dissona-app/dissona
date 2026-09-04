import type { ReactNode } from 'react';

// `(publico)` — sem sessão. Homepage (módulo 26, R5), Termos e Política.
export default function LayoutPublico({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
