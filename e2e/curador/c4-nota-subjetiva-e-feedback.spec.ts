import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { abrirAvaliacao, avancar, FAIXA_DO_C4, preencherObrigatorios } from '../apoio/avaliacao';
import { AVALIAR } from '../apoio/textos';

/**
 * C4 · Nota subjetiva e feedback — módulo 14.1
 *
 * Cenário do [Guia de Testes da R2](../../docs/R2/guia-de-testes-r2.md), que é
 * o gate da release.
 *
 * **Passos**
 * 1. Dê a nota subjetiva e escreva o feedback.
 *
 * **Resultado esperado**
 * - O feedback é obrigatório (mínimo de caracteres para o acréscimo).
 *
 * As duas metades do resultado esperado são coisas **diferentes**, e o teste as
 * separa: obrigatório é não ser vazio — o que `enviar_avaliacao` recusa com
 * `DS003` —, e o mínimo de caracteres é do **acréscimo**, que é opcional.
 * Confundi-las transformaria um bônus em barreira.
 */
async function abrirSubjetiva(page: Page): Promise<string> {
  const envioId = await abrirAvaliacao(page, FAIXA_DO_C4);
  await preencherObrigatorios(page);
  await avancar(page);
  await page.waitForURL(`**/curador/avaliar/${envioId}/subjetiva`);
  return envioId;
}

// Os testes deste arquivo compartilham um envio, e escrevem nele.
test.describe.configure({ mode: 'serial' });

test.describe('C4 · Nota subjetiva e feedback', () => {
  test(
    'o resumo das objetivas traz média geral e por grupo',
    { tag: ['@RF-061'] },
    async ({ page }) => {
      await abrirSubjetiva(page);

      await expect(page.getByRole('heading', { name: AVALIAR.resumoObjetivo })).toBeVisible();
      // Cinco obrigatórios com 4,0 — a média dos respondidos, e não dos onze.
      await expect(page.getByText('4,0', { exact: true }).first()).toBeVisible();
      await expect(page.getByText(AVALIAR.mediaDeCriterios(5))).toBeVisible();

      for (const grupo of Object.values(AVALIAR.grupos)) {
        await expect(page.getByRole('progressbar', { name: grupo }), grupo).toBeVisible();
      }
    },
  );

  test('a nota subjetiva é um slider de 0,0 a 5,0', { tag: ['@RF-062'] }, async ({ page }) => {
    await abrirSubjetiva(page);

    const slider = page.getByLabel(AVALIAR.notaSubjetivaCampo, { exact: true });
    await expect(slider).toHaveAttribute('min', '0');
    await expect(slider).toHaveAttribute('max', '5');
    await expect(slider).toHaveAttribute('step', '0.1');

    await slider.fill('4.2');
    await expect(slider).toHaveAttribute('aria-valuetext', '4,2');
  });

  test(
    'o contador do feedback muda ao passar do piso do acréscimo',
    { tag: ['@RF-063'] },
    async ({ page }) => {
      await abrirSubjetiva(page);

      const campo = page.getByLabel(AVALIAR.feedback);

      await campo.fill('curto');
      await expect(page.getByText(/A partir de \d+ caracteres o acréscimo entra/)).toBeVisible();

      await campo.fill('a'.repeat(150));
      await expect(page.getByText(AVALIAR.feedbackValido)).toBeVisible();
      await expect(page.getByText('150 / 150', { exact: true })).toBeVisible();
    },
  );

  test('o feedback é obrigatório para avançar', { tag: ['@RF-063'] }, async ({ page }) => {
    const envioId = await abrirSubjetiva(page);

    await page.getByLabel(AVALIAR.feedback).fill('');
    await avancar(page);

    // A validação nativa segura o envio: a URL não muda.
    await expect(page).toHaveURL(new RegExp(`/curador/avaliar/${envioId}/subjetiva$`));
    await expect(page.getByLabel(AVALIAR.feedback)).toHaveJSProperty('validity.valueMissing', true);
  });

  test('nota e feedback sobrevivem ao avanço e ao retorno', async ({ page }) => {
    const envioId = await abrirSubjetiva(page);

    await page.getByLabel(AVALIAR.notaSubjetivaCampo, { exact: true }).fill('2.7');
    await page.getByLabel(AVALIAR.feedback).fill('Devolutiva guardada pela suíte.');
    await avancar(page);

    await page.waitForURL(`**/curador/avaliar/${envioId}/compartilhamento`);
    await page.getByRole('link', { name: AVALIAR.voltar }).click();
    await page.waitForURL(`**/curador/avaliar/${envioId}/subjetiva`);

    await expect(page.getByLabel(AVALIAR.notaSubjetivaCampo, { exact: true })).toHaveAttribute(
      'aria-valuetext',
      '2,7',
    );
    await expect(page.getByLabel(AVALIAR.feedback)).toHaveValue('Devolutiva guardada pela suíte.');
  });
});
