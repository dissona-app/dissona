import 'server-only';

/** Leituras do perfil do artista para Server Components. */

import { lerMeuPerfil } from './repositorio';
import type { PerfilDoArtista } from './tipos';

export type { PerfilDoArtista } from './tipos';

/** O perfil da sessão, ou `null` se a conta não tem o papel de artista. */
export async function lerPerfilDoArtista(): Promise<PerfilDoArtista | null> {
  return lerMeuPerfil();
}
