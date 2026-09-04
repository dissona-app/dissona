import { test } from '@playwright/test';

/**
 * A2 · Criar pacote — módulo 21.1
 *
 * Cenário do [Guia de Testes da R2](../../docs/R2/guia-de-testes-r2.md), que é
 * o gate da release.
 *
 * **Passos**
 * 1. Clique em Novo pacote.
 * 1. Preencha nome, qtd, valor e desconto.
 * 1. Salve.
 *
 * **Resultado esperado**
 * - O preço por Clave é calculado.
 * - Validações barram valores/percentuais inválidos.
 * - O pacote entra na lista.
 */
test.skip('A2 · Criar pacote', async ({ page }) => {
  // Implementar junto da tela, na R2. Enquanto o teste está `skip`, o
  // cenário aparece na saída da suíte como pendente — e não como aprovado.
  await page.goto('/');
});
