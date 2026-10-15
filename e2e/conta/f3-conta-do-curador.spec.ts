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
  test('Conta tem as três abas do protótipo aprovado', { tag: ['@RF-025'] }, async ({ page }) => {
    await entrarComo(page, PERSONA.CURADOR_MANUTENCAO);
    await page.goto('/curador/conta');

    for (const aba of [CONTA.abas.dados, CONTA.abas.preferencias, CONTA.abas.seguranca]) {
      await expect(
        page.getByRole('link', { name: aba, exact: true }),
        `aba "${aba}"`,
      ).toBeVisible();
    }
    // O perfil do curador saiu de Conta: é a tela "Meu perfil".
    await expect(page.getByRole('link', { name: CONTA.abas.perfil, exact: true })).toHaveCount(0);
  });

  test(
    '"Meu perfil" é a vitrine, e a edição fica atrás de "Editar perfil"',
    { tag: ['@RF-025'] },
    async ({ page }) => {
      await entrarComo(page, PERSONA.CURADOR_MANUTENCAO);
      await page.goto('/curador/meu-cadastro');

      await expect(page.getByText('Curadorias', { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: /^Salvar/ })).toHaveCount(0);
      await page.getByRole('link', { name: 'Editar perfil' }).click();
      await expect(page).toHaveURL(/\/curador\/meu-cadastro\/editar$/);
    },
  );

  /**
   * RF-026 · dados de recebimento — protótipo aprovado: o cartão mostra a
   * chave Pix gravada em `perfil_curador`, ou diz que o repasse precisa dela.
   */
  test(
    'os dados de recebimento mostram a chave Pix, ou pedem uma',
    { tag: ['@RF-026'] },
    async ({ page }) => {
      await entrarComo(page, PERSONA.CURADOR_MANUTENCAO);
      await page.goto('/curador/conta?aba=dados');

      await expect(page.getByText(CONTA.financeiroPendente.curador.titulo).first()).toBeVisible();
      await expect(page.getByText(/Pix · chave de|Nenhuma chave Pix cadastrada/)).toBeVisible();
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
    // Protótipo aprovado: as categorias do curador e o idioma num seletor.
    await expect(
      page.getByRole('switch', { name: PREFERENCIAS.categorias.curador[0].titulo }),
    ).toBeVisible();
    await expect(page.getByLabel(PREFERENCIAS.idiomaTitulo)).toBeVisible();
  });

  test('a segurança do curador traz senha e sessões', { tag: ['@RF-027'] }, async ({ page }) => {
    await entrarComo(page, PERSONA.CURADOR_MANUTENCAO);
    await page.goto('/curador/conta?aba=seguranca');

    await expect(page.getByText(CONTA.senhaTitulo).first()).toBeVisible();
    await expect(page.getByText(CONTA.sessoesTitulo).first()).toBeVisible();
    await expect(page.getByText(CONTA.sessaoAtual).first()).toBeVisible();
  });
});
