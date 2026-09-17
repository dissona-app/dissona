import { expect, test } from '@playwright/test';

import { abrirAvaliacao, abrirPelaFila, FAIXA_NA_FILA } from '../apoio/avaliacao';
import { envioDaFaixa } from '../apoio/banco';
import { PERSONA } from '../apoio/personas';
import { entrarComo } from '../apoio/sessao';
import { AVALIAR, FILA, STATUS_DO_ENVIO } from '../apoio/textos';

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
 * - **O envio passa a "avaliando"** — e o artista vê isso em 3.3.
 */
test.describe('C2 · Iniciar avaliação', () => {
  test('o detalhe traz prazo e serviço contratado', { tag: ['@RF-056'] }, async ({ page }) => {
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

  test('"Iniciar avaliação" abre a etapa das notas', { tag: ['@RF-057'] }, async ({ page }) => {
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
  test(
    'entrar de novo na mesma faixa continua funcionando',
    { tag: ['@RF-057'] },
    async ({ page }) => {
      await abrirAvaliacao(page, FAIXA_NA_FILA);
      const envioId = await abrirPelaFila(page, FAIXA_NA_FILA);

      await expect(page).toHaveURL(new RegExp(`/curador/avaliar/${envioId}/notas$`));
      await expect(page.getByText(FILA.erroNaoEstaMaisNaFila)).toHaveCount(0);
    },
  );

  /**
   * RF-057 tem duas metades, e a que importa é a segunda.
   *
   * Que `envio.situacao` virou `avaliando` é detalhe de implementação; o que o
   * requisito promete é que **o artista passa a ver o andamento**. Por isso a
   * asserção principal é a tela 3.3, num segundo contexto autenticado como o
   * dono da faixa — a mesma faixa, os dois lados, na mesma execução. O estado
   * no banco entra como confirmação, não como prova única.
   *
   * O contexto separado não é luxo: `page` já tem a sessão do curador, e
   * `entrarComo` seria expulso de `/entrar` pela guarda de rota.
   */
  test(
    'iniciar a avaliação move o envio para avaliando',
    { tag: ['@RF-057'] },
    async ({ page, browser }) => {
      await abrirAvaliacao(page, FAIXA_NA_FILA);

      const envio = await envioDaFaixa(FAIXA_NA_FILA);
      expect(
        envio,
        `rode supabase/testes/dados-e2e.sql — "${FAIXA_NA_FILA}" não tem envio ativo`,
      ).not.toBeNull();
      expect(envio?.situacao).toBe('avaliando');

      const contextoDoArtista = await browser.newContext();
      try {
        const paginaDoArtista = await contextoDoArtista.newPage();
        await entrarComo(paginaDoArtista, PERSONA.ARTISTA);
        await paginaDoArtista.goto(`/artista/enviar/${envio?.faixaId ?? ''}/status`);

        await expect(
          paginaDoArtista.getByRole('row').filter({ hasText: STATUS_DO_ENVIO.etapas.avaliando }),
          'a tela 3.3 precisa mostrar a etapa "Avaliando" para o curador que começou',
        ).toHaveCount(1);
      } finally {
        await contextoDoArtista.close();
      }
    },
  );

  test('o indicador mostra as quatro etapas', async ({ page }) => {
    await abrirAvaliacao(page, FAIXA_NA_FILA);

    const indicador = page.getByRole('navigation', { name: 'Etapas da avaliação' });
    for (const etapa of AVALIAR.passos) {
      await expect(indicador.getByText(etapa, { exact: true }), etapa).toBeVisible();
    }
  });
});
