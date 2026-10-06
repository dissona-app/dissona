import { urlDoSite } from '@dissona/nucleo/lib/ambiente';
import { ROTA } from '@dissona/nucleo/lib/guarda-rota';
import { paraExterno } from '@dissona/nucleo/lib/rotas-admin';

/**
 * As rotas do painel na forma em que existem aqui — limpas.
 *
 * `ROTA.ADMIN*` (pacote) é o caminho interno, que a guarda de rota usa;
 * `rota()` dá o endereço real deste app. Serve também aos `revalidatePath`:
 * aqui a rota é a pasta, sem rewrite nenhum.
 */
export function rota(caminhoInterno: string): string {
  return paraExterno(caminhoInterno, '');
}

export const ROTA_PAINEL = {
  INICIO: rota(ROTA.ADMIN),
  ENTRAR: rota(ROTA.ADMIN_ENTRAR),
  RECUPERAR_SENHA: rota(ROTA.ADMIN_RECUPERAR_SENHA),
  REDEFINIR_SENHA: rota(ROTA.ADMIN_REDEFINIR_SENHA),
  EQUIPE: rota(ROTA.ADMIN_EQUIPE),
  CONVITE: rota(ROTA.ADMIN_CONVITE),
  PACOTES: rota(ROTA.ADMIN_PACOTES),
  PACOTES_NOVO: rota(ROTA.ADMIN_PACOTES_NOVO),
} as const;

/** Termos e Privacidade vivem no site; o painel só aponta para lá. */
export function linksLegais(): readonly { readonly rotulo: string; readonly href: string }[] {
  const site = urlDoSite();
  return [
    { rotulo: 'Segurança', href: `${site}${ROTA.PRIVACIDADE}` },
    { rotulo: 'Privacidade', href: `${site}${ROTA.PRIVACIDADE}` },
  ];
}

export function linksDeTermos(): readonly { readonly rotulo: string; readonly href: string }[] {
  const site = urlDoSite();
  return [
    { rotulo: 'Termos', href: `${site}${ROTA.TERMOS}` },
    { rotulo: 'Privacidade', href: `${site}${ROTA.PRIVACIDADE}` },
  ];
}
