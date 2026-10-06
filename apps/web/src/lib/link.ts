/**
 * Regra de link do produto.
 *
 * Mora em `lib/` porque vale para mais de um domínio: os canais e credenciais
 * do cadastro do curador (módulo 12) e os links de rede do perfil do artista
 * (7.1) usam exatamente a mesma regra, escrita uma vez. Antes vivia em
 * `modulos/curador/esquemas.ts`, e deixá-la lá faria o módulo do artista
 * importar do módulo do curador só para validar uma URL.
 */

import { z } from 'zod';

/**
 * Link na regra do protótipo (`validLink`).
 *
 * Aceita sem esquema — "site.com/seu-canal" é o placeholder da tela —, e é por
 * isso que não usa `z.url()`: aquele exigiria `https://` e recusaria justamente
 * o formato que a tela pede. A normalização para URL absoluta é de
 * `normalizarLink`, abaixo, e acontece na gravação.
 */
const PADRAO_DE_LINK = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/[^\s]*)?$/i;

export const esquemaLink = z
  .string()
  .trim()
  .min(1, { message: 'link_vazio' })
  .refine((valor) => !/\s/.test(valor), { message: 'link_com_espaco' })
  .refine((valor) => PADRAO_DE_LINK.test(valor), { message: 'link_invalido' });

/**
 * A mesma regra, para campo que pode ficar em branco.
 *
 * O perfil do artista tem quatro links e **nenhum** é obrigatório — o do
 * cadastro do curador é obrigatório quando a linha existe. Vazio vira `null`,
 * que é o que a coluna guarda; preenchido passa por `esquemaLink` e sai
 * normalizado, para que a gravação não precise lembrar de chamar
 * `normalizarLink`.
 */
export const esquemaLinkOpcional = z
  .string()
  .trim()
  .transform((valor) => (valor === '' ? null : valor))
  .superRefine((valor, ctx) => {
    if (valor === null) return;
    const analise = esquemaLink.safeParse(valor);
    if (!analise.success) {
      ctx.addIssue({
        code: 'custom',
        message: analise.error.issues[0]?.message ?? 'link_invalido',
      });
    }
  })
  .transform((valor) => (valor === null ? null : normalizarLink(valor)));

/**
 * Prefixa `https://` no link que veio sem esquema.
 *
 * `esquemaLink` aceita `open.spotify.com/playlist/…` porque é o que a pessoa
 * digita — e o protótipo aceita também. O que não pode é isso chegar ao banco
 * cru: renderizado como `href`, um link sem esquema é **relativo**, e
 * `/curador/meu-cadastro/open.spotify.com/...` é para onde ele levaria.
 *
 * `https`, e não `http`: é 2026, e um link que a pessoa colou de um serviço de
 * streaming é servido por TLS.
 */
export function normalizarLink(link: string): string {
  const limpo = link.trim();
  return /^https?:\/\//i.test(limpo) ? limpo : `https://${limpo}`;
}
