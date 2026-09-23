import type { ReactNode } from 'react';

/**
 * `(admin)` — a raiz do ambiente administrativo, dividida em dois grupos:
 *
 *   `(acesso)` → login, recuperação e redefinição de senha. **Sem** shell.
 *   `(painel)` → tudo que exige sessão de admin. **Com** shell.
 *
 * A divisão corrige o bug que a R0 deixou anotado: `/admin/entrar` vivia
 * dentro de `admin/layout.tsx` e herdava o `Shell`, então quem **não** tinha
 * sessão via a navegação do painel em volta do formulário de login — com a
 * sidebar, o menu da conta e todo o resto. Route group não afeta URL, então o caminho
 * `/admin/entrar` continua o mesmo; só o layout que o envolve mudou.
 */
export default function LayoutAdmin({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
