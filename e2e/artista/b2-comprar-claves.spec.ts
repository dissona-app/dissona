import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { PERSONA } from '../apoio/personas';
import { entrarComo } from '../apoio/sessao';
import { CARTEIRA, CHECKOUT, PACOTES } from '../apoio/textos';

/**
 * B2 · Comprar Claves — módulo 5.1 · 5.2
 *
 * Cenário do [Guia de Testes da R2](../../docs/R2/guia-de-testes-r2.md), que é
 * o gate da release.
 *
 * **Passos**
 * 1. Clique em Comprar Claves e escolha um pacote.
 * 1. No checkout, escolha Cartão ou Pix e confirme.
 * 1. Teste os dois resultados (aprovado e recusado).
 *
 * **Resultado esperado**
 * - Estados Processando / Aprovado / Recusado aparecem.
 * - No aprovado, o saldo atualiza; no recusado, nada é cobrado.
 *
 * ## O que este cenário exige do ambiente
 *
 * **`SUPABASE_SERVICE_ROLE_KEY` precisa estar no ambiente.** Os dois cenários
 * que confirmam ou recusam o pagamento passam pelas RPCs `confirmar_pedido_clave`
 * e `recusar_pedido_clave`, que são revogadas até de `authenticated` — quem as
 * chama é o webhook, pela service role, e é o mesmo caminho que o checkout
 * simulado percorre. Sem a variável, os dois falham com a tela de erro do
 * servidor; os outros três passam, porque só leem. É o mesmo pré-requisito do
 * convite de admin (27.3) e do painel de sessões (7.4), e está no item pendente
 * de R0 no [BACKLOG](../../docs/BACKLOG.md).
 *
 * `PAGAMENTO_SIMULADO` não pode estar em `false`. O Asaas segue bloqueado por
 * [#6](../../docs/open-questions.md) e o provedor simulado é o único que
 * existe — é ele que o seletor "Simular resultado" comanda, e é o desenho do
 * próprio protótipo da R2. Com o provedor real configurado, o seletor some e
 * este cenário passa a ser manual, com cartão de teste do gateway.
 *
 * ⚠️ Como C6, **este cenário escreve**: cada execução aprovada credita um
 * pacote de Claves na carteira de `e2e_artista`. Não há o que repor — o ledger
 * é append-only —, e por isso B1 e B3 afirmam estrutura e coerência, nunca os
 * números do seed. Um teste daqui que fixasse "25 Claves" quebraria na segunda
 * rodada, e a culpa pareceria ser de B1.
 */

/**
 * O saldo da Carteira como número, para comparar antes e depois.
 *
 * Localizado pela forma do próprio texto — "25,00 Claves" — e não por um
 * `data-testid`: não há nenhum no projeto, e acrescentar um só para este teste
 * poria um atributo de teste na tela mais sensível do artista. Os outros
 * números da Carteira ("Comprometidas", "Devolvidas") vêm sem a unidade, então
 * o padrão é único.
 */
async function lerSaldo(page: Page): Promise<number> {
  await page.goto('/artista/carteira');

  const bruto = await page
    .locator('p')
    .filter({ hasText: new RegExp(`^[\\d.,]+\\s*${CARTEIRA.saldoUnidade}$`) })
    .first()
    .innerText();

  return Number(
    bruto.replace(CARTEIRA.saldoUnidade, '').trim().replace(/\./g, '').replace(',', '.'),
  );
}

/** Da Carteira até o checkout do primeiro pacote, pelo caminho da pessoa. */
async function abrirCheckout(page: Page) {
  await page.goto('/artista/carteira');
  await page.getByRole('link', { name: CARTEIRA.comprar }).first().click();
  await page.waitForURL(/\/artista\/pacotes$/);

  await expect(page.getByText(PACOTES.chamada)).toBeVisible();

  await page
    .getByRole('link', { name: new RegExp(`^${PACOTES.escolher}`) })
    .first()
    .click();
  await page.waitForURL(/\/artista\/pacotes\/[0-9a-f-]{36}$/);
}

