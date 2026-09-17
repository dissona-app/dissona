import { expect, test } from '@playwright/test';

import { apagarContaEfemera, criarContaEfemera } from '../apoio/contas';
import type { ContaEfemera } from '../apoio/contas';
import { caminhoDoToken, gerarLinkDeEmail } from '../apoio/email';
import { senhaDeTeste } from '../apoio/personas';
import { entrarComCredenciais } from '../apoio/sessao';
import { ENTRAR, SENHA } from '../apoio/textos';

/**
 * D5 · Recuperação e redefinição de senha — módulos 1.2 e 1.3, RF-005
 *
 * **Passos**
 * 1. Peça o link para um e-mail cadastrado, e para um que não existe.
 * 2. Abra o link e defina uma senha nova.
 * 3. Abra o mesmo link de novo.
 * 4. Abra a redefinição sem ter vindo do link.
 *
 * **Resultado esperado**
 * - A resposta é a **mesma** para e-mail cadastrado e não cadastrado.
 * - O link válido redefine, e a senha nova passa a valer.
 * - O link não serve duas vezes.
 * - Chegar à redefinição sem o marcador mostra o estado de link inválido.
 *
 * ## A resposta neutra é o requisito
 *
 * *"Se este e-mail estiver cadastrado, enviamos um link"* — a mesma frase nos
 * dois casos. Qualquer diferença, inclusive de tempo, transformaria a tela em
 * oráculo de quem tem conta aqui. É o tipo de regressão que passa numa revisão
 * de código ("mas seria mais útil dizer que não existe") e que só um teste
 * segura.
 *
 * ## O marcador, e por que sessão não basta
 *
 * A tela de redefinição não é autorizada pela sessão: ela é autorizada pelo
 * cookie que `marcarRecuperacaoEmCurso` grava quando o link é aberto. Se
 * bastasse a sessão, qualquer pessoa já logada poderia trocar a senha sem
 * reautenticar — o que contornaria a exigência da tela de Conta. O teste do
 * "sem marcador" é o que trava essa porta.
 *
 * ## Contas descartáveis, e por quê
 *
 * Este cenário **troca a senha**. Feito com uma persona fixa, a conta ficaria
 * inacessível para todos os outros cenários até o próximo seed — e o sintoma
 * seria "todos os testes daquela persona falharam no login", longe da causa.
 */

const descartaveis: ContaEfemera[] = [];

const SENHA_NOVA = 'Dissona-e2e-9876';

