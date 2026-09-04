import type { ReactNode } from 'react';

// `(app)` — ambiente autenticado. O shell é montado por ambiente, em
// `artista/layout.tsx` e `curador/layout.tsx`, porque cada um tem a sua
// navegação e o seu papel ativo.
export default function LayoutApp({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
