import { expect, test } from '@playwright/test';

import {
  abrirPelaFila,
  avancar,
  CRITERIOS_OBRIGATORIOS,
  preencherObrigatorios,
} from '../apoio/avaliacao';
import { PERSONA } from '../apoio/personas';
import { entrarComo } from '../apoio/sessao';
import { AVALIAR, FILA } from '../apoio/textos';

/**
 * C7 · Salvar e sair — módulo 14, RF-068
 *
 * **Não** é cenário numerado do [Guia de Testes da R2](../../docs/R2/guia-de-testes-r2.md):
 * o guia cobre o wizard de ponta a ponta, e "Salvar e sair" aparece nele como
 * botão presente em todas as etapas, sem cenário próprio. O requisito, porém, é
 * explícito — *"o rascunho é preservado e retomo no mesmo passo"* — e ficava
 * sem prova nenhuma, embora o botão exista desde a implementação do módulo.
 *
 * **Passos**
 * 1. Comece a avaliação e preencha parte das notas.
 * 2. Acione "Salvar e sair".
 * 3. Volte pela fila.
 * 4. Repita saindo de uma etapa adiante.
 *
 * **Resultado esperado**
 * - Sair leva de volta à fila.
 * - A retomada reabre **no mesmo passo**, com o que foi escrito.
 * - Sair da subjetiva retoma na subjetiva, e não na etapa seguinte.
 *
 * ## O que este cenário exige do ambiente
 *
 * A faixa `e2e_Faixa do C7` e o curador `e2e_curador_sla`, ambos de
 * `dados-e2e.sql`. A faixa é dedicada porque estes testes deixam `passo_atual`
 * em lugares diferentes a cada um: compartilhada com C3–C6, a retomada de um
 * cenário abriria na etapa que outro deixou.
 *
 * ## Por que o `passo_atual` é o ponto
 *
 * `avancar()` em `src/modulos/avaliacao/acoes.ts` grava o passo em que a pessoa
 * **vai estar** — o atual quando saiu, o seguinte quando avançou. É uma linha
 * só, e é ela que sustenta a retomada inteira. Um teste que só conferisse "o
 * botão leva à fila" deixaria essa linha descoberta.
 */

// Os três testes encadeiam o mesmo rascunho: o segundo afirma sobre o que o
// primeiro escreveu, e o terceiro move o `passo_atual` de novo. Em paralelo,
// cada um veria o passo que o outro acabou de gravar.
test.describe.configure({ mode: 'serial' });

const FAIXA_DO_C7 = 'e2e_Faixa do C7';

const NOTA = '3.5';

test.describe('C7 · Salvar e sair', { tag: ['@RF-068'] }, () => {
  test('salvar e sair no meio das notas volta para a fila', async ({ page }) => {
    await entrarComo(page, PERSONA.CURADOR_SLA);
    await abrirPelaFila(page, FAIXA_DO_C7);

    // Parte das notas, e não todas: o ponto do requisito é poder interromper
    // antes de terminar. `formNoValidate` no botão é o que permite isso, e é
    // justamente o que se quer exercitar.
    await page
      .getByLabel(`${CRITERIOS_OBRIGATORIOS[0]} · ${AVALIAR.criterioObrigatorio}`, { exact: true })
      .fill(NOTA);

    await page.getByRole('button', { name: AVALIAR.salvarESair }).click();

    await expect(page).toHaveURL(/\/curador\/fila$/);
  });

  test('a retomada reabre no mesmo passo, com o que foi escrito', async ({ page }) => {
    await entrarComo(page, PERSONA.CURADOR_SLA);
    const envioId = await abrirPelaFila(page, FAIXA_DO_C7);

    // `abrirPelaFila` normaliza indo para `/notas`, então a URL não prova nada
    // aqui — o que prova é o valor ter sobrevivido à saída.
    await expect(page).toHaveURL(new RegExp(`/curador/avaliar/${envioId}/notas$`));
    await expect(
      page.getByLabel(`${CRITERIOS_OBRIGATORIOS[0]} · ${AVALIAR.criterioObrigatorio}`, {
        exact: true,
      }),
      'a nota escrita antes de "Salvar e sair" precisa voltar preenchida',
    ).toHaveValue(NOTA);
  });

  /**
   * A regra que o comentário de `avancar()` descreve, exercida de fora.
   *
   * Sair da subjetiva tem de retomar **na subjetiva**. Se `passo_atual`
   * guardasse o passo seguinte, a retomada pularia a etapa que a pessoa
   * interrompeu — e ela voltaria para o compartilhamento sem ter escrito o
   * feedback.
   */
  test('salvar e sair na subjetiva retoma na subjetiva', async ({ page }) => {
    await entrarComo(page, PERSONA.CURADOR_SLA);
    const envioId = await abrirPelaFila(page, FAIXA_DO_C7);

    await preencherObrigatorios(page);
    await avancar(page);
    await page.waitForURL(`**/curador/avaliar/${envioId}/subjetiva`);

    await page.getByLabel(AVALIAR.feedback).fill('Rascunho interrompido pela suíte. '.repeat(6));
    await page.getByRole('button', { name: AVALIAR.salvarESair }).click();
    await expect(page).toHaveURL(/\/curador\/fila$/);

    // Sem normalizar para `/notas` como faz `abrirPelaFila`: é justamente a
    // etapa de retomada que está sob teste. O botão continua sendo "Iniciar
    // avaliação" — a mesma porta serve para começar e para retomar, que é o
    // que o comentário de `iniciarAvaliacao` em `fila/repositorio.ts` explica.
    await page.goto('/curador/fila');
    const linha = page.getByRole('row').filter({ hasText: FAIXA_DO_C7 });
    await linha.getByRole('link').first().click();
    await page.getByRole('button', { name: FILA.iniciarAvaliacao }).click();

    await expect(page).toHaveURL(new RegExp(`/curador/avaliar/${envioId}/subjetiva$`));
  });
});
