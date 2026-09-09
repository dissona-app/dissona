import type { ReactNode } from 'react';

import { Shell } from '@/componentes/shell/Shell';
import { lerPapeisDaSessao } from '@/modulos/autenticacao/consultas';

/**
 * Shell do painel administrativo.
 *
 * **Sem `titulo`**: o `Shell` o deriva do caminho (`titulo-por-caminho.ts`),
 * como o protótipo faz. Passar um título fixo aqui sobrescreveria o da rota, e
 * toda tela do painel mostraria "Administração" no `<h1>` — inclusive a de
 * pacotes, cujo título é "Pacotes de Claves".
 *
 * `papeis` vem da sessão, e não mais fixo em `['admin']`. A diferença é
 * visível: `TrocaDePapel` só aparece para quem tem mais de um papel, e com o
 * valor fixo ela nunca aparecia — nem para o admin que também é artista, que é
 * exatamente o caso que a troca existe para servir.
 */
export default async function LayoutPainelAdmin({ children }: { children: ReactNode }) {
  const papeis = await lerPapeisDaSessao();

  return (
    <Shell papelAtivo="admin" papeis={papeis} limite="total">
      {children}
    </Shell>
  );
}
