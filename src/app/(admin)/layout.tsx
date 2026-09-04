import type { ReactNode } from 'react';

// `(admin)` — login próprio, sem social e sem autocadastro (módulo 19).
export default function LayoutAdmin({ children }: { children: ReactNode }) {
  return <main>{children}</main>;
}
