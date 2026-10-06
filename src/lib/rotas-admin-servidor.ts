import 'server-only';

import { headers } from 'next/headers';

import type { BaseDoAdmin } from './rotas-admin';
import { baseDoAdmin, paraExterno } from './rotas-admin';

/**
 * A base do admin para a requisição em curso — `''` no subdomínio, `/admin`
 * no host principal. Mesmo critério de host de `origem.ts`.
 */
export async function baseDoAdminDaRequisicao(): Promise<BaseDoAdmin> {
  const cabecalhos = await headers();
  return baseDoAdmin(cabecalhos.get('x-forwarded-host') ?? cabecalhos.get('host'));
}

/** Atalho para Server Components e Server Actions: `ROTA.ADMIN_X` → URL que sai. */
export async function urlDoAdmin(caminhoInterno: string): Promise<string> {
  return paraExterno(caminhoInterno, await baseDoAdminDaRequisicao());
}
