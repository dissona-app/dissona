import type { ReactNode } from 'react';

// `(app)` — ambiente autenticado de artista e curador. O shell com header,
// navegação e troca de papel entra aqui na TASK-006.
export default function LayoutApp({ children }: { children: ReactNode }) {
  return <main>{children}</main>;
}
