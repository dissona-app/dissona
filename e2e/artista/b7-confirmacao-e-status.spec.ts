import { join } from 'node:path';

import { expect, test } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';

import { PERSONA } from '../apoio/personas';
import { entrarComo } from '../apoio/sessao';
import { ENVIAR, SELECAO, STATUS_DO_ENVIO } from '../apoio/textos';

/**
 * B7 · Confirmação e status — módulo 3 · 3.3
 *
 * Cenário do [Guia de Testes da R2](../../docs/R2/guia-de-testes-r2.md), que é
 * o gate da release.
 *
 * **Passos**
 * 1. Veja a tela de confirmação.
 * 1. Clique em Acompanhar status.
 *
 * **Resultado esperado**
 * - Confirmação "Seu envio chegou".
 * - O Status mostra o progresso por curador (Recebeu → Ouviu → Avaliando → Pronto).
 *
 * ⚠️ O protótipo escreve **"Sua submissão chegou"**, e o guia manda corrigir:
 * a terminologia decidida é "Envios", nunca "Submissões" (PRD §9). É a única
 * divergência em que o protótipo não vence, e este teste a fixa.
 *
 * Este é o cenário que fecha o ciclo: ele passa pela seleção, que é onde as
 * Claves de fato saem da carteira.
 */

const MP3 = join(process.cwd(), 'e2e', 'apoio', 'arquivos', 'e2e-faixa.mp3');

/** Wizard inteiro até a revisão. */
async function ateARevisao(page: Page, info: TestInfo): Promise<string> {
  const titulo = `e2e_Faixa B7 ${info.workerIndex}-${Date.now().toString(36)}`;

  await entrarComo(page, PERSONA.ARTISTA);
  await page.goto('/artista/enviar');
  await page.getByLabel(/arraste o arquivo|arquivo escolhido/i).setInputFiles(MP3);
  await page.getByRole('textbox', { name: new RegExp(ENVIAR.rotuloTitulo) }).fill(titulo);
  await page.getByRole('button', { name: ENVIAR.continuar }).click();
  await page.waitForURL(/\/contexto$/);

  await page.getByText('Indie', { exact: true }).click();
  await page
    .getByRole('textbox', { name: new RegExp(ENVIAR.rotuloContexto) })
    .fill('Faixa da suíte automatizada.');
  await page.getByRole('button', { name: ENVIAR.continuar }).click();
  await page.waitForURL(/\/revisao$/);

  return titulo;
}

test.describe('B7 · Confirmação e status', () => {
  test(
    'confirmar a seleção leva à confirmação e ao status',
    { tag: ['@RF-040', '@RF-041'] },
    async ({ page }, info) => {
      const titulo = await ateARevisao(page, info);

      await page.getByRole('link', { name: ENVIAR.enviarParaCuradoria }).click();
      await page.waitForURL(/\/curadores$/);

      // O placeholder lista curadores **reais**: a RPC recusa quem não está
      // aprovado (DS011) ou não tem `feedback` ativo (DS012).
      // A caixa é visualmente escondida (`clip-path`) e quem recebe o clique é o
      // rótulo — é assim que o Design System monta checkbox acessível, e é o que
      // uma pessoa de fato clica.
      const primeiro = page.getByRole('checkbox').first();
      await expect(primeiro).toBeAttached();
      await primeiro.check({ force: true });

      await page.getByRole('button', { name: SELECAO.confirmar }).click();
      await page.waitForURL(/\/confirmacao$/);

      // "Seu envio", nunca "Sua submissão".
      await expect(page.getByText(ENVIAR.confirmacaoTitulo)).toBeVisible();
      await expect(page.getByText(/submiss/i)).toHaveCount(0);
      await expect(page.getByText(titulo)).toBeVisible();

      await page.getByRole('link', { name: ENVIAR.acompanharStatus }).click();
      await page.waitForURL(/\/status$/);

      const tabela = page.getByRole('table', { name: STATUS_DO_ENVIO.titulo });
      for (const coluna of Object.values(STATUS_DO_ENVIO.colunas)) {
        await expect(
          tabela.getByRole('columnheader', { name: coluna, exact: true }),
          `coluna "${coluna}"`,
        ).toBeVisible();
      }

      // Um envio recém-criado nasce em `recebeu` — a primeira das quatro etapas.
      await expect(tabela.getByText(STATUS_DO_ENVIO.etapas.recebeu).first()).toBeVisible();
      await expect(page.getByText(STATUS_DO_ENVIO.nota)).toBeVisible();
    },
  );

  test('a seleção exige ao menos um curador', async ({ page }, info) => {
    await ateARevisao(page, info);

    await page.getByRole('link', { name: ENVIAR.enviarParaCuradoria }).click();
    await page.waitForURL(/\/curadores$/);

    // Sem ninguém marcado o botão nem fica disponível — a RPC recusaria com
    // DS011, e deixar clicar para ver o erro seria pior.
    await expect(page.getByRole('button', { name: SELECAO.confirmar })).toBeDisabled();
  });
});