test.describe('B2 · Comprar Claves', () => {
  test('a vitrine lista os pacotes com preço por Clave', async ({ page }) => {
    await entrarComo(page, PERSONA.ARTISTA);
    await page.goto('/artista/pacotes');

    // Escopo em `main`: a sidebar do shell também é uma lista, e
    // `getByRole('listitem')` solto pega "Início" antes de chegar à vitrine.
    const cartoes = page.getByRole('main').getByRole('listitem');
    await expect(cartoes.first()).toBeVisible();

    // "R$ 9,50 por Clave" — o número é derivado do valor do pacote, e o que
    // importa aqui é que a vitrine o mostra, não quanto ele dá: os pacotes
    // vêm da tela 21 e a equipe pode mudá-los.
    await expect(cartoes.first()).toContainText(/por Clave/);
    await expect(
      cartoes.first().getByRole('link', { name: new RegExp(`^${PACOTES.escolher}`) }),
    ).toBeVisible();
  });

  test('o checkout mostra o resumo do pedido com total e preço por Clave', async ({ page }) => {
    await entrarComo(page, PERSONA.ARTISTA);
    await abrirCheckout(page);

    const resumo = page.getByRole('region', { name: CHECKOUT.resumoTitulo });
    await expect(resumo).toBeVisible();
    await expect(resumo.getByText(CHECKOUT.total, { exact: true })).toBeVisible();
    await expect(resumo).toContainText(/R\$/);
  });

  test('o cartão recusa antes de cobrar quando os campos não são válidos', async ({ page }) => {
    await entrarComo(page, PERSONA.ARTISTA);
    await abrirCheckout(page);

    // O protótipo, sendo mock, **preenchia** os campos inválidos com valores
    // fictícios e seguia. Aqui o erro aparece no campo e a ação não roda — a
    // mesma decisão que a tela 21.1 tomou contra a coerção silenciosa.
    await page.getByRole('button', { name: CHECKOUT.confirmar }).click();

    await expect(page.getByText(CHECKOUT.erroCartaoNumero)).toBeVisible();
    await expect(page.getByText(CHECKOUT.aprovadoTitulo)).toHaveCount(0);
    await expect(page.getByText(CHECKOUT.recusadoTitulo)).toHaveCount(0);
  });

  test('recusado: o estado aparece e o saldo não muda', async ({ page }) => {
    await entrarComo(page, PERSONA.ARTISTA);
    const antes = await lerSaldo(page);

    await abrirCheckout(page);

    await page.getByLabel(CHECKOUT.numero).fill('4539 8123 4567 8901');
    await page.getByLabel(CHECKOUT.nome).fill('E2E Artista');
    await page.getByLabel(CHECKOUT.validade).fill('08/29');
    await page.getByLabel(CHECKOUT.cvv).fill('123');

    await page.getByRole('radio', { name: CHECKOUT.simulacoes.recusado }).click();
    await page.getByRole('button', { name: CHECKOUT.confirmar }).click();

    await expect(page.getByText(CHECKOUT.recusadoTitulo)).toBeVisible();
    await expect(page.getByText(CHECKOUT.recusadoTexto)).toBeVisible();

    // "Nada foi debitado e o saldo continua o mesmo" é a promessa da tela, e é
    // a única parte do cenário que o banco tem de sustentar.
    expect(await lerSaldo(page)).toBe(antes);
  });

  test('aprovado: o saldo cresce e o extrato registra a compra', async ({ page }) => {
    await entrarComo(page, PERSONA.ARTISTA);
    const antes = await lerSaldo(page);

    await abrirCheckout(page);

    // Pix, para exercitar o outro meio: ele não tem campo nenhum a validar, e
    // o pedido grava `meio = 'pix'`.
    await page.getByRole('radio', { name: CHECKOUT.meios.pix }).click();
    await page.getByRole('radio', { name: CHECKOUT.simulacoes.aprovado }).click();
    await page.getByRole('button', { name: CHECKOUT.confirmar }).click();

    await expect(page.getByText(CHECKOUT.aprovadoTitulo)).toBeVisible();
    await expect(page.getByText(/entraram na sua carteira/)).toBeVisible();

    const depois = await lerSaldo(page);
    expect(depois).toBeGreaterThan(antes);

    await page.goto('/artista/carteira/extrato');
    await expect(
      page.getByRole('row').filter({ hasText: CARTEIRA.tipos.compra }).first(),
    ).toBeVisible();
  });
});
