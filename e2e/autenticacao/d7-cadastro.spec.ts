import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { PERSONA, senhaDeTeste } from '../apoio/personas';
import { CADASTRAR } from '../apoio/textos';

/**
 * D7 · Cadastro de conta — módulo 1.1, RF-003
 *
 * **Passos**
 * 1. Tente criar conta sem marcar o aceite.
 * 2. Tente com uma senha que o medidor recusa.
 * 3. Tente com um e-mail que já tem conta.
 *
 * **Resultado esperado**
 * - Sem aceite, o envio é barrado com a mensagem do campo obrigatório.
 * - Senha curta ou sem número é barrada, e o medidor diz por quê.
 * - E-mail já cadastrado devolve o banner com o atalho para o login.
 *
 * ## Por que os três negativos, e não o caminho feliz
 *
 * O quarto critério do RF-003 — "a conta é criada e recebo e-mail de
 * verificação" — só se prova **enviando** e-mail, e o SMTP embutido do Supabase
 * entrega ~2 por hora (open-questions #10). D4 e D6 já exercitam o outro lado
 * desse fio pelo `generateLink`, que é o mesmo objeto do GoTrue sem consumir a
 * cota. O que faltava prova nenhuma eram exatamente estes três, e eles não
 * disparam e-mail: o envio nem chega ao GoTrue.
 *
 * Nenhum cenário aqui cria conta, então não há o que limpar depois.
 */

/** Preenche o formulário, deixando de fora o que cada cenário quer testar. */
async function preencher(
  page: Page,
  campos: { readonly email: string; readonly senha: string; readonly aceitar: boolean },
) {
  await page.getByLabel(CADASTRAR.rotuloNome).fill('E2E Cadastro');
  await page.getByLabel(CADASTRAR.rotuloEmail).fill(campos.email);
  await page.getByLabel(CADASTRAR.rotuloSenha, { exact: true }).fill(campos.senha);
  await page.getByLabel(CADASTRAR.rotuloConfirmar).fill(campos.senha);
  // `force`: o input real é visualmente escondido e o `<span>` pintado do
  // Design System fica por cima — é o mesmo tratamento de B7 e B8.
  if (campos.aceitar) await page.getByRole('checkbox').check({ force: true });
}

test.describe('D7 · Cadastro de conta', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/artista/cadastrar');
  });

  test(
    'sem o aceite dos Termos, a conta não é criada',
    { tag: ['@RF-003'] },
    async ({ page }, info) => {
      await preencher(page, {
        email: `e2e_d7_aceite_${info.workerIndex}@e2e.dissona.local`,
        senha: senhaDeTeste(),
        aceitar: false,
      });

      await page.getByRole('button', { name: CADASTRAR.enviar }).click();

      await expect(page.getByText(CADASTRAR.erroAceite)).toBeVisible();
      // Continua na tela: nada foi criado, e a pessoa não é levada adiante.
      await expect(page).toHaveURL(/\/artista\/cadastrar/);
    },
  );

  test(
    'senha sem número ou curta demais é barrada pelo medidor',
    { tag: ['@RF-003'] },
    async ({ page }, info) => {
      await preencher(page, {
        email: `e2e_d7_senha_${info.workerIndex}@e2e.dissona.local`,
        senha: 'abcdefgh',
        aceitar: true,
      });

      // O medidor já classifica antes do envio: 8 caracteres sem número é
      // "Senha fraca" (nível 1 — o nível 0 só existe com o campo vazio).
      await expect(page.getByText(CADASTRAR.forcaDaSenha[1])).toBeVisible();
      // E o requisito não cumprido é o que explica a recusa.
      await expect(page.getByText(CADASTRAR.requisitoNumero)).toBeVisible();

      await page.getByRole('button', { name: CADASTRAR.enviar }).click();

      await expect(page.getByText(CADASTRAR.erroSenhaFraca)).toBeVisible();
      await expect(page).toHaveURL(/\/artista\/cadastrar/);
    },
  );

  test('e-mail com conta devolve o atalho para entrar', { tag: ['@RF-003'] }, async ({ page }) => {
    await preencher(page, {
      // A persona do artista existe e está confirmada — é o caso real do
      // critério "o e-mail já existe".
      email: PERSONA.ARTISTA.email,
      senha: senhaDeTeste(),
      aceitar: true,
    });

    await page.getByRole('button', { name: CADASTRAR.enviar }).click();

    await expect(page.getByText(CADASTRAR.bannerEmailExistente.titulo)).toBeVisible();
    await expect(
      page.getByRole('link', { name: CADASTRAR.bannerEmailExistente.acao }),
    ).toBeVisible();
  });
});
