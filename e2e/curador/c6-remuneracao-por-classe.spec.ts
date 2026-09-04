import { test } from '@playwright/test';

/**
 * C6 · Remuneração por classe — módulo 14.4
 *
 * Cenário do [Guia de Testes da R2](../../docs/R2/guia-de-testes-r2.md), que é
 * o gate da release.
 *
 * **Passos**
 * 1. Veja a remuneração por classe e conclua a avaliação.
 *
 * **Resultado esperado**
 * - A escala por classe (Bronze/Prata/Ouro) aparece com os acréscimos.
 * - Concluir libera o crédito.
 *
 * ⚠️ Bloqueado por #5 (base de cálculo da remuneração por classe) — maior risco de retrabalho.
 */
test.skip('C6 · Remuneração por classe', async ({ page }) => {
  // Implementar junto da tela, na R2. Enquanto o teste está `skip`, o
  // cenário aparece na saída da suíte como pendente — e não como aprovado.
  await page.goto('/');
});
