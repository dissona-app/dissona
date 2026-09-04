import { test } from '@playwright/test';

/**
 * C5 · Compartilhamento — módulo 14.2 · 14.3
 *
 * Cenário do [Guia de Testes da R2](../../docs/R2/guia-de-testes-r2.md), que é
 * o gate da release.
 *
 * **Passos**
 * 1. Escolha compartilhar (playlist/post/matéria) ou não.
 *
 * **Resultado esperado**
 * - Não é obrigatório; compartilhar dá acréscimo.
 * - O crédito libera ao confirmar (compartilhar ou não).
 *
 * A última linha corrobora o crédito-base, que já está decidido. A pendência
 * #8 pergunta outra coisa: se o **acréscimo** por compartilhamento fica retido
 * até a verificação da equipe. Sobre isso o guia é silencioso.
 */
test.skip('C5 · Compartilhamento', async ({ page }) => {
  // Implementar junto da tela, na R2. Enquanto o teste está `skip`, o
  // cenário aparece na saída da suíte como pendente — e não como aprovado.
  await page.goto('/');
});
