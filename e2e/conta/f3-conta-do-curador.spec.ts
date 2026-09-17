import { expect, test } from '@playwright/test';

import { PERSONA } from '../apoio/personas';
import { entrarComo } from '../apoio/sessao';
import { CONTA, PREFERENCIAS } from '../apoio/textos';

/**
 * F3 · Conta do curador — módulo 17, RF-025, RF-026 e RF-027
 *
 * **Resultado esperado**
 * - O perfil do curador aparece **em leitura**, com caminho para "Meu cadastro".
 * - Os dados de recebimento declaram a pendência.
 * - Preferências e segurança existem, com o catálogo de eventos do curador.
 *
 * ## Por que o perfil do curador é leitura, e o do artista não
 *
 * O que o artista edita em `/artista/perfil` é vitrine. O do curador é a base
 * da **classe** — gêneros, credenciais, serviços —, e mexer nisso solto abriria
 * a porta para promoção por edição de perfil. Por isso a edição vive no módulo
 * 12.6 ("Meu cadastro"), com a regra escrita na tela, e a Conta só mostra.
 *
 * ## A aba `perfil` só existe aqui
 *
 * No artista o perfil é rota própria, porque é assim que o protótipo dele o
 * põe; no curador é aba de Conta, porque o protótipo do curador não tem item de
 * perfil na sidebar. Cada lado segue o seu — e é por isso que este arquivo
 * existe em vez de um parâmetro no F1.
 */
test.describe('F3 · Conta do curador', () => {
  test('as quatro abas do curador existem', { tag: ['@RF-025'] }, async ({ page }) => {
    await entrarComo(page, PERSONA.CURADOR_MANUTENCAO);
    await page.goto('/curador/conta?aba=perfil');

    for (const aba of Object.values(CONTA.abas)) {
      await expect(
        page.getByRole('link', { name: aba, exact: true }),
        `aba "${aba}"`,
      ).toBeVisible();
    }
  });

  test('o perfil do curador aparece em leitura', { tag: ['@RF-025'] }, async ({ page }) => {
    await entrarComo(page, PERSONA.CURADOR_MANUTENCAO);
    await page.goto('/curador/conta?aba=perfil');

    // Sem botão de salvar: a edição é no 12.6, e a tela não finge o contrário.
    await expect(page.getByRole('button', { name: /^Salvar alterações$/ })).toHaveCount(0);
  });

  /**
   * ⚠️ RF-026 **não está implementado**.
   *
   * A chave Pix em que as Claves viram repasse não existe nesta release. A tela
   * declara a pendência em vez de mostrar campos que não gravariam nada — e o
   * teste afirma a declaração, que vira regressão quando a tela real chegar.
   */
  test(
    'os dados de recebimento ainda não estão nesta release',
    { tag: ['@RF-026'] },
    async ({ page }) => {
      await entrarComo(page, PERSONA.CURADOR_MANUTENCAO);
      await page.goto('/curador/conta?aba=dados');

      await expect(page.getByText(CONTA.financeiroPendente.curador.titulo).first()).toBeVisible();
      await expect(page.getByText(CONTA.pendenteNestaRelease).first()).toBeVisible();
    },
  );

  test('as preferências trazem o catálogo do curador', { tag: ['@RF-027'] }, async ({ page }) => {
    await entrarComo(page, PERSONA.CURADOR_MANUTENCAO);
    await page.goto('/curador/conta?aba=preferencias');

    await expect(
      page.getByRole('heading', { name: PREFERENCIAS.notificacoesTitulo }),
    ).toBeVisible();
    await expect(page.getByText(PREFERENCIAS.salvoAutomaticamente).first()).toBeVisible();

    // A nota do idioma é a **do curador**, e não a do artista: a faixa e o
    // contexto chegam no idioma de quem enviou.
    await expect(page.getByText(PREFERENCIAS.idiomaNotaCurador).first()).toBeVisible();
  });

  test('a segurança do curador traz senha e sessões', { tag: ['@RF-027'] }, async ({ page }) => {
    await entrarComo(page, PERSONA.CURADOR_MANUTENCAO);
    await page.goto('/curador/conta?aba=seguranca');

    await expect(page.getByText(CONTA.senhaTitulo).first()).toBeVisible();
    await expect(page.getByText(CONTA.sessoesTitulo).first()).toBeVisible();
    await expect(page.getByText(CONTA.sessaoAtual).first()).toBeVisible();
  });
});
