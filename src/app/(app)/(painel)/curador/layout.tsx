import type { ReactNode } from 'react';

import { Shell } from '@/componentes/shell/Shell';
import { lerPapeisDaSessao } from '@/modulos/autenticacao/consultas';

/**
 * Shell do ambiente do curador.
 *
 * `papeis` vem da sessão. Até a `0001` existir, a R0 passava `['curador']`
 * fixo, com a consequência declarada de esconder a troca de ambiente — não
 * havia como saber se a conta acumulava os dois papéis. Agora há, e
 * `TrocaDePapel` aparece para quem de fato tem os dois.
 *
 * **Sem `titulo`**: o `Shell` o deriva do caminho, como o protótipo faz.
 */
export default async function LayoutCurador({ children }: { children: ReactNode }) {
  const papeis = await lerPapeisDaSessao();

  return (
    <Shell papelAtivo="curador" papeis={papeis}>
      {children}
    </Shell>
  );
}
