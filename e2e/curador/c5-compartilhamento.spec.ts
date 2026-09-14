import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import {
  abrirAvaliacao,
  avancar,
  escolherModalidade,
  FAIXA_DO_C5,
  preencherObrigatorios,
} from '../apoio/avaliacao';
import { AVALIAR } from '../apoio/textos';

/**
 * C5 · Compartilhamento — módulos 14.2 e 14.3
 *
 * Cenário do [Guia de Testes da R2](../../docs/R2/guia-de-testes-r2.md), que é
 * o gate da release.
 *
 * **Passos**
 * 1. Escolha compartilhar (playlist/post/matéria) ou não.
 *
 * **Resultado esperado**
 * - Não é obrigatório; compartilhar dá acréscimo.
 * - O crédito libera ao confirmar (compartilhar ou não).
 *
 * ## Uma divergência deliberada com o protótipo
 *
 * O protótipo deixa marcar **várias** modalidades. O banco guarda uma por
 * avaliação (`compartilhamento.avaliacao_id` é `unique`) e o acréscimo é o
 * mesmo em qualquer caso, então a multiescolha prometeria gravar algo que não
 * seria gravado. Aqui a escolha é exclusiva, e é isto que o teste fixa.
 *
 * ⚠️ O `<input type="radio">` fica sob a pintura, como em `Chips`: `check()` é
 * interceptado pelo `<label>`. Por isso `escolherModalidade` clica no texto.
 */
async function abrirCompartilhamento(page: Page): Promise<string> {
  const envioId = await abrirAvaliacao(page, FAIXA_DO_C5);
  await preencherObrigatorios(page);
  await avancar(page);

  await page.waitForURL(`**/curador/avaliar/${envioId}/subjetiva`);
  await page.getByLabel(AVALIAR.feedback).fill('Devolutiva da suíte automatizada.');
  await avancar(page);

  await page.waitForURL(`**/curador/avaliar/${envioId}/compartilhamento`);
  return envioId;
}

// Os testes deste arquivo compartilham um envio, e escrevem nele.
test.describe.configure({ mode: 'serial' });

test.describe('C5 · Compartilhamento', () => {
  test('as quatro modalidades e a recusa aparecem', async ({ page }) => {
    await abrirCompartilhamento(page);

    for (const modalidade of Object.values(AVALIAR.modalidades)) {
      await expect(
        page.getByText(modalidade.rotulo, { exact: true }),
        modalidade.rotulo,
      ).toBeVisible();
    }

    await expect(page.getByText(AVALIAR.compartilhamentoNota)).toBeVisible();
  });

  test('a escolha é exclusiva', async ({ page }) => {
    await abrirCompartilhamento(page);

    await escolherModalidade(page, AVALIAR.modalidades.playlist.rotulo);
    await expect(page.getByRole('radio', { name: /Playlist/ })).toBeChecked();

    await escolherModalidade(page, AVALIAR.modalidades.post.rotulo);
    await expect(page.getByRole('radio', { name: /Post no Instagram/ })).toBeChecked();
    await expect(page.getByRole('radio', { name: /Playlist/ })).not.toBeChecked();
  });

  /**
   * "Não vou compartilhar desta vez" é escolha válida, não omissão: o crédito
   * libera nos dois caminhos, e o registro precisa ser auditável. O avanço
   * pula 14.3 e vai direto à remuneração.
   */
  test('recusar leva à remuneração, pulando 14.3', async ({ page }) => {
    const envioId = await abrirCompartilhamento(page);

    await escolherModalidade(page, AVALIAR.modalidades.nao_compartilhou.rotulo);
    await avancar(page);

    await expect(page).toHaveURL(new RegExp(`/curador/avaliar/${envioId}/remuneracao$`));
    await expect(page.getByText(AVALIAR.compartilhamentoRecusado)).toBeVisible();
  });

  test('"Outros" abre a etapa 14.3, que exige dizer onde', async ({ page }) => {
    const envioId = await abrirCompartilhamento(page);

    await escolherModalidade(page, AVALIAR.modalidades.outros.rotulo);
    await avancar(page);

    await expect(page).toHaveURL(new RegExp(`/curador/avaliar/${envioId}/outras$`));
    await expect(page.getByText(AVALIAR.outrasNota)).toBeVisible();

    // O `check` `compartilhamento_outros_exige_descricao` é a regra; o
    // `required` aqui é o aviso que chega antes dela.
    await avancar(page);
    await expect(page).toHaveURL(new RegExp(`/curador/avaliar/${envioId}/outras$`));
    await expect(page.getByLabel(AVALIAR.outrasRotulo)).toHaveJSProperty(
      'validity.valueMissing',
      true,
    );
  });

  test('uma sugestão preenche o campo, e a descrição chega ao resumo', async ({ page }) => {
    const envioId = await abrirCompartilhamento(page);

    await escolherModalidade(page, AVALIAR.modalidades.outros.rotulo);
    await avancar(page);
    await page.waitForURL(`**/curador/avaliar/${envioId}/outras`);

    await page.getByRole('button', { name: AVALIAR.outrasSugestoes[2] }).click();
    await expect(page.getByLabel(AVALIAR.outrasRotulo)).toHaveValue(AVALIAR.outrasSugestoes[2]);

    await avancar(page);
    await expect(page).toHaveURL(new RegExp(`/curador/avaliar/${envioId}/remuneracao$`));
    await expect(page.getByText(AVALIAR.outrasSugestoes[2], { exact: true })).toBeVisible();
  });

  /**
   * Voltar de 14.4 tem de cair em 14.3 quando a modalidade é `outros`, e em
   * 14.2 quando não é — é o espelho do salto que o avanço faz. Sem isso,
   * voltar cairia numa tela que o avanço tinha pulado.
   */
  test('voltar de 14.4 respeita o salto de 14.3', async ({ page }) => {
    const envioId = await abrirCompartilhamento(page);

    await escolherModalidade(page, AVALIAR.modalidades.nao_compartilhou.rotulo);
    await avancar(page);
    await page.waitForURL(`**/curador/avaliar/${envioId}/remuneracao`);

    await page.getByRole('link', { name: AVALIAR.voltar }).click();
    await expect(page).toHaveURL(new RegExp(`/curador/avaliar/${envioId}/compartilhamento$`));
  });
});
