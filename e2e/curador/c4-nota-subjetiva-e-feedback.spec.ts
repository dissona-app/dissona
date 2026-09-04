import { test } from '@playwright/test';

/**
 * C4 · Nota subjetiva e feedback — módulo 14.1
 *
 * Cenário do [Guia de Testes da R2](../../docs/R2/guia-de-testes-r2.md), que é
 * o gate da release.
 *
 * **Passos**
 * 1. Dê a nota subjetiva e escreva o feedback.
 *
 * **Resultado esperado**
 * - O feedback é obrigatório (mínimo de caracteres para o acréscimo).
 */
test.skip('C4 · Nota subjetiva e feedback', async ({ page }) => {
  // Implementar junto da tela, na R2. Enquanto o teste está `skip`, o
  // cenário aparece na saída da suíte como pendente — e não como aprovado.
  await page.goto('/');
});
