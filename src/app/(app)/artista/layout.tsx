import type { ReactNode } from 'react';

import { Shell } from '@/componentes/shell/Shell';

/*
 * `papeis` recebe só o papel do próprio ambiente enquanto `papel_usuario` não
 * existe (migration 0001, R1). Consequência deliberada: a troca de ambiente
 * fica escondida na R0, porque não há como saber se a conta acumula os dois
 * papéis. Na R1 isto passa a ler de `lerPapeis`.
 */

export default function LayoutArtista({ children }: { children: ReactNode }) {
  return (
    <Shell papelAtivo="artista" papeis={['artista']} titulo="Artista">
      {children}
    </Shell>
  );
}
