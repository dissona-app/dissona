import type { ReactNode } from 'react';

/**
 * `(auth)` — sem sessão; o middleware redireciona quem já está autenticado.
 *
 * Sem `<main>` aqui: `MolduraDeAutenticacao` já traz o dela, e dois `<main>`
 * aninhados são erro de marcação — o leitor de tela perde a referência do
 * *landmark* principal, que é justamente o que o atalho "ir para o conteúdo"
 * usa.
 */
export default function LayoutAutenticacao({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
