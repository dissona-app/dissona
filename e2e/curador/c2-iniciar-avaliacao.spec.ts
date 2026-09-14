import { expect, test } from '@playwright/test';

import { abrirAvaliacao, abrirPelaFila, FAIXA_NA_FILA } from '../apoio/avaliacao';
import { PERSONA } from '../apoio/personas';
import { entrarComo } from '../apoio/sessao';
import { AVALIAR, FILA } from '../apoio/textos';

/**
 * C2 · Iniciar avaliação — módulo 13.1
 *
 * Cenário do [Guia de Testes da R2](../../docs/R2/guia-de-testes-r2.md), que é
 * o gate da release.
 *
 * **Passos**
 * 1. Abra um item da fila e clique em Iniciar avaliação.
 *
 * **Resultado esperado**
 * - Detalhe mostra dados, prazo e serviço contratado.
 * - Segue para a avaliação (notas + feedback).
 */
test.describe('C2 · Iniciar avaliação', () => {
  test('o detalhe traz prazo e serviço contratado', async ({ page }) => {
    await entrarComo(page, PERSONA.CURADOR_BRONZE);
    await page.goto('/curador/fila');

    await page
      .getByRole('row')
      .filter({ hasText: FAIXA_NA_FILA })
      .getByRole('link')
      .first()
      .click();

    await expect(page.getByRole('heading', { name: FAIXA_NA_FILA })).toBeVisible();
    await expect(page.getByRole('heading', { name: FILA.prazoRestante })).toBeVisible();
    await expect(page.getByRole('heading', { name: FILA.rotuloServico })).toBeVisible();
    await expect(page.getByText(FILA.totalDaLeitura)).toBeVisible();
  });

  test('"Iniciar avaliação" abre a etapa das notas', async ({ page }) => {
    const envioId = await abrirAvaliacao(page, FAIXA_NA_FILA);

    expect(envioId).not.toBe('');
    await expect(page).toHaveURL(new RegExp(`/curador/avaliar/${envioId}/notas$`));
    await expect(page.getByRole('heading', { name: AVALIAR.tituloNotas })).toBeVisible();
  });

  /**
   * A retomada usa o **mesmo** botão: quem salvou e saiu volta pela fila. Sem
   * `avaliando` na lista de situações aceitas, a segunda entrada afetaria zero
   * linhas e a tela acusaria um envio indisponível que está, sim, na fila.
   */
  test('entrar de novo na mesma faixa continua funcionando', async ({ page }) => {
    await abrirAvaliacao(page, FAIXA_NA_FILA);
    const envioId = await abrirPelaFila(page, FAIXA_NA_FILA);

    await expect(page).toHaveURL(new RegExp(`/curador/avaliar/${envioId}/notas$`));
    await expect(page.getByText(FILA.erroNaoEstaMaisNaFila)).toHaveCount(0);
  });

  test('o indicador mostra as quatro etapas', async ({ page }) => {
    await abrirAvaliacao(page, FAIXA_NA_FILA);

    const indicador = page.getByRole('navigation', { name: 'Etapas da avaliação' });
    for (const etapa of AVALIAR.passos) {
      await expect(indicador.getByText(etapa, { exact: true }), etapa).toBeVisible();
    }
  });
});
