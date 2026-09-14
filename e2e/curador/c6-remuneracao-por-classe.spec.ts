import { expect, test } from '@playwright/test';

import {
  abrirAvaliacao,
  FAIXA_DO_C6,
  FAIXA_PARA_CONCLUIR,
  irAteARemuneracao,
} from '../apoio/avaliacao';
import { AVALIAR } from '../apoio/textos';

/**
 * C6 · Remuneração por classe — módulo 14.4
 *
 * Cenário do [Guia de Testes da R2](../../docs/R2/guia-de-testes-r2.md), que é
 * o gate da release.
 *
 * **Passos**
 * 1. Veja a remuneração por classe e conclua a avaliação.
 *
 * **Resultado esperado**
 * - A escala por classe (Bronze/Prata/Ouro) aparece com os acréscimos.
 * - Concluir libera o crédito.
 *
 * ## Onde cada metade é provada
 *
 * A **tela** é provada aqui: a composição do valor, os quatro acréscimos com
 * seu estado, o piso da classe e o teto.
 *
 * A **transação** — grava o ganho com o percentual certo, fecha o envio e
 * notifica os dois lados — é provada por
 * `supabase/testes/0009_remuneracao.testes.sql`, que chama `enviar_avaliacao`
 * direto e afere `ganho_curador`. É onde ela pode ser aferida sem depender do
 * navegador, e onde o `check` do rateio também é exercitado.
 *
 * O que sobra para o navegador é o **fio**: botão → ação → RPC → estado
 * concluído. É o último teste deste arquivo, e ele **consome** um envio — por
 * isso usa uma faixa própria, que `dados-e2e.sql` repõe.
 *
 * ## Uma pendência que esta tela torna visível
 *
 * Um Bronze no prazo sem nenhum opcional recebe o **piso** da classe, 30%, e
 * não os 38% que o RF-066 afirma — 38% é o teto na avaliação
 * ([#5](../../docs/open-questions.md)). O teste afirma sobre o que está
 * implementado, que é o protótipo; a confirmação do cliente segue pendente.
 */
// Os três primeiros compartilham um envio; o último consome o seu.
test.describe.configure({ mode: 'serial' });

test.describe('C6 · Remuneração por classe', () => {
  test('a composição do valor aparece: piso, acréscimos e teto', async ({ page }) => {
    const envioId = await abrirAvaliacao(page, FAIXA_DO_C6);
    await irAteARemuneracao(page, envioId);

    await expect(page.getByRole('heading', { name: AVALIAR.tituloRemuneracao })).toBeVisible();

    // A classe do curador, pelo selo — a persona é Bronze.
    await expect(page.getByText(AVALIAR.suaClasse, { exact: true })).toBeVisible();
    await expect(page.getByText(AVALIAR.classes.bronze, { exact: true })).toBeVisible();

    // O piso, com a legenda de dentro do prazo.
    await expect(page.getByText(AVALIAR.pisoNoPrazo)).toBeVisible();
    await expect(page.getByText(/^\d+%$/).first()).toBeVisible();

    // Os quatro acréscimos do catálogo.
    await expect(page.getByText(AVALIAR.acrescimos.onze_criterios(11))).toBeVisible();
    await expect(page.getByText(/Justificativa de \d+ caracteres/)).toBeVisible();
    await expect(page.getByText(/Feedback com \d+ caracteres/)).toBeVisible();
    await expect(page.getByText(AVALIAR.acrescimos.compartilhou)).toBeVisible();

    // O teto da classe, com os dois números de `configuracao.remuneracao.*`.
    await expect(
      page.getByText(/Teto da classe Bronze: \d+% na avaliação e \d+% com/),
    ).toBeVisible();
  });

  test('distingue acréscimo cumprido de não cumprido', async ({ page }) => {
    const envioId = await abrirAvaliacao(page, FAIXA_DO_C6);
    await irAteARemuneracao(page, envioId);

    // Cinco dos onze respondidos: "onze critérios" não entra.
    await expect(page.getByText(AVALIAR.detalheCriterios(5, 11))).toBeVisible();
    // Nenhuma justificativa escrita.
    await expect(page.getByText(AVALIAR.detalheJustificativas(0))).toBeVisible();
    // Recusou compartilhar.
    await expect(page.getByText(AVALIAR.detalheSemCompartilhamento)).toBeVisible();

    // O feedback passou de 150, então esse acréscimo entrou — e ao menos um
    // "+N%" precisa aparecer, senão o teste não distinguiria "não cumprido" de
    // "não calculado".
    await expect(page.getByText(/^\+\d+%$/).first()).toBeVisible();
  });

  test('"Você recebe" traz o valor e a base paga pelo artista', async ({ page }) => {
    const envioId = await abrirAvaliacao(page, FAIXA_DO_C6);
    await irAteARemuneracao(page, envioId);

    await expect(page.getByRole('heading', { name: AVALIAR.voceRecebe })).toBeVisible();
    await expect(page.getByText(/^R\$\s?[\d.,]+$/).first()).toBeVisible();
    await expect(page.getByText(/\d+% de R\$\s?[\d.,]+ pagos pelo artista/)).toBeVisible();

    await expect(page.getByRole('button', { name: AVALIAR.concluir })).toBeVisible();
  });

  /**
   * Consome a faixa reservada: concluída, ela sai da fila para sempre —
   * `ganho_curador` não é reescrito nem apagado, e o envio vira `pronto`.
   * `dados-e2e.sql` cria outra sempre que não houver nenhuma pendente.
   */
  test('concluir libera o crédito e fecha a avaliação', async ({ page }) => {
    const envioId = await abrirAvaliacao(page, FAIXA_PARA_CONCLUIR);
    await irAteARemuneracao(page, envioId);

    await page.getByRole('button', { name: AVALIAR.concluir }).click();

    await expect(page.getByText(AVALIAR.concluidaTitulo)).toBeVisible();
    await expect(page.getByText(/Devolutiva enviada\. Crédito de R\$/)).toBeVisible();

    // O botão some: concluída não se reescreve (`avaliacao_concluida_e_final`).
    await expect(page.getByRole('button', { name: AVALIAR.concluir })).toHaveCount(0);

    // E a faixa deixa a fila — o envio virou `pronto`.
    await page.getByRole('link', { name: AVALIAR.voltarParaFila }).click();
    await page.waitForURL('**/curador/fila');
    await expect(page.getByRole('row').filter({ hasText: FAIXA_PARA_CONCLUIR })).toHaveCount(0);
  });
});
