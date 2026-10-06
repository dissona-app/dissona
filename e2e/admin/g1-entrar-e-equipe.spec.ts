import { expect, test } from '@playwright/test';

import { noAdmin, telaDoAdmin } from '../apoio/admin';
import { PERSONA, senhaDeTeste } from '../apoio/personas';
import { entrarComoAdmin } from '../apoio/sessao';
import { ADMIN_ENTRAR, EQUIPE } from '../apoio/textos';

/**
 * G1 · Login do admin, dados do membro e equipe — módulos 19 e 27
 *
 * Cobre RF-028 (login restrito), RF-030 (dados pessoais), RF-031 (listagem) e
 * RF-034 (papéis e permissões, pelo lado negativo).
 *
 * **Resultado esperado**
 * - O login administrativo não tem autocadastro nem social, e o rodapé diz que
 *   contas vêm por convite.
 * - Conta sem papel admin recebe a negativa própria, e **não fica com sessão**.
 * - A equipe lista membro, e-mail, papel, status e ações, com a própria linha
 *   marcada como "Você".
 * - `e2e_suporte` **não** vê as abas Equipe e Papéis.
 *
 * ## O caso negativo é o que este arquivo existe para provar
 *
 * `entrarComoAdmin` já exercita o caminho feliz dezenas de vezes por execução,
 * porque todo cenário `a*` começa por ele. O que não rodava é a negativa: uma
 * conta de artista tentando entrar na área administrativa. Um `/admin/entrar`
 * que aceitasse qualquer sessão válida é o tipo de regressão que nenhum outro
 * teste alcança.
 */
test.describe('G1 · Login do admin e equipe', () => {
  test(
    'o login administrativo não tem autocadastro nem social',
    { tag: ['@RF-028'] },
    async ({ page }) => {
      await page.goto(noAdmin('/admin/entrar'));

      await expect(page.getByRole('heading', { name: ADMIN_ENTRAR.titulo })).toBeVisible();

      // O rodapé é o que explica a ausência: contas existem por convite.
      await expect(page.getByText(ADMIN_ENTRAR.rodape)).toBeVisible();

      // Nada de "criar conta" nem de provedor social nesta área.
      await expect(page.getByRole('link', { name: /criar conta/i })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /google|facebook|soundcloud/i })).toHaveCount(
        0,
      );
    },
  );

  /**
   * Conta que existe, mas não é da equipe.
   *
   * A mensagem é **diferente** da de credencial, e a diferença importa: quem
   * errou a senha tenta de novo; quem não tem acesso precisa falar com um
   * administrador. Um banner genérico faria a segunda pessoa tentar a senha
   * indefinidamente.
   */
  test(
    'conta sem papel admin recebe a negativa própria',
    { tag: ['@RF-028'] },
    async ({ page }) => {
      await page.goto(noAdmin('/admin/entrar'));
      await page.getByLabel(ADMIN_ENTRAR.rotuloEmail, { exact: true }).fill(PERSONA.ARTISTA.email);
      await page.getByLabel(ADMIN_ENTRAR.rotuloSenha, { exact: true }).fill(senhaDeTeste());
      await page.getByRole('button', { name: ADMIN_ENTRAR.enviar }).click();

      await expect(page.getByText(ADMIN_ENTRAR.bannerSemAcesso.titulo)).toBeVisible();

      // E não fica com sessão administrativa: o painel continua fechado.
      await page.goto(noAdmin('/admin'));
      await expect(page).toHaveURL(telaDoAdmin('/entrar'));
    },
  );

  test(
    'a equipe lista os integrantes, com a própria linha marcada',
    { tag: ['@RF-031'] },
    async ({ page }) => {
      await entrarComoAdmin(page);
      await page.goto(noAdmin('/admin/equipe?aba=equipe'));

      // A lista é um `<ul>` com um cabeçalho de colunas em `<span>`, e não uma
      // `<table>` — daí o texto, e não `columnheader`.
      for (const coluna of [
        EQUIPE.equipe.colunaMembro,
        EQUIPE.equipe.colunaEmail,
        EQUIPE.equipe.colunaPapel,
        EQUIPE.equipe.colunaStatus,
      ]) {
        await expect(
          page.getByText(coluna, { exact: true }).first(),
          `coluna "${coluna}"`,
        ).toBeVisible();
      }

      // "Você" é o que impede o administrador de se desativar por engano.
      await expect(page.getByText(EQUIPE.equipe.voce).first()).toBeVisible();

      // A nota explica por que não há "criar conta" em lugar nenhum.
      await expect(page.getByText(EQUIPE.equipe.nota)).toBeVisible();
    },
  );

  test('os dados pessoais do membro abrem e salvam', { tag: ['@RF-030'] }, async ({ page }) => {
    await entrarComoAdmin(page);
    await page.goto(noAdmin('/admin/equipe?aba=dados'));

    await expect(page.getByLabel(EQUIPE.dados.rotuloNome, { exact: true })).toBeVisible();
    await expect(page.getByLabel(EQUIPE.dados.rotuloCargo, { exact: true })).toBeVisible();

    // A nota da senha antecipa a reautenticação, antes de ela acontecer.
    await expect(page.getByText(/Trocar e-mail ou senha pede sua senha atual/)).toBeVisible();

    await page.getByLabel(EQUIPE.dados.rotuloCargo, { exact: true }).fill('Teste automatizado');
    await page.getByRole('button', { name: EQUIPE.dados.salvar, exact: true }).click();

    await expect(page.getByText(EQUIPE.dados.salvo)).toBeVisible({ timeout: 30_000 });
  });

  /**
   * RF-034, pelo lado que importa: quem não tem permissão **não vê** a aba.
   *
   * `e2e_suporte` é `membro_admin` com papel `suporte`, sem permissão em
   * `equipe`. Esconder a aba é o certo — mostrar um caminho que a RLS recusaria
   * em silêncio ensina a pessoa a desconfiar da interface.
   */
  test('suporte não vê as abas de Equipe e Papéis', { tag: ['@RF-034'] }, async ({ page }) => {
    await entrarComoAdmin(page, PERSONA.ADMIN_SUPORTE);
    await page.goto(noAdmin('/admin/equipe'));

    await expect(page.getByRole('link', { name: EQUIPE.abas.equipe, exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: EQUIPE.abas.papeis, exact: true })).toHaveCount(0);

    // E os dados pessoais dele continuam acessíveis: a negativa é de módulo,
    // não da tela inteira.
    await expect(page.getByLabel(EQUIPE.dados.rotuloNome, { exact: true })).toBeVisible();
  });
});
