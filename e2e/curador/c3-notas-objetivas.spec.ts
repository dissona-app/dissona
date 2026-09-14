import { expect, test } from '@playwright/test';

import {
  abrirAvaliacao,
  avancar,
  CRITERIOS_OBRIGATORIOS,
  FAIXA_DO_C3,
  preencherObrigatorios,
} from '../apoio/avaliacao';
import { AVALIAR } from '../apoio/textos';

/**
 * C3 · Notas objetivas — módulo 14
 *
 * Cenário do [Guia de Testes da R2](../../docs/R2/guia-de-testes-r2.md), que é
 * o gate da release.
 *
 * **Passos**
 * 1. Ouça a faixa no player.
 * 1. Dê as notas por critério (até 11 itens, com casa decimal).
 * 1. Escreva as justificativas.
 *
 * **Resultado esperado**
 * - O player mede a escuta.
 * - As notas aceitam casas decimais.
 * - Justificar rende acréscimo na remuneração.
 *
 * O guia dizia "até 11 itens" com o 11º sem nome e os obrigatórios indefinidos
 * ([#2](../../docs/open-questions.md) e [#3](../../docs/open-questions.md)). As
 * duas pendências foram resolvidas pelo seed da `0008`, que tem precedência do
 * protótipo: onze critérios em cinco grupos, cinco deles obrigatórios. Este
 * teste afirma sobre os nomes de fato semeados.
 *
 * A escuta **não** é exercida aqui pelo player: o áudio da faixa semeada não
 * existe no Storage, e o Playwright não reproduz mídia de verdade. Quem prova o
 * gate de 60% é `supabase/testes/0009_remuneracao.testes.sql`, que chama
 * `enviar_avaliacao` com escuta insuficiente e espera `DS001` — a fronteira
 * real. O que se afirma aqui é que a tela **diz** qual é o mínimo.
 */
// Os testes deste arquivo compartilham um envio, e dois deles escrevem nele.
test.describe.configure({ mode: 'serial' });

test.describe('C3 · Notas objetivas', () => {
  test('os onze critérios aparecem, agrupados', async ({ page }) => {
    await abrirAvaliacao(page, FAIXA_DO_C3);

    for (const grupo of Object.values(AVALIAR.grupos)) {
      await expect(page.getByRole('group', { name: grupo }), grupo).toBeVisible();
    }

    // Onze sliders de nota, um por critério.
    await expect(page.getByRole('slider')).toHaveCount(11);
  });

  test('os cinco obrigatórios são marcados como tal', async ({ page }) => {
    await abrirAvaliacao(page, FAIXA_DO_C3);

    for (const criterio of CRITERIOS_OBRIGATORIOS) {
      await expect(
        page.getByLabel(`${criterio} · ${AVALIAR.criterioObrigatorio}`, { exact: true }),
        criterio,
      ).toBeVisible();
    }
  });

  /**
   * O resumo é contado **a cada mudança**, e a asserção é sobre o delta.
   *
   * Fixar "1 de 11" exigiria um rascunho vazio, e o rascunho sobrevive entre
   * execuções — o último teste deste arquivo grava cinco notas. O que importa
   * não é o número de partida; é que dar uma nota incrementa a conta.
   */
  test('a nota aceita casa decimal e o resumo reconta', async ({ page }) => {
    await abrirAvaliacao(page, FAIXA_DO_C3);

    const resumo = page.getByText(/\d+ de 11 respondidos/);
    const antes = Number(/(\d+) de 11/.exec((await resumo.innerText()) ?? '')?.[1] ?? '0');

    // "Letra" é opcional, e nenhum outro teste a preenche.
    const letra = page.getByLabel('Letra', { exact: true });
    await letra.fill('4.3');

    // O valor anunciado é o número, e não a porcentagem que o navegador leria.
    await expect(letra).toHaveAttribute('aria-valuetext', '4,3');
    await expect(page.getByText('4,3', { exact: true })).toBeVisible();
    await expect(resumo).toContainText(`${antes + 1} de 11 respondidos`);
  });

  test('a justificativa conta os caracteres até o piso do acréscimo', async ({ page }) => {
    await abrirAvaliacao(page, FAIXA_DO_C3);

    const campo = page.getByLabel(AVALIAR.justificativaDe('Afinação'), { exact: true });
    await campo.fill('a'.repeat(250));

    await expect(page.getByText(AVALIAR.justificativaValida).first()).toBeVisible();
    await expect(page.getByText('250 / 250', { exact: true })).toBeVisible();
  });

  test('a tela diz qual é a escuta mínima exigida', async ({ page }) => {
    await abrirAvaliacao(page, FAIXA_DO_C3);

    // O número vem de `configuracao.escuta_minima_percentual`, nunca embutido.
    await expect(page.getByText(/A escuta é medida\..*da faixa ouvidos\./)).toBeVisible();
  });

  test('as notas sobrevivem ao avanço e ao retorno', async ({ page }) => {
    const envioId = await abrirAvaliacao(page, FAIXA_DO_C3);

    await preencherObrigatorios(page, '3.5');
    await avancar(page);
    await page.waitForURL(`**/curador/avaliar/${envioId}/subjetiva`);

    await page.getByRole('link', { name: AVALIAR.voltar }).click();
    await page.waitForURL(`**/curador/avaliar/${envioId}/notas`);

    await expect(
      page.getByLabel(`Melodia · ${AVALIAR.criterioObrigatorio}`, { exact: true }),
    ).toHaveAttribute('aria-valuetext', '3,5');
  });
});
