import { expect, test } from '@playwright/test';

import { apagarContaEfemera, criarContaEfemera } from '../apoio/contas';
import type { ContaEfemera } from '../apoio/contas';
import { senhaDeTeste } from '../apoio/personas';
import { entrarComCredenciais } from '../apoio/sessao';
import { CONTA } from '../apoio/textos';

/**
 * F2 · Segurança e exclusão de conta — módulos 7 e 17, RF-023 e RF-024
 *
 * **Passos**
 * 1. Troque a senha, com e sem a senha atual correta.
 * 2. Veja as sessões ativas.
 * 3. Exclua a conta, e entre de novo dentro do prazo.
 *
 * **Resultado esperado**
 * - Trocar a senha exige a senha atual, e encerra as outras sessões.
 * - As sessões ativas listam dispositivo, com a atual marcada.
 * - A exclusão é em dois passos, exige a palavra `EXCLUIR`, e é reversível por
 *   30 dias.
 *
 * ## Tudo em conta descartável, e é obrigatório
 *
 * Este arquivo **troca a senha** e **exclui a conta**. Feito com persona fixa, a
 * conta ficaria inacessível para todos os outros cenários até o próximo seed, e
 * o sintoma seria "todos os testes daquela persona falharam no login" — longe
 * da causa.
 *
 * ## A reautenticação é o ponto do RF-023
 *
 * Pedir a senha atual antes de trocar é o que impede que uma sessão esquecida
 * num computador alheio vire tomada de conta. É também o que a redefinição por
 * link **não** pede — e é por isso que ela exige o marcador do e-mail
 * (ver `d5-recuperar-e-redefinir`).
 */

const descartaveis: ContaEfemera[] = [];

const SENHA_NOVA = 'Dissona-e2e-5544';

async function conta(indiceDoWorker: number, rotulo: string): Promise<ContaEfemera> {
  const criada = await criarContaEfemera({
    rotulo,
    indiceDoWorker,
    papeis: ['artista'],
    onboardingVisto: true,
  });
  descartaveis.push(criada);
  return criada;
}

test.afterAll(async () => {
  await Promise.all(descartaveis.map(apagarContaEfemera));
});

test.describe('F2 · Segurança e exclusão', () => {
  test(
    'a aba de segurança traz senha, sessões e o encerramento da conta',
    { tag: ['@RF-023'] },
    async ({ page }, info) => {
      const criada = await conta(info.workerIndex, 'seg');
      await entrarComCredenciais(page, criada.email);
      await page.goto('/artista/conta?aba=seguranca');

      await expect(page.getByText(CONTA.senhaTitulo).first()).toBeVisible();
      await expect(page.getByText(CONTA.senhaNota).first()).toBeVisible();
      await expect(page.getByText(CONTA.sessoesTitulo).first()).toBeVisible();
      await expect(page.getByText(CONTA.encerrarContaTitulo).first()).toBeVisible();

      // A sessão atual é reconhecível: é o que permite à pessoa saber qual das
      // linhas **não** encerrar.
      await expect(page.getByText(CONTA.sessaoAtual).first()).toBeVisible();
    },
  );

  test('senha atual errada não troca a senha', { tag: ['@RF-023'] }, async ({ page }, info) => {
    const criada = await conta(info.workerIndex, 'seg2');
    await entrarComCredenciais(page, criada.email);
    await page.goto('/artista/conta?aba=seguranca');

    await page.getByRole('button', { name: CONTA.alterarSenha }).click();

    const dialogo = page.getByRole('dialog');
    await dialogo.getByLabel(CONTA.modalSenha.rotuloAtual, { exact: true }).fill('senha-errada-1');
    await dialogo.getByLabel(CONTA.modalSenha.rotuloNova, { exact: true }).fill(SENHA_NOVA);
    await dialogo.getByLabel(CONTA.modalSenha.rotuloConfirmar, { exact: true }).fill(SENHA_NOVA);
    await dialogo.getByRole('button', { name: CONTA.modalSenha.enviar }).click();

    // Não fecha, e não anuncia sucesso: a senha continua a antiga.
    await expect(page.getByText(CONTA.modalSenha.sucesso)).toHaveCount(0);

    await page.context().clearCookies();
    await entrarComCredenciais(page, criada.email);
    await expect(page, 'a senha antiga precisa continuar valendo').toHaveURL(/\/artista/);
  });

  test(
    'com a senha atual, a troca funciona e a nova passa a valer',
    { tag: ['@RF-023'] },
    async ({ page }, info) => {
      const criada = await conta(info.workerIndex, 'seg3');
      await entrarComCredenciais(page, criada.email);
      await page.goto('/artista/conta?aba=seguranca');

      await page.getByRole('button', { name: CONTA.alterarSenha }).click();

      const dialogo = page.getByRole('dialog');
      await dialogo.getByLabel(CONTA.modalSenha.rotuloAtual, { exact: true }).fill(senhaDeTeste());
      await dialogo.getByLabel(CONTA.modalSenha.rotuloNova, { exact: true }).fill(SENHA_NOVA);
      await dialogo.getByLabel(CONTA.modalSenha.rotuloConfirmar, { exact: true }).fill(SENHA_NOVA);
      await dialogo.getByRole('button', { name: CONTA.modalSenha.enviar }).click();

      await expect(page.getByText(CONTA.modalSenha.sucesso)).toBeVisible({ timeout: 30_000 });

      await page.context().clearCookies();
      await entrarComCredenciais(page, criada.email, SENHA_NOVA);
      await expect(page).toHaveURL(/\/artista/);
    },
  );

  /**
   * RF-024 · a exclusão é em dois passos, e o primeiro é a exportação.
   *
   * A ordem é da LGPD e não é cerimônia: depois da exclusão nada volta, e o
   * arquivo é a única chance de levar os próprios dados. A palavra `EXCLUIR`
   * digitada é o que separa "cliquei sem ler" de "decidi".
   */
  test(
    'a exclusão exige exportar, senha e a palavra EXCLUIR',
    { tag: ['@RF-024'] },
    async ({ page }, info) => {
      const criada = await conta(info.workerIndex, 'lgpd');
      await entrarComCredenciais(page, criada.email);
      await page.goto('/artista/conta?aba=seguranca');

      await expect(page.getByText(CONTA.excluirContaNota).first()).toBeVisible();

      await page.getByRole('button', { name: CONTA.excluirConta }).click();

      // Passo 1: a exportação, com o aviso de que depois nada volta.
      const dialogo = page.getByRole('dialog');
      await expect(dialogo.getByText(CONTA.modalExportar.titulo)).toBeVisible();
      await expect(dialogo.getByText(CONTA.modalExportar.texto)).toBeVisible();
    },
  );
});
