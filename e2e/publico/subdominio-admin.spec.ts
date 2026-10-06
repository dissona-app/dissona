import { expect, test } from '@playwright/test';

import { HOST_ADMIN, noAdmin, telaDoAdmin, URL_ADMIN } from '../apoio/admin';
import { entrarComoAdmin } from '../apoio/sessao';
import { ADMIN_ENTRAR } from '../apoio/textos';

/**
 * O admin em `admin.<domínio>` (`src/lib/rotas-admin.ts`).
 *
 * O resto da suíte já roda o admin no subdomínio; este arquivo prova o que é
 * próprio da separação: o endereço antigo muda de lugar, o subdomínio não
 * serve o site principal, e a sessão de um host não vale no outro.
 */
test.describe('admin em subdomínio', () => {
  test(
    'o endereço antigo do admin muda de lugar com 308, preservando a query',
    { tag: ['@RF-028'] },
    async ({ request }) => {
      const resposta = await request.get('/admin/equipe?aba=dados', { maxRedirects: 0 });
      expect(resposta.status()).toBe(308);
      expect(resposta.headers()['location']).toBe(`${URL_ADMIN}/equipe?aba=dados`);
    },
  );

  test(
    'o subdomínio serve o login do admin no caminho limpo',
    { tag: ['@RF-028'] },
    async ({ page }) => {
      await page.goto(`${URL_ADMIN}/entrar`);
      await expect(page).toHaveURL(telaDoAdmin('/entrar', { exato: true }));
      await expect(page.getByRole('button', { name: ADMIN_ENTRAR.enviar })).toBeVisible();
    },
  );

  test('o subdomínio não serve o ambiente do artista', { tag: ['@RF-028'] }, async ({ page }) => {
    await page.goto(`${URL_ADMIN}/artista`);
    await expect(page).toHaveURL(telaDoAdmin('/entrar'));
  });

  test(
    'a sessão do admin vale só no subdomínio',
    { tag: ['@RF-028'] },
    async ({ page, context, baseURL }) => {
      await entrarComoAdmin(page);

      const doAdmin = await context.cookies(URL_ADMIN);
      const doPrincipal = await context.cookies(baseURL ?? '/');
      const ehSessao = (nome: string) => nome.startsWith('sb-');

      expect(doAdmin.some((cookie) => ehSessao(cookie.name))).toBe(true);
      expect(doPrincipal.some((cookie) => ehSessao(cookie.name))).toBe(false);
      expect(new URL(page.url()).host).toBe(HOST_ADMIN);
    },
  );

  test(
    'o rodapé das telas do admin abre as páginas legais no próprio subdomínio',
    { tag: ['@RF-028'] },
    async ({ page }) => {
      await page.goto(noAdmin('/admin/entrar'));
      await page.getByRole('link', { name: 'Privacidade', exact: true }).click();
      await expect(page).toHaveURL(`${URL_ADMIN}/privacidade`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    },
  );
});
