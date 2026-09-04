import { test } from '@playwright/test';

/**
 * B6 · Contexto e revisão — módulo 3
 *
 * Cenário do [Guia de Testes da R2](../../docs/R2/guia-de-testes-r2.md), que é
 * o gate da release.
 *
 * **Passos**
 * 1. Escolha o gênero e escreva o que o curador precisa saber.
 * 1. Revise o resumo e clique em Enviar para curadoria.
 *
 * **Resultado esperado**
 * - O wizard mostra o progresso (3 passos).
 * - A revisão traz faixa, gênero e contexto.
 */
test.skip('B6 · Contexto e revisão', async ({ page }) => {
  // Implementar junto da tela, na R2. Enquanto o teste está `skip`, o
  // cenário aparece na saída da suíte como pendente — e não como aprovado.
  await page.goto('/');
});
