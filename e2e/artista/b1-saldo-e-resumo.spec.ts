import { expect, test } from '@playwright/test';

import { PERSONA } from '../apoio/personas';
import { entrarComo } from '../apoio/sessao';
import { CARTEIRA } from '../apoio/textos';

/**
 * B1 · Saldo e resumo — módulo 5
 *
 * Cenário do [Guia de Testes da R2](../../docs/R2/guia-de-testes-r2.md), que é
 * o gate da release.
 *
 * **Passos**
 * 1. Abra a Carteira.
 *
 * **Resultado esperado**
 * - Mostra saldo, adquiridas/usadas/devolvidas e as últimas movimentações.
 *
 * A carteira de `e2e_artista` é semeada por `supabase/testes/dados-e2e.sql`
 * com os **três** tipos de lançamento, e nenhum deles por `insert` no ledger:
 * o seed encena a história real — compra, seleção de curadores e devolução por
 * SLA —, porque `lancamento_clave` é append-only e só RPC escreve nele.
 *
 * O teste **não** afirma os números do seed. Prende-se à estrutura e à
 * coerência: o saldo é dado compartilhado, e amarrar "25 Claves" aqui faria a
 * suíte quebrar no dia em que alguém comprar uma Clave no Preview. Quem afirma
 * a aritmética é `src/modulos/claves/__testes__/servico.test.ts`.
 */
test.describe('B1 · Saldo e resumo', () => {
  test('o saldo aparece em Claves, com o equivalente em reais', async ({ page }) => {
    await entrarComo(page, PERSONA.ARTISTA);
    await page.goto('/artista/carteira');

    await expect(page.getByText(CARTEIRA.saldoTitulo)).toBeVisible();
    await expect(page.getByText(CARTEIRA.saldoUnidade, { exact: true })).toBeVisible();

    // A nota traz "… em crédito. Uma Clave equivale a R$ …" — os dois valores
    // são formatados no servidor, e o que importa aqui é que ela existe e
    // menciona a moeda, não quanto ela diz.
    await expect(page.getByText(/em crédito\. Uma Clave equivale a R\$/)).toBeVisible();
  });

  test('os dois recortes do saldo aparecem', async ({ page }) => {
    await entrarComo(page, PERSONA.ARTISTA);
    await page.goto('/artista/carteira');

    // "Comprometidas" e "Devolvidas" são recortes de exibição, e não parcelas
    // a subtrair do disponível — o comentário da view `saldo_carteira` é
    // explícito. A tela só precisa mostrá-los.
    await expect(page.getByText(CARTEIRA.comprometidas)).toBeVisible();
    await expect(page.getByText(CARTEIRA.devolvidas).first()).toBeVisible();
  });

  test('o resumo traz adquiridas, usadas e devolvidas', async ({ page }) => {
    await entrarComo(page, PERSONA.ARTISTA);
    await page.goto('/artista/carteira');

    for (const card of Object.values(CARTEIRA.resumo)) {
      await expect(page.getByText(card.rotulo, { exact: true }), card.rotulo).toBeVisible();
      await expect(page.getByText(card.descricao), card.descricao).toBeVisible();
    }
  });

  test('as últimas movimentações listam origem e tipo', async ({ page }) => {
    await entrarComo(page, PERSONA.ARTISTA);
    await page.goto('/artista/carteira');

    const painel = page.getByRole('region', { name: CARTEIRA.ultimasTitulo });
    await expect(painel).toBeVisible();

    // O seed garante movimento, então o estado vazio não deve aparecer.
    await expect(page.getByText(CARTEIRA.vazioTitulo)).toHaveCount(0);

    const itens = painel.getByRole('listitem');
    await expect(itens.first()).toBeVisible();

    // A origem é `lancamento_clave.descricao`, e o seed a produz pelas RPCs —
    // "Curadoria de …" no consumo, "Devolucao por falta de resposta…" na
    // devolução. Aqui basta que a linha tenha texto e um tipo reconhecível.
    await expect(itens.first()).toContainText(new RegExp(Object.values(CARTEIRA.tipos).join('|')));
  });

  test('há caminho para o extrato', async ({ page }) => {
    await entrarComo(page, PERSONA.ARTISTA);
    await page.goto('/artista/carteira');

    await page.getByRole('link', { name: CARTEIRA.verExtrato }).click();
    await page.waitForURL(/\/artista\/carteira\/extrato/);

    await expect(page.getByRole('table')).toBeVisible();
  });
});
