import { test } from '@playwright/test';

/**
 * B1 · Saldo e resumo — módulo 5
 *
 * Cenário do [Guia de Testes da R2](../../docs/R2/guia-de-testes-r2.md), que é
 * o gate da release.
 *
 * **Passos**
 * 1. Abra a Carteira.
 *
 * **Resultado esperado**
 * - Mostra saldo, adquiridas/usadas/devolvidas e as últimas movimentações.
 */
test.skip('B1 · Saldo e resumo', async ({ page }) => {
  // Implementar junto da tela, na R2. Enquanto o teste está `skip`, o
  // cenário aparece na saída da suíte como pendente — e não como aprovado.
  await page.goto('/');
});
