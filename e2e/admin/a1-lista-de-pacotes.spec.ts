import { test } from '@playwright/test';

/**
 * A1 · Lista de pacotes — módulo 21
 *
 * Cenário do [Guia de Testes da R2](../../docs/R2/guia-de-testes-r2.md), que é
 * o gate da release.
 *
 * **Passos**
 * 1. Abra Pacotes de Claves.
 * 1. Veja a tabela e o status de cada pacote.
 *
 * **Resultado esperado**
 * - Tabela com Nome, Qtd, Valor, Desconto, Preço/Clave e Status.
 * - Ações Editar / Ativar-Desativar / Excluir visíveis.
 */
test.skip('A1 · Lista de pacotes', async ({ page }) => {
  // Implementar junto da tela, na R2. Enquanto o teste está `skip`, o
  // cenário aparece na saída da suíte como pendente — e não como aprovado.
  await page.goto('/');
});
