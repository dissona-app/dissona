import { test } from '@playwright/test';

/**
 * A3 · Editar / ativar / excluir — módulo 21.1
 *
 * Cenário do [Guia de Testes da R2](../../docs/R2/guia-de-testes-r2.md), que é
 * o gate da release.
 *
 * **Passos**
 * 1. Edite um pacote.
 * 1. Ative/Desative um pacote.
 * 1. Exclua um pacote (com confirmação).
 *
 * **Resultado esperado**
 * - As ações funcionam e refletem na lista.
 * - Só os pacotes ativos aparecem para o artista.
 */
test.skip('A3 · Editar / ativar / excluir', async ({ page }) => {
  // Implementar junto da tela, na R2. Enquanto o teste está `skip`, o
  // cenário aparece na saída da suíte como pendente — e não como aprovado.
  await page.goto('/');
});
