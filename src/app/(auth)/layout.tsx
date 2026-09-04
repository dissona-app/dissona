import type { ReactNode } from 'react';

// `(auth)` — sem sessão; o middleware redireciona quem já está autenticado.
export default function LayoutAutenticacao({ children }: { children: ReactNode }) {
  return <main>{children}</main>;
}
