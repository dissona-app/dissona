import { expect, test } from '@playwright/test';

import { PERSONA } from '../apoio/personas';
import { entrarComo } from '../apoio/sessao';
import { HISTORICO, NAVEGACAO_DO_CURADOR } from '../apoio/textos';

/**
 * C8 · Notas e feedback — o histórico do curador, módulo 14
 *
 * Nasceu do QA D-087: o item da sidebar era um `<span aria-disabled>`, sem
 * tela própria, e o curador não tinha como voltar a uma avaliação sem passar
 * pela fila. Agora o item abre `/curador/avaliar`, com as avaliações em
 * rascunho e as entregues, e cada linha leva de volta à avaliação.
 *
 * A tag é RF-068 porque é o que o histórico prova: *"retomo no mesmo passo"* —
 * o "Continuar" reabre o rascunho pela raiz da avaliação, que redireciona para
 * `passo_atual`.
 *
 * `e2e_bronze` é o curador de C3–C6, então o histórico dele tem linhas na
 * maior parte das execuções — mas quais, e em que seção, depende da ordem dos
 * cenários. Por isso o segundo teste só exerce o "Continuar" quando há rascunho.
 */
test.describe('C8 · Notas e feedback', () => {
  test('o item da sidebar abre o histórico', { tag: ['@RF-068'] }, async ({ page }) => {
    await entrarComo(page, PERSONA.CURADOR_BRONZE);
    await page.goto('/curador/fila');

    const item = page.getByRole('link', { name: NAVEGACAO_DO_CURADOR.notas, exact: true });
    await expect(item).toBeVisible();
    await item.click();

    await page.waitForURL(/\/curador\/avaliar$/);
    await expect(
      page
        .getByRole('heading', {
          name: new RegExp(
            `^(${HISTORICO.emAndamentoTitulo}|${HISTORICO.entreguesTitulo}|${HISTORICO.titulo})$`,
          ),
        })
        .first(),
    ).toBeVisible();
    await expect(item).toHaveAttribute('aria-current', 'page');
  });

  test('"Continuar" retoma o rascunho', { tag: ['@RF-068'] }, async ({ page }) => {
    await entrarComo(page, PERSONA.CURADOR_BRONZE);
    await page.goto('/curador/avaliar');

    const continuar = page.getByRole('link', { name: HISTORICO.continuar });
    test.skip((await continuar.count()) === 0, 'sem rascunho no histórico desta execução');

    const destino = await continuar.first().getAttribute('href');
    await continuar.first().click();

    // A raiz redireciona para a etapa gravada em `passo_atual`.
    await page.waitForURL(new RegExp(`${destino ?? ''}/[a-z]+$`));
  });
});
