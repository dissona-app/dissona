import { expect, test } from '@playwright/test';

import { reporRascunhoDoCurador } from '../apoio/banco';
import { PERSONA } from '../apoio/personas';
import { entrarComo } from '../apoio/sessao';
import { CURADOR_CADASTRO } from '../apoio/textos';

/**
 * E2 · Canais e serviços — módulo 12, RF-012 e RF-013
 *
 * **Passos**
 * 1. No passo 4, cadastre canais.
 * 2. No passo 5, defina serviços e preços.
 *
 * **Resultado esperado**
 * - Os sete tipos de canal aparecem; link inválido é recusado.
 * - Feedback é obrigatório; os outros três são opcionais.
 * - Preço inválido é recusado.
 *
 * ## Persona própria, pela mesma razão do E1
 *
 * O wizard inteiro escreve num `perfil_curador` só. `WIZARD_MIDIAS` existe para
 * este arquivo, e o seed a repõe no passo 1.
 *
 * ## O que este cenário **não** cobre
 *
 * A detecção de salvamentos de playlist do Spotify (RF-012) não existe: é a
 * open-question #19, e não há integração para exercer. A matriz registra a
 * ressalva em vez de deixar a linha verde sugerindo o contrário.
 */

// Em série: os dois passos gravam no mesmo rascunho.
test.describe.configure({ mode: 'serial' });

// Mesma razão do E1: os passos avançam, e cada teste precisa do seu começo.
test.beforeEach(async () => {
  await reporRascunhoDoCurador(PERSONA.WIZARD_MIDIAS.email);
});

test.describe('E2 · Canais e serviços', () => {
  test('os sete tipos de canal estão na lista', { tag: ['@RF-012'] }, async ({ page }) => {
    await entrarComo(page, PERSONA.WIZARD_MIDIAS);
    await page.goto('/curador/cadastro/4');

    const tipo = page.getByLabel(CURADOR_CADASTRO.rotuloTipoDoCanal).first();
    for (const canal of CURADOR_CADASTRO.tiposDeCanal) {
      await expect(
        tipo.getByRole('option', { name: canal.rotulo, exact: true }),
        `tipo "${canal.rotulo}"`,
      ).toBeAttached();
    }
  });

  /**
   * Link inválido é recusado **no servidor**, e a mensagem diz o que corrigir.
   *
   * O passo é pulável, então nada aqui é obrigatório — o que não pode é gravar
   * um canal que o artista vai clicar e não abrir.
   */
  test('link inválido é recusado antes de salvar', { tag: ['@RF-012'] }, async ({ page }) => {
    await entrarComo(page, PERSONA.WIZARD_MIDIAS);
    await page.goto('/curador/cadastro/4');

    await page.getByLabel(CURADOR_CADASTRO.rotuloNomeDoCanal).first().fill('e2e_Canal da suíte');
    await page.getByLabel(CURADOR_CADASTRO.rotuloLinkDoCanal).first().fill('não é um link');
    await page.getByRole('button', { name: CURADOR_CADASTRO.continuar }).click();

    // Qualquer uma das três mensagens de link serve: o requisito é que o canal
    // inválido **não** seja gravado, e qual delas aparece depende de o erro ser
    // do campo ou do passo. Amarrar a uma só seria testar a implementação da
    // validação, não a regra.
    const erroDeLink = page.getByText(
      new RegExp(
        [
          CURADOR_CADASTRO.erroLinkComEspaco,
          CURADOR_CADASTRO.erroLinkInvalido,
          CURADOR_CADASTRO.erroCanalLink,
        ]
          .map((texto) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          .join('|'),
      ),
    );
    await expect(erroDeLink.first()).toBeVisible();
    await expect(page).toHaveURL(/\/curador\/cadastro\/4$/);
  });

  test('canal com nome e link válidos avança', { tag: ['@RF-012'] }, async ({ page }) => {
    await entrarComo(page, PERSONA.WIZARD_MIDIAS);
    await page.goto('/curador/cadastro/4');

    await page.getByLabel(CURADOR_CADASTRO.rotuloNomeDoCanal).first().fill('e2e_Canal da suíte');
    await page
      .getByLabel(CURADOR_CADASTRO.rotuloLinkDoCanal)
      .first()
      .fill('https://exemplo.test/e2e');
    await page.getByRole('button', { name: CURADOR_CADASTRO.continuar }).click();

    await page.waitForURL(/\/curador\/cadastro\/5$/);
  });

  /**
   * Feedback é obrigatório, e os outros três não.
   *
   * É a regra que sustenta a fila inteira: `confirmar_selecao_curadores` recusa
   * com `DS012` quem não tem `feedback` ativo, então um curador sem ele nunca
   * seria selecionável — cadastraria-se e nunca receberia faixa.
   */
  test(
    'feedback é obrigatório; playlist, post e matéria são opcionais',
    { tag: ['@RF-013'] },
    async ({ page }) => {
      await entrarComo(page, PERSONA.WIZARD_MIDIAS);
      await page.goto('/curador/cadastro/5');

      const feedback = CURADOR_CADASTRO.servicos.find((s) => s.valor === 'feedback');
      await expect(page.getByText(feedback?.rotulo ?? '', { exact: true })).toBeVisible();

      for (const servico of CURADOR_CADASTRO.servicos.filter((s) => !s.obrigatorio)) {
        await expect(
          page.getByText(servico.rotulo, { exact: true }),
          `serviço opcional "${servico.rotulo}"`,
        ).toBeVisible();
      }

      // A nota do rodapé é o que dá sentido ao número: preços são em Claves, e
      // uma Clave vale R$ 10.
      await expect(page.getByText(CURADOR_CADASTRO.notaClaves)).toBeVisible();
    },
  );

  test('sem preço de feedback, o passo não avança', { tag: ['@RF-013'] }, async ({ page }) => {
    await entrarComo(page, PERSONA.WIZARD_MIDIAS);
    await page.goto('/curador/cadastro/5');

    await page.getByLabel(/^Preço de Feedback/).fill('');
    await page.getByRole('button', { name: CURADOR_CADASTRO.continuar }).click();

    await expect(page.getByText(CURADOR_CADASTRO.erroPrecoFeedback)).toBeVisible();
    await expect(page).toHaveURL(/\/curador\/cadastro\/5$/);
  });

  test('preço válido avança para as credenciais', { tag: ['@RF-013'] }, async ({ page }) => {
    await entrarComo(page, PERSONA.WIZARD_MIDIAS);
    await page.goto('/curador/cadastro/5');

    await page.getByLabel(/^Preço de Feedback/).fill('2');
    await page.getByRole('button', { name: CURADOR_CADASTRO.continuar }).click();

    await page.waitForURL(/\/curador\/cadastro\/6$/);
  });
});
