import { test } from '@playwright/test';

/**
 * C2 · Iniciar avaliação — módulo 13.1
 *
 * Cenário do [Guia de Testes da R2](../../docs/R2/guia-de-testes-r2.md), que é
 * o gate da release.
 *
 * **Passos**
 * 1. Abra um item da fila e clique em Iniciar avaliação.
 *
 * **Resultado esperado**
 * - Detalhe mostra dados, prazo e serviço contratado.
 * - Segue para a avaliação (notas + feedback).
 */
test.skip('C2 · Iniciar avaliação', async ({ page }) => {
  // Implementar junto da tela, na R2. Enquanto o teste está `skip`, o
  // cenário aparece na saída da suíte como pendente — e não como aprovado.
  await page.goto('/');
});
