import { expect, test } from '@playwright/test';

import { apagarContaEfemera, criarContaEfemera } from '../apoio/contas';
import type { ContaEfemera } from '../apoio/contas';
import { entrarComCredenciais } from '../apoio/sessao';
import { SELECAO_DE_PERFIL } from '../apoio/textos';

/**
 * D2 · Seleção de perfil — módulo 1.4, RF-006
 *
 * **Passos**
 * 1. Entre com uma conta que ainda não tem papel.
 * 2. Escolha artista, ou escolha curador.
 *
 * **Resultado esperado**
 * - As duas opções aparecem, com a nota de que a escolha não é definitiva.
 * - Artista leva ao onboarding; curador leva ao cadastro de curador, e **não**
 *   ao onboarding.
 *
 * ## Por que contas descartáveis
 *
 * Escolher um perfil dá um papel à conta **para sempre**. A persona `SEM_PAPEL`
 * é a única em estado de primeiro acesso, e a suíte de paridade visual depende
 * disso: gastá-la aqui apagaria a única tela que ela existe para abrir. Cada
 * teste cria a sua conta e a apaga no fim.
 *
 * ## A escolha é a ação, e é por isso que não há radio
 *
 * Cada card é o `<button type="submit">` do seu próprio formulário — um clique,
 * uma decisão, sem passo intermediário de confirmar. O teste clica no botão
 * pelo nome acessível, que é o que uma pessoa com leitor de tela ouve.
 */

const descartaveis: ContaEfemera[] = [];

async function contaSemPapel(indiceDoWorker: number): Promise<ContaEfemera> {
  const conta = await criarContaEfemera({ rotulo: 'perfil', indiceDoWorker });
  descartaveis.push(conta);
  return conta;
}

test.afterAll(async () => {
  await Promise.all(descartaveis.map(apagarContaEfemera));
});

test.describe('D2 · Seleção de perfil', { tag: ['@RF-006'] }, () => {
  test('as duas opções aparecem, com a nota de que o papel se acumula', async ({ page }, info) => {
    const conta = await contaSemPapel(info.workerIndex);

    await entrarComCredenciais(page, conta.email);
    await page.waitForURL(/\/selecao-de-perfil/);

    await expect(page.getByRole('heading', { name: SELECAO_DE_PERFIL.titulo })).toBeVisible();
    await expect(
      page.getByRole('button', { name: new RegExp(SELECAO_DE_PERFIL.artistaTitulo) }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: new RegExp(SELECAO_DE_PERFIL.curadorTitulo) }),
    ).toBeVisible();

    // A nota é o que impede a pessoa de criar uma segunda conta para o outro
    // papel — é requisito de produto, não decoração.
    await expect(page.getByText(SELECAO_DE_PERFIL.nota)).toBeVisible();
  });

  test('escolher artista leva ao onboarding', async ({ page }, info) => {
    const conta = await contaSemPapel(info.workerIndex);

    await entrarComCredenciais(page, conta.email);
    await page.waitForURL(/\/selecao-de-perfil/);

    await page.getByRole('button', { name: new RegExp(SELECAO_DE_PERFIL.artistaTitulo) }).click();

    await page.waitForURL(/\/onboarding/);
  });

  /**
   * O curador **não** passa pelo onboarding, e isso não é omissão.
   *
   * O caminho dele é o cadastro de oito passos, e `inicioDoUsuario` o manda
   * para lá antes de qualquer tour — a própria tela avisa disso na nota de
   * curador. Um teste que esperasse onboarding aqui estaria testando o produto
   * errado.
   */
  test('escolher curador leva ao cadastro, e não ao onboarding', async ({ page }, info) => {
    const conta = await contaSemPapel(info.workerIndex);

    await entrarComCredenciais(page, conta.email);
    await page.waitForURL(/\/selecao-de-perfil/);

    await expect(page.getByText(SELECAO_DE_PERFIL.notaCurador)).toBeVisible();

    await page.getByRole('button', { name: new RegExp(SELECAO_DE_PERFIL.curadorTitulo) }).click();

    await page.waitForURL(/\/curador\/cadastro/);
    await expect(page).not.toHaveURL(/\/onboarding/);
  });
});
