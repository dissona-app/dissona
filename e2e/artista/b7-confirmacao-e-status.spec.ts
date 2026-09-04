import { test } from '@playwright/test';

/**
 * B7 · Confirmação e status — módulo 3 · 3.3
 *
 * Cenário do [Guia de Testes da R2](../../docs/R2/guia-de-testes-r2.md), que é
 * o gate da release.
 *
 * **Passos**
 * 1. Veja a tela de confirmação.
 * 1. Clique em Acompanhar status.
 *
 * **Resultado esperado**
 * - Confirmação de que o envio chegou.
 * - O Status mostra o progresso por curador (Recebeu → Ouviu → Avaliando → Pronto).
 *
 * ⚠️ O protótipo diz "Sua submissão chegou"; a terminologia decidida é "Envios", nunca "Submissões" (PRD §9).
 */
test.skip('B7 · Confirmação e status', async ({ page }) => {
  // Implementar junto da tela, na R2. Enquanto o teste está `skip`, o
  // cenário aparece na saída da suíte como pendente — e não como aprovado.
  await page.goto('/');
});
