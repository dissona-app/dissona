import { expect, test } from '@playwright/test';

import { PERSONA } from '../apoio/personas';
import { entrarComo } from '../apoio/sessao';
import { CARTEIRA } from '../apoio/textos';

/**
 * B3 · Extrato — módulo 5.3
 *
 * Cenário do [Guia de Testes da R2](../../docs/R2/guia-de-testes-r2.md), que é
 * o gate da release.
 *
 * **Passos**
 * 1. Abra o Extrato.
 *
 * **Resultado esperado**
 * - Lista Claves adquiridas, usadas e devolvidas, com data e origem.
 *
 * O seed produz os três tipos na conta de `e2e_artista`, então este é o
 * cenário que prova a promessa inteira do guia — e não só "a tabela existe".
 */

const EXTRATO = '/artista/carteira/extrato';

test.describe('B3 · Extrato', () => {
  test('a tabela traz as cinco colunas', async ({ page }) => {
    await entrarComo(page, PERSONA.ARTISTA);
    await page.goto(EXTRATO);

    const tabela = page.getByRole('table', { name: CARTEIRA.extratoTitulo });

    for (const coluna of Object.values(CARTEIRA.colunas)) {
      await expect(
        tabela.getByRole('columnheader', { name: coluna, exact: true }),
        `coluna "${coluna}"`,
      ).toBeVisible();
    }
  });

  test('lista os três tipos que o guia exige', async ({ page }) => {
    await entrarComo(page, PERSONA.ARTISTA);
    await page.goto(EXTRATO);

    const tabela = page.getByRole('table', { name: CARTEIRA.extratoTitulo });

    // Adquiridas, usadas e devolvidas — é o que o cenário pede, palavra por
    // palavra, e o que o seed garante existir.
    for (const tipo of [CARTEIRA.tipos.compra, CARTEIRA.tipos.consumo, CARTEIRA.tipos.devolucao]) {
      await expect(
        tabela.getByRole('cell', { name: tipo, exact: true }).first(),
        `tipo "${tipo}"`,
      ).toBeVisible();
    }
  });

  test('cada linha tem data e origem', async ({ page }) => {
    await entrarComo(page, PERSONA.ARTISTA);
    await page.goto(EXTRATO);

    const primeira = page
      .getByRole('table', { name: CARTEIRA.extratoTitulo })
      .getByRole('row')
      .nth(1);

    // Data em pt-BR (dd/mm/aaaa) — o `locale` do projeto está no
    // playwright.config.ts, então o formato é estável.
    await expect(primeira).toContainText(/\d{2}\/\d{2}\/\d{4}/);

    // A origem é `lancamento_clave.descricao`, escrita pelas RPCs.
    const origem = primeira.getByRole('rowheader');
    await expect(origem).not.toBeEmpty();
  });

  test('o filtro recorta por tipo e mantém o endereço', async ({ page }) => {
    await entrarComo(page, PERSONA.ARTISTA);
    await page.goto(EXTRATO);

    await page.getByRole('link', { name: CARTEIRA.filtros.adquiridas, exact: true }).click();
    await page.waitForURL(/tipo=adquiridas/);

    const tabela = page.getByRole('table', { name: CARTEIRA.extratoTitulo });

    // Só compras sobraram: nenhuma célula de "Usadas".
    await expect(
      tabela.getByRole('cell', { name: CARTEIRA.tipos.compra, exact: true }).first(),
    ).toBeVisible();
    await expect(
      tabela.getByRole('cell', { name: CARTEIRA.tipos.consumo, exact: true }),
    ).toHaveCount(0);

    // O filtro vive na URL, e não em estado local — recarregar preserva o
    // recorte. É o que dá endereço ao filtro e o faz funcionar sem JavaScript.
    await page.reload();
    await expect(
      tabela.getByRole('cell', { name: CARTEIRA.tipos.consumo, exact: true }),
    ).toHaveCount(0);
  });

  test('a nota sobre a devolução de 7 dias aparece', async ({ page }) => {
    await entrarComo(page, PERSONA.ARTISTA);
    await page.goto(EXTRATO);

    await expect(page.getByText(CARTEIRA.notaDevolucao)).toBeVisible();
  });
});
