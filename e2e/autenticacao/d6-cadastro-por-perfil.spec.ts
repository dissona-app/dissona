import { expect, test } from '@playwright/test';

import { apagarContaEfemera, criarContaEfemera } from '../apoio/contas';
import type { ContaEfemera } from '../apoio/contas';
import { gerarLinkDeEmail } from '../apoio/email';
import { senhaDeTeste } from '../apoio/personas';

/**
 * D6 · Cadastro por rota exclusiva grava o papel direto — RF-006
 *
 * **Passos**
 * 1. Gere o link de confirmação de uma conta nova como o `/artista/cadastrar`
 *    (ou `/curador/cadastrar`) o gera — com `papel` na query.
 * 2. Abra o link.
 *
 * **Resultado esperado**
 * - O papel é gravado na hora, e a pessoa vai direto ao ambiente/wizard certo.
 * - **Não** passa por `/selecao-de-perfil` — ao contrário de quem se cadastra
 *   por `/cadastrar` (D4), que ainda escolhe o papel depois.
 *
 * A rota exclusiva por perfil (`/artista/cadastrar`, `/curador/cadastrar`)
 * manda o papel escolhido para `/api/auth/confirmar` via `?papel=`, do mesmo
 * jeito que `proximo` já viaja em outras telas — ver `acoes.ts:cadastrar` e o
 * route handler. Este spec exercita esse mesmo mecanismo (`gerarLinkDeEmail`,
 * como D4 já faz), sem repetir o formulário de cadastro em si.
 */

const descartaveis: ContaEfemera[] = [];

async function contaNaoConfirmada(rotulo: string, indiceDoWorker: number): Promise<ContaEfemera> {
  const conta = await criarContaEfemera({ rotulo, indiceDoWorker, emailConfirmado: false });
  descartaveis.push(conta);
  return conta;
}

test.afterAll(async () => {
  await Promise.all(descartaveis.map(apagarContaEfemera));
});

test.describe('D6 · Cadastro por rota exclusiva', { tag: ['@RF-006'] }, () => {
  test('cadastro por /artista/cadastrar grava o papel e pula a seleção de perfil', async ({
    page,
  }, info) => {
    const conta = await contaNaoConfirmada('cad-art', info.workerIndex);

    const link = await gerarLinkDeEmail('signup', conta.email, {
      senha: senhaDeTeste(),
      papel: 'artista',
    });
    await page.goto(link.caminho);

    await page.waitForURL(/\/onboarding|\/artista/);
    await expect(page).not.toHaveURL(/\/selecao-de-perfil/);
  });

  test('cadastro por /curador/cadastrar grava o papel e vai direto ao wizard', async ({
    page,
  }, info) => {
    const conta = await contaNaoConfirmada('cad-cur', info.workerIndex);

    const link = await gerarLinkDeEmail('signup', conta.email, {
      senha: senhaDeTeste(),
      papel: 'curador',
    });
    await page.goto(link.caminho);

    await page.waitForURL(/\/curador\/cadastro/);
    await expect(page).not.toHaveURL(/\/selecao-de-perfil/);
  });
});
