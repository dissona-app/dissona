import { expect, test } from '@playwright/test';

import { PERSONA } from '../apoio/personas';
import { entrarComo } from '../apoio/sessao';

/**
 * B9 · Minhas faixas — a lista do que o artista enviou (protótipo aprovado).
 *
 * O item do menu deixou de ser "disponível na Release 3": é link, abre a tela,
 * e o "Ver todas" do Perfil leva até ela.
 */
test.describe('B9 · Minhas faixas', () => {
  test('o menu leva à lista, com as abas por situação', async ({ page }) => {
    await entrarComo(page, PERSONA.ARTISTA);
    await page.goto('/artista/perfil');

    await page.getByRole('link', { name: 'Minhas faixas' }).first().click();
    await page.waitForURL(/\/artista\/faixas$/);

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Minhas faixas');
    const abas = page.getByRole('navigation', { name: 'Filtrar por situação' });
    await expect(abas.getByRole('link', { name: /^Todas · \d+$/ })).toBeVisible();
    await expect(abas.getByRole('link', { name: /^Concluída · \d+$/ })).toBeVisible();
  });

  test('"Ver todas" do Perfil abre a lista', async ({ page }) => {
    await entrarComo(page, PERSONA.ARTISTA);
    await page.goto('/artista/perfil');
    await page.getByRole('link', { name: 'Ver todas' }).click();
    await page.waitForURL(/\/artista\/faixas$/);
  });

  test('o filtro mostra só a situação escolhida', async ({ page }) => {
    await entrarComo(page, PERSONA.ARTISTA);
    await page.goto('/artista/faixas?status=devolvida');
    const ativa = page
      .getByRole('navigation', { name: 'Filtrar por situação' })
      .getByRole('link', { name: /^Devolvida · \d+$/ });
    await expect(ativa).toHaveAttribute('aria-current', 'page');
  });
});
