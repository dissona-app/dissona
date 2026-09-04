import { test } from '@playwright/test';

/**
 * B4 · Enviar por link — módulo 3 · 3.1
 *
 * Cenário do [Guia de Testes da R2](../../docs/R2/guia-de-testes-r2.md), que é
 * o gate da release.
 *
 * **Passos**
 * 1. Cole um link (Spotify/YouTube).
 * 1. Clique em Detectar faixa.
 *
 * **Resultado esperado**
 * - A faixa é detectada (capa e título aparecem).
 * - Se não detectar, abre o preenchimento manual.
 */
test.skip('B4 · Enviar por link', async ({ page }) => {
  // Implementar junto da tela, na R2. Enquanto o teste está `skip`, o
  // cenário aparece na saída da suíte como pendente — e não como aprovado.
  await page.goto('/');
});
