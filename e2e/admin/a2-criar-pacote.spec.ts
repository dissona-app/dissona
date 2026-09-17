import { expect, test } from '@playwright/test';

import { auditoriaDe, pacotePorNome, perfilPorEmail } from '../apoio/banco';
import { nomeUnico, PERSONA } from '../apoio/personas';
import { abrirPacotes } from '../apoio/sessao';
import { ADMIN_PACOTE_FORMULARIO, ADMIN_PACOTES } from '../apoio/textos';

/**
 * A2 · Criar pacote — módulo 21.1
 *
 * Cenário do [Guia de Testes da R2](../../docs/R2/guia-de-testes-r2.md), que é
 * o gate da release.
 *
 * **Passos**
 * 1. Clique em Novo pacote.
 * 1. Preencha nome, qtd, valor e desconto.
 * 1. Salve.
 *
 * **Resultado esperado**
 * - O preço por Clave é calculado.
 * - Validações barram valores/percentuais inválidos.
 * - O pacote entra na lista.
 *
 * O nome do pacote é único por worker e por execução (`nomeUnico`). A suíte
 * roda `fullyParallel` contra um projeto Supabase **compartilhado**
 * (open-questions #25): sem isso, dois workers criariam o mesmo pacote e cada
 * um veria o do outro na lista — falha intermitente que se atribui a
 * "flakiness" e se esconde com retry.
 */
