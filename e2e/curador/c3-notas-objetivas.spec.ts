import { test } from '@playwright/test';

/**
 * C3 · Notas objetivas — módulo 14
 *
 * Cenário do [Guia de Testes da R2](../../docs/R2/guia-de-testes-r2.md), que é
 * o gate da release.
 *
 * **Passos**
 * 1. Ouça a faixa no player.
 * 1. Dê as notas por critério (até 11 itens, com casa decimal).
 * 1. Escreva as justificativas.
 *
 * **Resultado esperado**
 * - O player mede a escuta.
 * - As notas aceitam casas decimais.
 * - Justificar rende acréscimo na remuneração.
 *
 * ⚠️ Bloqueado por #1 (escuta mínima 60% ou 100%), #2 (11º critério) e #3 (quais 5 são obrigatórios).
 */
test.skip('C3 · Notas objetivas', async ({ page }) => {
  // Implementar junto da tela, na R2. Enquanto o teste está `skip`, o
  // cenário aparece na saída da suíte como pendente — e não como aprovado.
  await page.goto('/');
});
