import { join } from 'node:path';

import { expect, test } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';

import { PERSONA } from '../apoio/personas';
import { entrarComo } from '../apoio/sessao';
import { ENVIAR } from '../apoio/textos';

/**
 * B6 · Contexto e revisão — módulo 3
 *
 * Cenário do [Guia de Testes da R2](../../docs/R2/guia-de-testes-r2.md), que é
 * o gate da release.
 *
 * **Passos**
 * 1. Escolha o gênero e escreva o que o curador precisa saber.
 * 1. Revise o resumo e clique em Enviar para curadoria.
 *
 * **Resultado esperado**
 * - O wizard mostra o progresso (3 passos).
 * - A revisão traz faixa, gênero e contexto.
 */

const MP3 = join(process.cwd(), 'e2e', 'apoio', 'arquivos', 'e2e-faixa.mp3');

/** Passo 1 completo — devolve o título usado, que é único por execução. */
async function ateOContexto(page: Page, info: TestInfo): Promise<string> {
  const titulo = `e2e_Faixa B6 ${info.workerIndex}-${Date.now().toString(36)}`;

  await entrarComo(page, PERSONA.ARTISTA);
  await page.goto('/artista/enviar');
  await page.getByLabel(/arraste o arquivo|arquivo escolhido/i).setInputFiles(MP3);
  await page.getByRole('textbox', { name: new RegExp(ENVIAR.rotuloTitulo) }).fill(titulo);
  await page.getByRole('button', { name: ENVIAR.continuar }).click();
  await page.waitForURL(/\/contexto$/);

  return titulo;
}

test.describe('B6 · Contexto e revisão', () => {
  test('o wizard mostra os três passos', async ({ page }, info) => {
    await ateOContexto(page, info);

    // O indicador é um `<nav>` nomeado com uma `<ol>` de verdade dentro, e o
    // passo atual leva `aria-current="step"`.
    const passos = page.getByRole('navigation', { name: /progresso/i });
    await expect(passos.getByRole('listitem')).toHaveCount(3);
    await expect(page.getByText(ENVIAR.passoDe(2, 3))).toBeVisible();
  });

  test('o contexto é obrigatório', { tag: ['@RF-038'] }, async ({ page }, info) => {
    await ateOContexto(page, info);

    // RF-038. O protótipo o chama de opcional; a divergência está registrada.
    await page.getByRole('button', { name: ENVIAR.continuar }).click();
    await expect(page.getByText(ENVIAR.erroContextoVazio)).toBeVisible();
  });

  test('a revisão traz faixa, gênero e contexto', { tag: ['@RF-039'] }, async ({ page }, info) => {
    const titulo = await ateOContexto(page, info);
    const contexto = 'Quero saber se a base compete com a voz no refrão.';

    // O chip é um `<label>` com a caixa visualmente escondida — clicar no
    // rótulo é o que uma pessoa faz, e é o que o Playwright consegue alcançar.
    await page.getByText('Indie', { exact: true }).click();
    await page.getByRole('textbox', { name: new RegExp(ENVIAR.rotuloContexto) }).fill(contexto);
    await page.getByRole('button', { name: ENVIAR.continuar }).click();

    await page.waitForURL(/\/revisao$/);
    await expect(page.getByText(ENVIAR.passoDe(3, 3))).toBeVisible();

    await expect(page.getByText(titulo)).toBeVisible();
    await expect(page.getByText('Indie', { exact: true })).toBeVisible();
    await expect(page.getByText(contexto)).toBeVisible();

    // O aviso de saldo é o que explica que nada foi debitado ainda.
    await expect(page.getByText(/as Claves só saem quando você confirma a seleção/i)).toBeVisible();
    await expect(page.getByRole('link', { name: ENVIAR.enviarParaCuradoria })).toBeVisible();
  });

  test(
    'não dá para pular para a revisão sem contexto',
    { tag: ['@RF-038'] },
    async ({ page }, info) => {
      await ateOContexto(page, info);

      const url = new URL(page.url());
      await page.goto(url.pathname.replace('/contexto', '/revisao'));

      // `podeAbrir` devolve a pessoa ao passo que ela de fato alcançou.
      await page.waitForURL(/\/contexto$/);
    },
  );
});