async function conta(indiceDoWorker: number): Promise<ContaEfemera> {
  const criada = await criarContaEfemera({
    rotulo: 'senha',
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

test.describe('D5 · Recuperação e redefinição', { tag: ['@RF-005'] }, () => {
  /**
   * ⚠️ **Este é o único teste da suíte que faz o produto enviar um e-mail.**
   *
   * O resto do arquivo usa `generateLink`, que não envia. Aqui não dá: o que se
   * prova é a resposta do **formulário**, e submetê-lo é o ato. O endereço
   * inexistente não consome cota (não há para quem enviar); o cadastrado
   * consome um envio.
   *
   * Com o SMTP embutido do Supabase — cerca de dois e-mails por hora
   * (open-questions #10) — rodar a suíte duas vezes na mesma hora esgota a
   * cota, e a tela passa a mostrar o banner de limite em vez da confirmação.
   * Isso **não** é falha do requisito, e tratá-lo como falha treinaria todo
   * mundo a ignorar o vermelho deste arquivo. Quando o limite aparece, o teste
   * para e diz por quê.
   *
   * A ordem importa: o inexistente vem primeiro, porque é a metade que sempre
   * pode ser provada.
   */
  test('a resposta é a mesma para e-mail cadastrado e não cadastrado', async ({ page }, info) => {
    const criada = await conta(info.workerIndex);

    await page.goto('/recuperar-senha');
    await page
      .getByLabel(SENHA.rotuloEmail, { exact: true })
      .fill('e2e_ef_nao_existe@e2e.dissona.local');
    await page.getByRole('button', { name: SENHA.recuperarEnviar }).click();

    await expect(page.getByText(SENHA.enviadoTitulo)).toBeVisible();
    await expect(page.getByText(SENHA.enviadoTexto)).toBeVisible();

    await page.goto('/recuperar-senha');
    await page.getByLabel(SENHA.rotuloEmail, { exact: true }).fill(criada.email);
    await page.getByRole('button', { name: SENHA.recuperarEnviar }).click();

    const limite = page.getByText(SENHA.bannerLimite.titulo);
    const confirmacao = page.getByText(SENHA.enviadoTitulo);
    await expect(limite.or(confirmacao)).toBeVisible();

    test.skip(
      await limite.isVisible(),
      'cota de e-mail do SMTP embutido esgotada (~2/hora) — a neutralidade do ' +
        'endereço cadastrado só é observável com provedor dedicado (open-questions #10)',
    );

    // A mesma confirmação, palavra por palavra. É o ponto do requisito.
    await expect(confirmacao).toBeVisible();
    await expect(page.getByText(SENHA.enviadoTexto)).toBeVisible();
  });

  test('o link válido abre a redefinição e a senha nova passa a valer', async ({ page }, info) => {
    const criada = await conta(info.workerIndex);

    const link = await gerarLinkDeEmail('recovery', criada.email);
    await page.goto(link.caminho);
    await page.waitForURL(/\/redefinir-senha/);

    await expect(page.getByRole('heading', { name: SENHA.redefinirTitulo })).toBeVisible();

    await page.getByLabel(SENHA.rotuloNovaSenha, { exact: true }).fill(SENHA_NOVA);
    await page.getByLabel(SENHA.rotuloConfirmar, { exact: true }).fill(SENHA_NOVA);
    await page.getByRole('button', { name: SENHA.redefinirEnviar }).click();

    await expect(page.getByText(SENHA.concluidoTitulo)).toBeVisible();

    // Abrir o link cria uma **sessão de recuperação**, e ela continua ativa
    // depois de redefinir — a guarda expulsa de `/entrar` quem tem sessão, e o
    // campo de e-mail nem chega a existir. Limpar os cookies é o equivalente a
    // "entre com a senha nova", que é o que a tela de concluído pede.
    await page.context().clearCookies();

    // A prova do requisito não é a tela de "concluído": é entrar com a senha
    // nova, e não conseguir com a antiga.
    await entrarComCredenciais(page, criada.email, SENHA_NOVA);
    await expect(page).toHaveURL(/\/artista/);

    await page.context().clearCookies();
    await page.goto('/entrar');
    await page.getByLabel(ENTRAR.rotuloEmail, { exact: true }).fill(criada.email);
    await page.getByLabel(ENTRAR.rotuloSenha, { exact: true }).fill(senhaDeTeste());
    await page.getByRole('button', { name: ENTRAR.enviar, exact: true }).click();

    await expect(
      page.getByText(ENTRAR.bannerCredenciais.titulo),
      'a senha antiga precisa deixar de valer',
    ).toBeVisible();
  });

  test('o mesmo link não serve duas vezes', async ({ page }, info) => {
    const criada = await conta(info.workerIndex);

    const link = await gerarLinkDeEmail('recovery', criada.email);
    await page.goto(link.caminho);
    await page.waitForURL(/\/redefinir-senha/);

    await page.context().clearCookies();
    await page.goto(caminhoDoToken(link.tokenHash, 'recovery'));

    await expect(page).toHaveURL(/\/redefinir-senha\?erro=token/);
    await expect(page.getByText(SENHA.invalidoTitulo)).toBeVisible();
    await expect(page.getByRole('link', { name: SENHA.reiniciar })).toBeVisible();
  });

  /**
   * Sem o marcador, a tela de redefinição não abre — nem para quem tem sessão.
   *
   * É a trava que impede a redefinição de virar um desvio da reautenticação
   * exigida em Conta e configurações (RF-023).
   */
  test('chegar à redefinição sem vir do link mostra o estado inválido', async ({ page }, info) => {
    const criada = await conta(info.workerIndex);

    await entrarComCredenciais(page, criada.email);
    await page.goto('/redefinir-senha');

    await expect(
      page.getByText(SENHA.invalidoTitulo),
      'sessão não autoriza a redefinição — só o marcador do link autoriza',
    ).toBeVisible();
  });
});
