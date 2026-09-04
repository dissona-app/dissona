import { test } from '@playwright/test';

/**
 * C1 · Fila de avaliações — módulo 13
 *
 * Cenário do [Guia de Testes da R2](../../docs/R2/guia-de-testes-r2.md), que é
 * o gate da release.
 *
 * **Passos**
 * 1. Abra a Fila.
 * 1. Ordene/filtre por prazo e status.
 *
 * **Resultado esperado**
 * - Tabela com música, prazo (72h) e status.
 * - Ordenação por prazo (mais urgente primeiro) funciona.
 */
test.skip('C1 · Fila de avaliações', async ({ page }) => {
  // Implementar junto da tela, na R2. Enquanto o teste está `skip`, o
  // cenário aparece na saída da suíte como pendente — e não como aprovado.
  await page.goto('/');
});
