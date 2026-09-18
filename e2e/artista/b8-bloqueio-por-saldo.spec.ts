import { join } from 'node:path';

import { expect, test } from '@playwright/test';

import { clienteDeServico } from '../apoio/banco';
import { PERSONA } from '../apoio/personas';
import { entrarComo } from '../apoio/sessao';
import { ENVIAR, SELECAO } from '../apoio/textos';

/**
 * B8 · Bloqueio por saldo insuficiente — módulo 5, RF-049
 *
 * **Não** é cenário numerado do [Guia de Testes da R2](../../docs/R2/guia-de-testes-r2.md):
 * o guia percorre o caminho feliz da compra e do envio, e o bloqueio aparece só
 * como requisito. A numeração segue a série do artista para não inventar uma
 * convenção nova.
 *
 * **Passos**
 * 1. Com uma conta sem saldo, monte um envio inteiro pelo wizard.
 * 2. Escolha um curador e tente confirmar.
 *
 * **Resultado esperado**
 * - A confirmação é barrada com "Saldo insuficiente para esta seleção."
 * - Há caminho para comprar Claves.
 * - **Nenhum envio nasce** — o bloqueio não é só visual.
 *
 * ## Por que uma persona própria
 *
 * `e2e_artista` tem saldo porque B1, B2 e B3 dependem disso. Zerá-lo para
 * encenar o bloqueio quebraria os três, e recarregá-lo depois deixaria a suíte
 * dependente da ordem de execução — o oposto de `fullyParallel`.
 * `ARTISTA_SEM_SALDO` nasce sem lançamento nenhum no seed, e o serviço
 * `feedback` custa 2 Claves: a conta nunca cobre a seleção, sem ninguém
 * precisar zerar nada.
 *
 * ## A segunda metade, que a tela não mostra
 *
 * Que a mensagem apareça é metade do requisito. A outra é que
 * `confirmar_selecao_curadores` **aborte** — o `DS010` acontece dentro da
 * transação que criaria os `envio`, e um bloqueio que avisasse na tela mas
 * deixasse a faixa em curadoria seria pior que nenhum. Por isso a asserção de
 * banco no fim, que é também metade da prova de atomicidade daquela RPC.
 */

const MP3 = join(process.cwd(), 'e2e', 'apoio', 'arquivos', 'e2e-faixa.mp3');

test.describe('B8 · Bloqueio por saldo insuficiente', { tag: ['@RF-049'] }, () => {
  test('sem saldo, confirmar a seleção é barrado e nenhum envio nasce', async ({ page }, info) => {
    const titulo = `e2e_Faixa B8 ${info.workerIndex}-${Date.now().toString(36)}`;

    await entrarComo(page, PERSONA.ARTISTA_SEM_SALDO);
    await page.goto('/artista/enviar');
    await page.getByLabel(/arraste o arquivo|arquivo escolhido/i).setInputFiles(MP3);
    await page.getByRole('textbox', { name: new RegExp(ENVIAR.rotuloTitulo) }).fill(titulo);
    await page.getByRole('button', { name: ENVIAR.continuar }).click();
    await page.waitForURL(/\/contexto$/);

    await page.getByText('Indie', { exact: true }).click();
    await page
      .getByRole('textbox', { name: new RegExp(ENVIAR.rotuloContexto) })
      .fill('Faixa da suíte automatizada: cenário de saldo insuficiente.');
    await page.getByRole('button', { name: ENVIAR.continuar }).click();
    await page.waitForURL(/\/revisao$/);

    // O aviso da revisão é o que torna o bloqueio justo: até aqui nada foi
    // cobrado, e é na confirmação da seleção que as Claves sairiam.
    await page.getByRole('link', { name: ENVIAR.enviarParaCuradoria }).click();
    await page.waitForURL(/\/curadores$/);

    const primeiro = page.getByRole('checkbox').first();
    await expect(
      primeiro,
      'a seleção precisa listar ao menos um curador aprovado — rode supabase/testes/dados-e2e.sql',
    ).toBeAttached();
    await primeiro.check({ force: true });

    await page.getByRole('button', { name: SELECAO.confirmar }).click();

    await expect(page.getByText(SELECAO.erroSaldo)).toBeVisible();
    // Dentro do conteúdo: o card de saldo no pé da sidebar tem um
    // "Comprar Claves" com o mesmo nome acessível, e o que este cenário afirma
    // é o CTA **do bloqueio** — o que diz para onde ir quando a compra falha.
    await expect(
      page.locator('#conteudo-principal').getByRole('link', { name: SELECAO.erroSaldoAcao }),
    ).toBeVisible();

    // Continua na seleção: um bloqueio que avançasse de tela teria cobrado.
    await expect(page).toHaveURL(/\/curadores$/);

    const { data: envios } = await clienteDeServico()
      .from('envio')
      .select('id, faixa!inner(titulo)')
      .eq('faixa.titulo', titulo);

    expect(
      envios ?? [],
      'saldo insuficiente não pode deixar envio para trás — a RPC tem de abortar inteira',
    ).toHaveLength(0);
  });

  test('o caminho de compra leva aos pacotes', async ({ page }, info) => {
    const titulo = `e2e_Faixa B8 CTA ${info.workerIndex}-${Date.now().toString(36)}`;

    await entrarComo(page, PERSONA.ARTISTA_SEM_SALDO);
    await page.goto('/artista/enviar');
    await page.getByLabel(/arraste o arquivo|arquivo escolhido/i).setInputFiles(MP3);
    await page.getByRole('textbox', { name: new RegExp(ENVIAR.rotuloTitulo) }).fill(titulo);
    await page.getByRole('button', { name: ENVIAR.continuar }).click();
    await page.waitForURL(/\/contexto$/);

    await page.getByText('Indie', { exact: true }).click();
    await page
      .getByRole('textbox', { name: new RegExp(ENVIAR.rotuloContexto) })
      .fill('Faixa da suíte automatizada: CTA do bloqueio por saldo.');
    await page.getByRole('button', { name: ENVIAR.continuar }).click();
    await page.waitForURL(/\/revisao$/);

    await page.getByRole('link', { name: ENVIAR.enviarParaCuradoria }).click();
    await page.waitForURL(/\/curadores$/);

    await page.getByRole('checkbox').first().check({ force: true });
    await page.getByRole('button', { name: SELECAO.confirmar }).click();

    await page.getByRole('link', { name: SELECAO.erroSaldoAcao }).click();
    await page.waitForURL(/\/artista\/pacotes/);
  });
});
