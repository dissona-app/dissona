import 'server-only';

/** Leituras das preferências (7.3 / 17.3) para Server Components. */

import type { Papel } from '@dissona/nucleo/lib/papeis';

import { lerCatalogoEEscolhas, lerIdioma } from './repositorio';
import { aplicarEscolhas } from './servico';
import { ehIdioma } from './tipos';
import type { Preferencias } from './tipos';

export type { Preferencias, PreferenciaDeEvento } from './tipos';

/**
 * Catálogo do papel com as escolhas do usuário, mais o idioma.
 *
 * O idioma cai em `pt-BR` quando a coluna traz algo fora da lista — o `check`
 * da `0001` impede que isso aconteça, e o fallback existe só para o tipo
 * fechar sem `as`.
 */
export async function lerPreferencias(papel: Papel): Promise<Preferencias> {
  const [bruto, idioma] = await Promise.all([lerCatalogoEEscolhas(papel), lerIdioma()]);

  return {
    eventos: aplicarEscolhas(bruto.catalogo, bruto.escolhas),
    idioma: idioma !== null && ehIdioma(idioma) ? idioma : 'pt-BR',
  };
}
