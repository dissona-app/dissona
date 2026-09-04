import { expect, test } from '@playwright/test';

/**
 * Páginas legais e navegação pública — TASK-008.
 *
 * Único teste da suíte que não está `skip`: os 16 cenários do Guia de Testes
 * dependem de telas da R2. Este cobre o que a R0 entrega de verdade, e serve
 * de fumaça para o próprio encanamento — se o servidor não sobe ou o CSS não
 * carrega, ele falha antes de qualquer coisa de produto.
 */

test.describe('páginas legais', () => {
  test('a home pública abre sem sessão', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Dissona' })).toBeVisible();
  });

  test('os termos de uso abrem e avisam que o texto está pendente', async ({ page }) => {
    await page.goto('/termos');
    await expect(page.getByRole('heading', { level: 1, name: 'Termos de uso' })).toBeVisible();
    // O aviso de pendência é deliberado: documento vinculante não vai ao ar
    // com texto de rascunho passando por definitivo.
    //
    // Sem live region: o aviso já nasce na página. `role="alert"` aqui
    // interromperia a leitura para anunciar algo permanente, que o leitor
    // encontra sozinho ao percorrer o conteúdo.
    await expect(page.getByText('Documento pendente de redação')).toBeVisible();
    // Escopado ao `<article>`: o Next injeta um `next-route-announcer` com
    // `role="alert"` em toda página, inclusive em produção, para anunciar
    // navegação no cliente. Um seletor global sempre acharia esse.
    await expect(page.locator('article [role="alert"]')).toHaveCount(0);
  });

  test('a política de privacidade abre e lista os dados coletados', async ({ page }) => {
    await page.goto('/privacidade');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Política de privacidade' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: /Dados coletados/ })).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 2, name: /Direitos do titular/ }),
    ).toBeVisible();
  });

  test('os termos linkam para a política de privacidade', async ({ page }) => {
    await page.goto('/termos');
    await page.getByRole('link', { name: 'política de privacidade' }).click();
    await expect(page).toHaveURL(/\/privacidade$/);
  });

  test('documento pendente não é indexável', async ({ page }) => {
    const resposta = await page.goto('/termos');
    expect(resposta?.status()).toBe(200);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test('cada documento tem link de volta para a home', async ({ page }) => {
    for (const caminho of ['/termos', '/privacidade']) {
      await page.goto(caminho);
      await page.getByRole('link', { name: '← Voltar' }).click();
      await expect(page).toHaveURL(/\/$/);
    }
  });
});

test.describe('guarda de rota', () => {
  test('ambiente autenticado sem sessão manda para o login, com o destino', async ({ page }) => {
    await page.goto('/artista');
    await expect(page).toHaveURL(/\/entrar\?proximo=%2Fartista$/);
  });

  test('o painel admin sem sessão manda para o login próprio do admin', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/entrar\?proximo=%2Fadmin$/);
  });

  test('o login do admin é aberto', async ({ page }) => {
    await page.goto('/admin/entrar');
    await expect(page).toHaveURL(/\/admin\/entrar$/);
  });
});