test.describe('A2 · Criar pacote', { tag: ['@RF-051'] }, () => {
  test('o preço por Clave e o desconto são calculados enquanto se digita', async ({
    page,
  }, info) => {
    await abrirPacotes(page);
    await page.getByRole('link', { name: ADMIN_PACOTES.novo }).click();

    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      ADMIN_PACOTE_FORMULARIO.tituloNovo,
    );

    await page
      .getByLabel(ADMIN_PACOTE_FORMULARIO.rotuloNome)
      .fill(nomeUnico('A2', info.workerIndex));
    await page.getByLabel(ADMIN_PACOTE_FORMULARIO.rotuloQuantidade).fill('30');

    // Digitar o desconto recalcula o valor — "Recalcula o valor", diz a copy
    // auxiliar do campo. Base de 30 Claves a R$ 10 é R$ 300; 5% dá R$ 285.
    await page.getByLabel(ADMIN_PACOTE_FORMULARIO.rotuloDesconto).fill('5');
    await expect(page.getByLabel(ADMIN_PACOTE_FORMULARIO.rotuloValor)).toHaveValue('285,00');

    // E o caminho inverso: digitar o valor recalcula o desconto.
    await page.getByLabel(ADMIN_PACOTE_FORMULARIO.rotuloValor).fill('270,00');
    await expect(page.getByLabel(ADMIN_PACOTE_FORMULARIO.rotuloDesconto)).toHaveValue('10');

    // Os três derivados. R$ 270 ÷ 30 = R$ 9,00 por Clave; economia de R$ 30.
    const porClave = page.getByText(ADMIN_PACOTE_FORMULARIO.resumoPorClave).locator('..');
    await expect(porClave).toContainText('9,00');

    const economia = page.getByText(ADMIN_PACOTE_FORMULARIO.resumoEconomia).locator('..');
    await expect(economia).toContainText('30,00');
  });

  test('o pacote salvo entra na lista', async ({ page }, info) => {
    const nome = nomeUnico('A2 novo', info.workerIndex);

    await abrirPacotes(page);
    await page.getByRole('link', { name: ADMIN_PACOTES.novo }).click();

    await page.getByLabel(ADMIN_PACOTE_FORMULARIO.rotuloNome).fill(nome);
    await page.getByLabel(ADMIN_PACOTE_FORMULARIO.rotuloQuantidade).fill('45');
    await page.getByLabel(ADMIN_PACOTE_FORMULARIO.rotuloDesconto).fill('12,5');
    await page.getByRole('button', { name: ADMIN_PACOTE_FORMULARIO.salvar }).click();

    await expect(page).toHaveURL(/\/admin\/pacotes/);
    // A confirmação do protótipo, no pé da tabela.
    await expect(page.getByText(ADMIN_PACOTE_FORMULARIO.flashCriado)).toBeVisible();

    const linha = page.getByRole('row').filter({ hasText: nome });
    await expect(linha).toBeVisible();
    // Nasce ativo — é o padrão do formulário, e a copy da alternância promete
    // que "Ativo aparece na Carteira do artista na hora em que você salva".
    await expect(linha).toContainText(ADMIN_PACOTES.statusAtivo);
    await expect(linha).toContainText(ADMIN_PACOTES.subNaCarteira);
    // 12,5% de desconto sobrevive com a casa decimal: 45 × R$ 10 = R$ 450,
    // menos 12,5% = R$ 393,75, ou R$ 8,75 por Clave. Se a tela arredondasse o
    // desconto para inteiro, este número não fecharia.
    await expect(linha).toContainText('12,5%');
    await expect(linha).toContainText('8,75');
  });

  /**
   * A parte do cenário que o protótipo **não** faz.
   *
   * `salvarPacote()` do protótipo coage em silêncio: nome vazio vira "Pacote 30
   * Claves", quantidade inválida vira 30, desconto inválido vira 5. Isso é
   * comportamento de mock, e o guia de testes pede o contrário —
   * "Validações barram valores/percentuais inválidos". Aqui o guia vence.
   */
  test.describe('validações barram entrada inválida', () => {
    test('nome vazio não salva', async ({ page }) => {
      await abrirPacotes(page);
      await page.getByRole('link', { name: ADMIN_PACOTES.novo }).click();

      await page.getByLabel(ADMIN_PACOTE_FORMULARIO.rotuloQuantidade).fill('30');
      await page.getByRole('button', { name: ADMIN_PACOTE_FORMULARIO.salvar }).click();

      await expect(page.getByText(ADMIN_PACOTE_FORMULARIO.erroNomeVazio)).toBeVisible();
      // Continua no formulário: a URL não mudou, e nenhum pacote foi criado.
      await expect(page).toHaveURL(/\/admin\/pacotes\/novo/);
    });

    test('quantidade zero não salva', async ({ page }, info) => {
      await abrirPacotes(page);
      await page.getByRole('link', { name: ADMIN_PACOTES.novo }).click();

      await page
        .getByLabel(ADMIN_PACOTE_FORMULARIO.rotuloNome)
        .fill(nomeUnico('A2 zero', info.workerIndex));
      await page.getByLabel(ADMIN_PACOTE_FORMULARIO.rotuloQuantidade).fill('0');
      await page.getByLabel(ADMIN_PACOTE_FORMULARIO.rotuloValor).fill('10,00');
      await page.getByRole('button', { name: ADMIN_PACOTE_FORMULARIO.salvar }).click();

      await expect(page.getByText(ADMIN_PACOTE_FORMULARIO.erroQuantidadeInvalida)).toBeVisible();
      await expect(page).toHaveURL(/\/admin\/pacotes\/novo/);
    });

    /**
     * Valor acima da base — a regra que **nenhum** `check` do banco pega.
     *
     * Um pacote mais caro que comprar Clave a Clave passa por
     * `quantidade > 0`, `valor > 0` e `desconto between 0 and 100`. É erro de
     * negócio, e o protótipo o corrigia calado (`if (valor > qtd * 10) valor =
     * qtd * 10`) — o que faria o admin salvar um preço que não foi o digitado.
     */
    test('valor acima da base sem desconto não salva', async ({ page }, info) => {
      await abrirPacotes(page);
      await page.getByRole('link', { name: ADMIN_PACOTES.novo }).click();

      await page
        .getByLabel(ADMIN_PACOTE_FORMULARIO.rotuloNome)
        .fill(nomeUnico('A2 caro', info.workerIndex));
      await page.getByLabel(ADMIN_PACOTE_FORMULARIO.rotuloQuantidade).fill('10');
      // Base de 10 Claves é R$ 100. R$ 150 é desconto negativo.
      await page.getByLabel(ADMIN_PACOTE_FORMULARIO.rotuloValor).fill('150,00');
      await page.getByRole('button', { name: ADMIN_PACOTE_FORMULARIO.salvar }).click();

      await expect(page.getByText(ADMIN_PACOTE_FORMULARIO.erroValorAcimaDaBase)).toBeVisible();
      await expect(page).toHaveURL(/\/admin\/pacotes\/novo/);
    });
  });

  /**
   * *"…e fica em log"* — a última cláusula do RF-051, que nenhuma tela mostra.
   *
   * O rastro é `log_auditoria` (migration `0003`), alimentada pelo trigger
   * `pacote_clave_auditoria` que a `0007` pendura na tabela. Conferir o
   * `ator_id` não é preciosismo: um log sem autor não serve para auditar nada,
   * e `auth.uid()` dentro de um trigger `security definer` é exatamente o tipo
   * de coisa que se quebra em silêncio numa refatoração de RPC.
   */
  test('a criação fica registrada em log, com o autor', async ({ page }, info) => {
    const nome = nomeUnico('A2 log', info.workerIndex);

    await abrirPacotes(page);
    await page.getByRole('link', { name: ADMIN_PACOTES.novo }).click();
    await page.getByLabel(ADMIN_PACOTE_FORMULARIO.rotuloNome).fill(nome);
    await page.getByLabel(ADMIN_PACOTE_FORMULARIO.rotuloQuantidade).fill('20');
    await page.getByLabel(ADMIN_PACOTE_FORMULARIO.rotuloDesconto).fill('5');
    await page.getByRole('button', { name: ADMIN_PACOTE_FORMULARIO.salvar }).click();

    await expect(page.getByRole('row').filter({ hasText: nome })).toBeVisible();

    const pacoteId = await pacotePorNome(nome);
    expect(pacoteId, `o pacote "${nome}" precisa existir no banco`).not.toBeNull();

    const rastro = await auditoriaDe('pacote_clave', pacoteId ?? '');
    const criacao = rastro.filter((linha) => linha.acao === 'insert');

    expect(criacao, 'criar pacote tem de deixar uma linha `insert` no log').toHaveLength(1);
    expect(criacao[0]?.depois?.['nome']).toBe(nome);
    expect(criacao[0]?.atorId, 'o log sem autor não audita nada').toBe(
      await perfilPorEmail(PERSONA.ADMIN.email),
    );
  });
});
