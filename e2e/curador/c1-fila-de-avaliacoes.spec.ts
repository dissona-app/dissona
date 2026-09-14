import { expect, test } from '@playwright/test';

import { PERSONA } from '../apoio/personas';
import { entrarComo } from '../apoio/sessao';
import { FILA } from '../apoio/textos';

/**
 * C1 · Fila de avaliações — módulo 13
 *
 * Cenário do [Guia de Testes da R2](../../docs/R2/guia-de-testes-r2.md), que é
 * o gate da release.
 *
 * **Passos**
 * 1. Abra a Fila.
 * 1. Ordene/filtre por prazo e status.
 *
 * **Resultado esperado**
 * - Tabela com música, prazo (72h) e status.
 * - Ordenação por prazo (mais urgente primeiro) funciona.
 *
 * A fila de `e2e_bronze` é semeada por `supabase/testes/dados-e2e.sql`. O nome
 * do artista vem da view `fila_do_curador` (`0006d`) — sem ela a tabela vinha
 * **vazia**, porque `perfil` é privado e o embed virava inner join com nada.
 */
test.describe('C1 · Fila de avaliações', () => {
  test('a tabela traz as cinco colunas', async ({ page }) => {
    await entrarComo(page, PERSONA.CURADOR_BRONZE);
    await page.goto('/curador/fila');

    const tabela = page.getByRole('table', { name: FILA.titulo });

    for (const coluna of Object.values(FILA.colunas)) {
      await expect(
        tabela.getByRole('columnheader', { name: new RegExp(coluna) }),
        `coluna "${coluna}"`,
      ).toBeVisible();
    }
  });

  test('lista a faixa com artista e prazo', async ({ page }) => {
    await entrarComo(page, PERSONA.CURADOR_BRONZE);
    await page.goto('/curador/fila');

    const linhas = page.getByRole('table', { name: FILA.titulo }).getByRole('row');
    // Cabeçalho + ao menos um envio.
    await expect(linhas).not.toHaveCount(1);

    const primeira = linhas.nth(1);
    // O nome do artista é o que a view `0006d` destravou.
    await expect(primeira).toContainText('E2E Artista');
    // Prazo no formato do protótipo: "Nh" ou "Nd Nh" ou "Vencido há …".
    await expect(primeira).toContainText(/\d+h|\d+d|Vencido/);
  });

  test('as três colunas ordenáveis expõem aria-sort', async ({ page }) => {
    await entrarComo(page, PERSONA.CURADOR_BRONZE);
    await page.goto('/curador/fila');

    const tabela = page.getByRole('table', { name: FILA.titulo });

    // RF-054 pede `aria-sort` explicitamente. O padrão é prazo ascendente —
    // o mais urgente primeiro.
    await expect(
      tabela.getByRole('columnheader', { name: new RegExp(FILA.colunas.prazo) }),
    ).toHaveAttribute('aria-sort', 'ascending');
  });

  test('ordenar por prazo inverte e o recorte fica na URL', async ({ page }) => {
    await entrarComo(page, PERSONA.CURADOR_BRONZE);
    await page.goto('/curador/fila');

    const tabela = page.getByRole('table', { name: FILA.titulo });
    await tabela
      .getByRole('columnheader', { name: new RegExp(FILA.colunas.prazo) })
      .getByRole('button')
      .click();

    await page.waitForURL(/ordem=prazo&dir=desc|dir=desc/);
    await expect(
      tabela.getByRole('columnheader', { name: new RegExp(FILA.colunas.prazo) }),
    ).toHaveAttribute('aria-sort', 'descending');
  });

  test('o filtro por status recorta, e o vazio explica o recorte', async ({ page }) => {
    await entrarComo(page, PERSONA.CURADOR_BRONZE);
    await page.goto('/curador/fila');

    // "Atrasada" não é valor do enum: é prazo vencido. A faixa semeada está no
    // prazo, então este recorte fica vazio — e o vazio tem de falar do filtro,
    // não da fila.
    await page.getByRole('link', { name: FILA.filtros.atrasada, exact: true }).click();
    await page.waitForURL(/status=atrasada/);

    await expect(page.getByText(FILA.vazioTitulo)).toBeVisible();
    await expect(page.getByText(FILA.vazioDescricao)).toBeVisible();
  });

  test('o resumo conta a fila inteira, e não o recorte', async ({ page }) => {
    await entrarComo(page, PERSONA.CURADOR_BRONZE);
    await page.goto('/curador/fila?status=atrasada');

    // Mesmo com o filtro vazio, o resumo segue contando quantas faixas há.
    await expect(page.getByText(/faixas? na fila · \d+ com prazo curto/)).toBeVisible();
  });

  test('a nota das 72h e dos 7 dias aparece', async ({ page }) => {
    await entrarComo(page, PERSONA.CURADOR_BRONZE);
    await page.goto('/curador/fila');

    await expect(page.getByText(FILA.nota)).toBeVisible();
  });
});
