import { expect, test } from '@playwright/test';

import { clienteDeServico } from '../apoio/banco';
import { PREFIXO_EFEMERO } from '../apoio/contas';
import { PERSONA, senhaDeTeste } from '../apoio/personas';
import { CADASTRAR, CURADOR_CADASTRO } from '../apoio/textos';

/**
 * D7b · Cadastro de conta do curador — módulo 1.1, RF-003 (exceção)
 *
 * `/curador/cadastrar` não é `/artista/cadastrar` com outra copy: o protótipo
 * (`docs/R2/extraido/Curador.html`) não tem "Confirmar senha" nem o aceite de
 * Termos no passo 1 do wizard, e a decisão do cliente em 2026-09-22 foi seguir
 * o protótipo aqui — RF-003 (confirmação + aceite obrigatórios) continua
 * valendo só para `/cadastrar` e `/artista/cadastrar`. Ver
 * `docs/prd/07-pendencias-e-divergencias.md` e `esquemaCadastroCurador`.
 *
 * **Passos**
 * 1. Confira que os dois campos que RF-003 exige em outro lugar não existem
 *    aqui — é a regressão exata que motivou a mudança (a tela usava
 *    `FormularioDeCadastro`, com os dois).
 * 2. Tente com uma senha curta ou sem número.
 * 3. Crie a conta de verdade, com foto.
 * 4. Tente com um e-mail que já tem conta.
 *
 * Só o passo 3 cria conta, e ele mesmo a apaga no fim.
 */

test.describe('D7b · Cadastro de conta do curador', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/curador/cadastrar');
  });

  test('tem os campos do protótipo, e só eles', { tag: ['@RF-003'] }, async ({ page }) => {
    await expect(page.getByLabel(CADASTRAR.rotuloNome)).toBeVisible();
    await expect(page.getByLabel(CADASTRAR.rotuloEmail)).toBeVisible();
    await expect(page.getByLabel(CADASTRAR.rotuloSenha, { exact: true })).toBeVisible();
    // O avatar com "Adicionar foto" é do protótipo, e é o passo 1 do wizard.
    await expect(page.getByText(CURADOR_CADASTRO.adicionarFoto)).toBeVisible();

    await expect(page.getByLabel(CADASTRAR.rotuloConfirmar)).toHaveCount(0);
    await expect(page.getByRole('checkbox')).toHaveCount(0);

    await expect(
      page.getByRole('button', { name: CURADOR_CADASTRO.continuar, exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: CURADOR_CADASTRO.voltarAoLogin })).toBeVisible();
  });

  test(
    'senha sem número ou curta demais é barrada no envio',
    { tag: ['@RF-003'] },
    async ({ page }, info) => {
      await page.getByLabel(CADASTRAR.rotuloNome).fill('E2E Cadastro Curador');
      await page
        .getByLabel(CADASTRAR.rotuloEmail)
        .fill(`e2e_d7b_senha_${info.workerIndex}@e2e.dissona.local`);
      await page.getByLabel(CADASTRAR.rotuloSenha, { exact: true }).fill('abcdefgh');

      // Sem medidor nesta tela — o protótipo do passo 1 não o tem. A política
      // é a mesma do artista, e quem a aplica é o servidor.
      await expect(page.getByText(CADASTRAR.requisitoNumero)).toHaveCount(0);

      await page.getByRole('button', { name: CURADOR_CADASTRO.continuar, exact: true }).click();

      await expect(page.getByText(CADASTRAR.erroSenhaFraca)).toBeVisible();
      await expect(page).toHaveURL(/\/curador\/cadastrar/);
    },
  );

  /**
   * O caminho feliz, que D7 não tem para o artista.
   *
   * D7 o evita porque "a conta é criada e recebo e-mail de verificação" gasta
   * cota do SMTP embutido (~2/hora). Aqui ele cabe: com a confirmação de
   * e-mail **desligada** no projeto (desde 2026-09-22), o `signUp` devolve
   * sessão na hora e **nenhum e-mail sai**. Se alguém religar a confirmação,
   * este cenário passa a cair em `/verificar-email` e falha — o que é a
   * resposta certa, porque a tela deixou de ir direto ao passo 2.
   *
   * É o que prova as duas correções de fidelidade: a foto sobe por esta tela
   * (pelo `multipart`, que a Server Action grava depois de a sessão nascer) e
   * o destino é o passo **2** — sem "Passo 1 de 8" duas vezes seguidas.
   */
  test(
    'cria a conta com foto e segue para o passo 2',
    { tag: ['@RF-003', '@RF-006'] },
    async ({ page }, info) => {
      // PNG 1×1 de verdade: o bucket confere o MIME pelo metadado do objeto.
      const png = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64',
      );
      // `PREFIXO_EFEMERO` para a varredura de contas abandonadas alcançar esta
      // conta caso a limpeza do fim falhe.
      const email = `${PREFIXO_EFEMERO}d7b_${info.workerIndex}_${Date.now().toString(36)}@e2e.dissona.local`;

      await page.getByLabel(CADASTRAR.rotuloNome).fill('Dani Souza');
      await page.getByLabel(CADASTRAR.rotuloEmail).fill(email);
      await page.getByLabel(CADASTRAR.rotuloSenha, { exact: true }).fill(senhaDeTeste());
      await page
        .locator('input[type="file"][name="foto"]')
        .setInputFiles({ name: 'perfil.png', mimeType: 'image/png', buffer: png });

      await page.getByRole('button', { name: CURADOR_CADASTRO.continuar, exact: true }).click();

      // O passo 2, e não o 1: `salvarDadosBasicos` avançou `passo_cadastro`
      // junto com a gravação da foto.
      await page.waitForURL(/\/curador\/cadastro\/2/, { timeout: 25_000 });
      await expect(page.getByRole('heading', { name: CURADOR_CADASTRO.titulos[1] })).toBeVisible();

      const { data } = await clienteDeServico().auth.admin.listUsers({ page: 1, perPage: 200 });
      const conta = data.users.find((usuario) => usuario.email === email);
      expect(conta, 'a conta deveria ter sido criada').toBeTruthy();
      if (conta === undefined) return;

      try {
        const { data: perfil } = await clienteDeServico()
          .from('perfil')
          .select('foto_caminho')
          .eq('id', conta.id)
          .single();

        // A foto que subiu por esta tela ficou gravada no perfil — é o que
        // separa "o campo aparece" de "o campo funciona".
        expect(perfil?.foto_caminho).toBe(`${conta.id}/perfil.png`);
      } finally {
        await clienteDeServico().auth.admin.deleteUser(conta.id);
      }
    },
  );

  test('e-mail com conta devolve o atalho para entrar', { tag: ['@RF-003'] }, async ({ page }) => {
    await page.getByLabel(CADASTRAR.rotuloNome).fill('E2E Cadastro Curador');
    // A persona do curador existe e está confirmada — mesmo caso de D7 para o
    // artista.
    await page.getByLabel(CADASTRAR.rotuloEmail).fill(PERSONA.CURADOR_BRONZE.email);
    await page.getByLabel(CADASTRAR.rotuloSenha, { exact: true }).fill(senhaDeTeste());

    await page.getByRole('button', { name: CURADOR_CADASTRO.continuar, exact: true }).click();

    await expect(page.getByText(CADASTRAR.bannerEmailExistente.titulo)).toBeVisible();
    await expect(
      page.getByRole('link', { name: CADASTRAR.bannerEmailExistente.acao }),
    ).toHaveAttribute('href', '/curador/entrar');
  });
});
