import { expect, test } from '@playwright/test';

import { HOST_ADMIN, noAdmin, telaDoAdmin, URL_ADMIN } from '../apoio/admin';
import { entrarComoAdmin } from '../apoio/sessao';
import { ADMIN_ENTRAR } from '../apoio/textos';

/**
 * O painel administrativo como app próprio (`apps/admin`, admin.dissona.com.br).
 *
 * O resto da suíte já roda o admin no painel; este arquivo prova o que é
 * próprio da separação: o endereço antigo do site muda de lugar, o painel não
 * serve o site, e a sessão de um não vale no outro.
 */
test.describe('painel administrativo separado', () => {
  test(
    'o endereço antigo do admin no site vai ao painel com 308, preservando a query',
    { tag: ['@RF-028'] },
    async ({ request }) => {
      const resposta = await request.get('/admin/equipe?aba=dados', { maxRedirects: 0 });
      expect(resposta.status()).toBe(308);
      expect(resposta.headers()['location']).toBe(`${URL_ADMIN}/equipe?aba=dados`);
    },
  );

  test('o painel serve o login no caminho limpo', { tag: ['@RF-028'] }, async ({ page }) => {
    await page.goto(`${URL_ADMIN}/entrar`);
    await expect(page).toHaveURL(telaDoAdmin('/entrar', { exato: true }));
    await expect(page.getByRole('button', { name: ADMIN_ENTRAR.enviar })).toBeVisible();
  });

  test('o painel não serve o ambiente do artista', { tag: ['@RF-028'] }, async ({ page }) => {
    await page.goto(`${URL_ADMIN}/artista`);
    await expect(page).toHaveURL(telaDoAdmin('/entrar'));
  });

  test(
    'a sessão do admin vale só no painel',
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
    'o rodapé das telas do admin abre as páginas legais do site',
    { tag: ['@RF-028'] },
    async ({ page, baseURL }) => {
      // O painel não duplica Termos e Privacidade: aponta para o site.
      await page.goto(noAdmin('/admin/entrar'));
      await page.getByRole('link', { name: 'Privacidade', exact: true }).click();
      await expect(page).toHaveURL(`${baseURL ?? ''}/privacidade`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    },
  );
});
