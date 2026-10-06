'use client';

import { createContext, useCallback, useContext } from 'react';
import type { ReactNode } from 'react';

import type { BaseDoAdmin } from '@/lib/rotas-admin';
import { PREFIXO_ADMIN, paraExterno, paraInterno } from '@/lib/rotas-admin';

/**
 * A base do admin no cliente — `''` no subdomínio, `/admin` no host principal.
 *
 * O valor é lido no servidor (`baseDoAdminDaRequisicao`) e entregue por
 * `(admin)/layout.tsx`: o cliente não lê `window.location` para isso, senão o
 * HTML do servidor e o da hidratação discordariam.
 *
 * Fora do provedor (artista, curador) a base é `/admin`, e as duas traduções
 * viram identidade — os componentes compartilhados do shell podem chamá-las
 * sem saber em que ambiente estão.
 */
const Contexto = createContext<BaseDoAdmin>(PREFIXO_ADMIN);

export function ProvedorDeBaseDoAdmin({
  base,
  children,
}: {
  readonly base: BaseDoAdmin;
  readonly children: ReactNode;
}) {
  return <Contexto.Provider value={base}>{children}</Contexto.Provider>;
}

/** `ROTA.ADMIN_X` → o `href` que o navegador deve receber. */
export function useHrefDoAdmin(): (caminhoInterno: string) => string {
  const base = useContext(Contexto);
  return useCallback((caminho: string) => paraExterno(caminho, base), [base]);
}

/** O `usePathname()` do navegador → o caminho interno, que é o que as tabelas do shell usam. */
export function useCaminhoInterno(): (caminhoDoNavegador: string) => string {
  const base = useContext(Contexto);
  return useCallback((caminho: string) => paraInterno(caminho, base), [base]);
}
