import { test } from '@playwright/test';

/**
 * B5 · Enviar por arquivo — módulo 3 · 3.2
 *
 * Cenário do [Guia de Testes da R2](../../docs/R2/guia-de-testes-r2.md), que é
 * o gate da release.
 *
 * **Passos**
 * 1. Envie um arquivo (mp3/wav).
 * 1. Preencha os detalhes (título, capa, gênero, data).
 *
 * **Resultado esperado**
 * - Aceita o arquivo e segue para o contexto.
 *
 * ⚠️ Depende de #7 (armazenar o mp3 sempre ou só fora do streaming).
 */
test.skip('B5 · Enviar por arquivo', async ({ page }) => {
  // Implementar junto da tela, na R2. Enquanto o teste está `skip`, o
  // cenário aparece na saída da suíte como pendente — e não como aprovado.
  await page.goto('/');
});
