import { expect, test } from '@playwright/test';

import { apagarContaEfemera, criarContaEfemera } from '../apoio/contas';
import type { ContaEfemera } from '../apoio/contas';
import { entrarComCredenciais } from '../apoio/sessao';
import { ONBOARDING } from '../apoio/textos';

/**
 * D3 · Onboarding — módulo 1.5, RF-007
 *
 * **Passos**
 * 1. Entre com uma conta de artista que ainda não viu o tour.
 * 2. Percorra os passos, ou pule.
 * 3. Entre de novo.
 *
 * **Resultado esperado**
 * - O tour tem quatro passos, com "Passo X de 4", Avançar, Voltar e Pular.
 * - Pular e finalizar levam ao ambiente, e o tour **não reaparece**.
 * - "Rever onboarding" o reabre.
 *
 * ## Por que contas descartáveis
 *
 * Ver o tour grava `onboarding_visto_em`, e não há como desver. A persona
 * `TOUR` é a única que abre essa tela, e a suíte de paridade visual depende
 * disso — gastá-la aqui apagaria a tela que ela existe para abrir. Cada teste
 * cria a sua conta, já com papel de artista e o tour pendente, e a apaga no fim.
 *
 * ## O que "não reaparece" prova
 *
 * É a única parte do requisito que não se vê numa tela só: exige entrar duas
 * vezes. E é a que quebra em silêncio — um `encerrarOnboarding` que não gravasse
 * deixaria o tour aparecendo a cada login, e nenhum teste de tela notaria.
 */

const descartaveis: ContaEfemera[] = [];

async function artistaComTourPendente(indiceDoWorker: number): Promise<ContaEfemera> {
  const conta = await criarContaEfemera({
    rotulo: 'tour',
    indiceDoWorker,
    papeis: ['artista'],
  });
  descartaveis.push(conta);
  return conta;
}

test.afterAll(async () => {
  await Promise.all(descartaveis.map(apagarContaEfemera));
});

test.describe('D3 · Onboarding', { tag: ['@RF-007'] }, () => {
  test('o tour tem quatro passos, com avançar, voltar e pular', async ({ page }, info) => {
    const conta = await artistaComTourPendente(info.workerIndex);

    await entrarComCredenciais(page, conta.email);
    await page.waitForURL(/\/onboarding/);

    const total = ONBOARDING.artista.length;
    await expect(page.getByText(ONBOARDING.passoDe(1, total))).toBeVisible();
    await expect(page.getByRole('button', { name: ONBOARDING.pular })).toBeVisible();

    // "Voltar" só existe a partir do segundo passo: não há para onde voltar do
    // primeiro, e um botão morto ali seria ruído.
    await expect(page.getByRole('button', { name: ONBOARDING.voltar })).toHaveCount(0);

    await page.getByRole('button', { name: ONBOARDING.avancar }).click();
    await expect(page.getByText(ONBOARDING.passoDe(2, total))).toBeVisible();
    await expect(page.getByRole('button', { name: ONBOARDING.voltar })).toBeVisible();

    await page.getByRole('button', { name: ONBOARDING.voltar }).click();
    await expect(page.getByText(ONBOARDING.passoDe(1, total))).toBeVisible();

    // No último passo, "Avançar" dá lugar a "Finalizar" — é o que encerra.
    for (let passo = 1; passo < total; passo += 1) {
      await page.getByRole('button', { name: ONBOARDING.avancar }).click();
    }
    await expect(page.getByText(ONBOARDING.passoDe(total, total))).toBeVisible();
    await expect(page.getByRole('button', { name: ONBOARDING.finalizar })).toBeVisible();
    await expect(page.getByRole('button', { name: ONBOARDING.avancar })).toHaveCount(0);
  });

  test('pular entra no ambiente, e o tour não reaparece', async ({ page }, info) => {
    const conta = await artistaComTourPendente(info.workerIndex);

    await entrarComCredenciais(page, conta.email);
    await page.waitForURL(/\/onboarding/);

    await page.getByRole('button', { name: ONBOARDING.pular }).click();
    await page.waitForURL(/\/artista/);

    // A segunda entrada é a prova: pular tem de gravar tanto quanto finalizar,
    // senão o tour vira uma parede que reaparece a cada login.
    await page.goto('/artista/entrar');
    await expect(page).toHaveURL(/\/artista/);
    await expect(page).not.toHaveURL(/\/onboarding/);
  });

  test('finalizar entra no ambiente, e o tour não reaparece', async ({ page }, info) => {
    const conta = await artistaComTourPendente(info.workerIndex);

    await entrarComCredenciais(page, conta.email);
    await page.waitForURL(/\/onboarding/);

    for (let passo = 1; passo < ONBOARDING.artista.length; passo += 1) {
      await page.getByRole('button', { name: ONBOARDING.avancar }).click();
    }
    await page.getByRole('button', { name: ONBOARDING.finalizar }).click();
    await page.waitForURL(/\/artista/);

    await page.goto('/artista/entrar');
    await expect(page).toHaveURL(/\/artista/);
    await expect(page).not.toHaveURL(/\/onboarding/);
  });

  /**
   * "Rever onboarding" é o que torna o tour revisitável sem ser obrigatório.
   *
   * A nota do rodapé do próprio tour promete isso — *"você pode rever isso
   * depois, pelo menu de ajuda"* —, e uma promessa na tela sem caminho é pior
   * que nenhuma promessa.
   *
   * A guarda **não** redireciona quem sai de `/onboarding` já tendo visto: é
   * o que permite revisitar. Este teste é o que impede alguém de "consertar"
   * essa ausência de redirecionamento achando que é um buraco.
   */
  test('quem já viu pode rever o tour pela URL', async ({ page }, info) => {
    const conta = await artistaComTourPendente(info.workerIndex);

    await entrarComCredenciais(page, conta.email);
    await page.waitForURL(/\/onboarding/);
    await page.getByRole('button', { name: ONBOARDING.pular }).click();
    await page.waitForURL(/\/artista/);

    await page.goto('/onboarding');

    await expect(page).toHaveURL(/\/onboarding/);
    await expect(page.getByText(ONBOARDING.passoDe(1, ONBOARDING.artista.length))).toBeVisible();
  });
});
