import type { ReactNode } from 'react';

import { Shell } from '@/componentes/shell/Shell';
import { lerPapeisDaSessao } from '@/modulos/autenticacao/consultas';

/**
 * Shell do ambiente do artista.
 *
 * `papeis` vem da sessão. Até a `0001` existir, a R0 passava `['artista']`
 * fixo, com a consequência declarada de esconder a troca de ambiente — não
 * havia como saber se a conta acumulava os dois papéis. Agora há, e
 * `TrocaDePapel` aparece para quem de fato tem os dois.
 *
 * **Sem `titulo`**: o `Shell` o deriva do caminho, como o protótipo faz.
 */
export default async function LayoutArtista({ children }: { children: ReactNode }) {
  const papeis = await lerPapeisDaSessao();

  return (
    <Shell papelAtivo="artista" papeis={papeis}>
      {children}
    </Shell>
  );
}
