import { test } from '@playwright/test';

/**
 * B2 · Comprar Claves — módulo 5.1 · 5.2
 *
 * Cenário do [Guia de Testes da R2](../../docs/R2/guia-de-testes-r2.md), que é
 * o gate da release.
 *
 * **Passos**
 * 1. Clique em Comprar Claves e escolha um pacote.
 * 1. No checkout, escolha Cartão ou Pix e confirme.
 * 1. Teste os dois resultados (aprovado e recusado).
 *
 * **Resultado esperado**
 * - Estados Processando / Aprovado / Recusado aparecem.
 * - No aprovado, o saldo atualiza; no recusado, nada é cobrado.
 *
 * ⚠️ Bloqueado por #4 (tabela de pacotes) e #6 (modelo de split no Asaas).
 */
test.skip('B2 · Comprar Claves', async ({ page }) => {
  // Implementar junto da tela, na R2. Enquanto o teste está `skip`, o
  // cenário aparece na saída da suíte como pendente — e não como aprovado.
  await page.goto('/');
});
