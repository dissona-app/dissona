import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { limparMidiasDeTeste } from '../apoio/banco';
import { PERSONA } from '../apoio/personas';
import { entrarComo } from '../apoio/sessao';
import { CURADOR_CADASTRO, CURADOR_MANUTENCAO } from '../apoio/textos';

/**
 * E5 · Meu cadastro — módulo 12.6, RF-018
 *
 * **Passos**
 * 1. Abra "Meu cadastro".
 * 2. Insira, edite e exclua uma mídia.
 * 3. Reedite serviços e preços.
 *
 * **Resultado esperado**
 * - As três operações de mídia funcionam, e a exclusão pede confirmação.
 * - Reeditar serviços salva no lugar.
 * - **Nada disso altera a classe.**
 *
 * ## A regra que o cenário existe para provar
 *
 * *"Alterar mídias e preços não muda a classe"* — a classe vem das credenciais
 * comprovadas no cadastro. É a regra grifada do PRD §12.6, e é a que um refactor
 * bem-intencionado quebraria: recalcular a classe ao salvar mídias parece
 * consistência, e seria promoção por edição de perfil.
 *
 * Por isso a classe é lida **antes e depois** de cada operação, e não apenas no
 * fim: um recálculo que subisse e descesse passaria despercebido numa
 * verificação única.
 *
 * ## ⚠️ A tela 12.6 é derivada
 *
 * Ela entrou na V3.1 do discovery e **não existe no protótipo** — a sidebar do
 * curador aponta "Meu cadastro" para o wizard. O conteúdo vem do PRD, e é a
 * única tela do módulo sem referência visual.
 */

// Em série: as três operações de mídia encadeiam na mesma lista.
test.describe.configure({ mode: 'serial' });

const MIDIA = 'e2e_Mídia da suíte';
const MIDIA_EDITADA = 'e2e_Mídia renomeada';

/** A classe declarada pela tela, para comparar antes e depois. */
async function classeNaTela(pagina: Page): Promise<string> {
  return pagina.getByText(CURADOR_MANUTENCAO.classeOverline).first().locator('..').innerText();
}

// O cenário insere mídia a cada execução. Sem a limpeza, a segunda rodada
// encontra duas linhas com o mesmo nome e o seletor estoura por ambiguidade —
// mensagem que fala do seletor, e não do acúmulo que a causou.
test.beforeAll(async () => {
  await limparMidiasDeTeste(PERSONA.CURADOR_MANUTENCAO.email);
});

