import { test } from '@playwright/test';

/**
 * B3 · Extrato — módulo 5.3
 *
 * Cenário do [Guia de Testes da R2](../../docs/R2/guia-de-testes-r2.md), que é
 * o gate da release.
 *
 * **Passos**
 * 1. Abra o Extrato.
 *
 * **Resultado esperado**
 * - Lista Claves adquiridas, usadas e devolvidas, com data e origem.
 */
test.skip('B3 · Extrato', async ({ page }) => {
  // Implementar junto da tela, na R2. Enquanto o teste está `skip`, o
  // cenário aparece na saída da suíte como pendente — e não como aprovado.
  await page.goto('/');
});