test.describe('E5 · Meu cadastro', { tag: ['@RF-018'] }, () => {
  test('a tela mostra classe, mídias e serviços, e a regra da classe', async ({ page }) => {
    await entrarComo(page, PERSONA.CURADOR_MANUTENCAO);
    await page.goto('/curador/meu-cadastro');

    await expect(page.getByRole('heading', { name: CURADOR_MANUTENCAO.titulo })).toBeVisible();
    // `.first()` nos três: a tela repete os rótulos no corpo e nos cabeçalhos
    // de seção, e o que se afirma é que a seção existe.
    await expect(page.getByText(CURADOR_MANUTENCAO.classeOverline).first()).toBeVisible();
    await expect(page.getByText(CURADOR_MANUTENCAO.midiasOverline).first()).toBeVisible();
    await expect(page.getByText(CURADOR_MANUTENCAO.servicosOverline).first()).toBeVisible();

    // A nota é o contrato com o curador: mexer aqui não promove nem rebaixa.
    await expect(page.getByText(CURADOR_MANUTENCAO.classeNota)).toBeVisible();
  });

  test('inserir mídia não altera a classe', async ({ page }) => {
    await entrarComo(page, PERSONA.CURADOR_MANUTENCAO);
    await page.goto('/curador/meu-cadastro');

    const classeAntes = await classeNaTela(page);

    await page.getByRole('button', { name: CURADOR_MANUTENCAO.inserirMidia }).click();
    await page.getByLabel(CURADOR_CADASTRO.rotuloNomeDoCanal).fill(MIDIA);
    await page
      .getByLabel(CURADOR_CADASTRO.rotuloLinkDoCanal)
      .fill('https://exemplo.test/e2e-midia');
    await page.getByRole('button', { name: CURADOR_MANUTENCAO.modalMidia.enviar }).click();

    await expect(page.getByText(CURADOR_MANUTENCAO.modalMidia.sucessoNova)).toBeVisible();
    await expect(page.getByText(MIDIA, { exact: true }).first()).toBeVisible();

    expect(await classeNaTela(page), 'inserir mídia não pode mexer na classe').toBe(classeAntes);
  });

  test('editar mídia grava e não altera a classe', async ({ page }) => {
    await entrarComo(page, PERSONA.CURADOR_MANUTENCAO);
    await page.goto('/curador/meu-cadastro');

    const classeAntes = await classeNaTela(page);

    // A lista é um `<ul>`, e não uma tabela: cada mídia é um `<li>`.
    await page
      .getByRole('listitem')
      .filter({ hasText: MIDIA })
      .getByRole('button', { name: new RegExp(CURADOR_MANUTENCAO.editarMidia) })
      .click();

    await page.getByLabel(CURADOR_CADASTRO.rotuloNomeDoCanal).fill(MIDIA_EDITADA);
    await page.getByRole('button', { name: CURADOR_MANUTENCAO.modalMidia.enviar }).click();

    // O desfecho é a lista, e não o aviso: o aviso é conforto, o nome novo na
    // lista é o requisito.
    await expect(page.getByText(MIDIA_EDITADA, { exact: true }).first()).toBeVisible({
      timeout: 30_000,
    });

    expect(await classeNaTela(page), 'editar mídia não pode mexer na classe').toBe(classeAntes);
  });

  /**
   * Excluir pede confirmação, e cancelar **não** apaga.
   *
   * É a metade do "com confirmação" que costuma faltar em teste — e a que
   * importa, porque um diálogo que apaga ao cancelar é pior que nenhum.
   */
  test('excluir mídia exige confirmação, e cancelar não apaga', async ({ page }) => {
    await entrarComo(page, PERSONA.CURADOR_MANUTENCAO);
    await page.goto('/curador/meu-cadastro');

    const linha = page.getByRole('listitem').filter({ hasText: MIDIA_EDITADA });
    await linha.getByRole('button', { name: new RegExp(CURADOR_MANUTENCAO.excluirMidia) }).click();

    const dialogo = page.getByRole('dialog');
    await expect(dialogo).toBeVisible();
    await expect(dialogo).toContainText(CURADOR_MANUTENCAO.modalExcluir.titulo);

    await dialogo.getByRole('button', { name: CURADOR_MANUTENCAO.modalExcluir.cancelar }).click();
    await expect(linha).toBeVisible();

    await linha.getByRole('button', { name: new RegExp(CURADOR_MANUTENCAO.excluirMidia) }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: CURADOR_MANUTENCAO.modalExcluir.enviar })
      .click();

    await expect(page.getByText(CURADOR_MANUTENCAO.modalExcluir.sucesso)).toBeVisible();
    await expect(page.getByText(MIDIA_EDITADA, { exact: true })).toHaveCount(0);
  });

  test('reeditar serviços salva no lugar, e não altera a classe', async ({ page }) => {
    await entrarComo(page, PERSONA.CURADOR_MANUTENCAO);
    await page.goto('/curador/meu-cadastro');

    const classeAntes = await classeNaTela(page);

    await page.getByLabel(/^Preço de Feedback/).fill('3');
    await page.getByRole('button', { name: CURADOR_MANUTENCAO.salvarServicos }).click();

    await expect(page.getByText(CURADOR_MANUTENCAO.servicosSalvos)).toBeVisible();

    // "Salva no lugar" é o ponto da tela de manutenção: a pessoa continua
    // olhando os preços que acabou de mexer, sem ser levada a outro lugar.
    await expect(page).toHaveURL(/\/curador\/meu-cadastro/);
    await expect(page.getByLabel(/^Preço de Feedback/)).toHaveValue('3');

    expect(await classeNaTela(page), 'mexer em preço não pode mexer na classe').toBe(classeAntes);

    // Devolve o preço ao valor do seed: outros cenários leem este curador.
    await page.getByLabel(/^Preço de Feedback/).fill('2');
    await page.getByRole('button', { name: CURADOR_MANUTENCAO.salvarServicos }).click();
    await expect(page.getByText(CURADOR_MANUTENCAO.servicosSalvos)).toBeVisible();
  });
});
