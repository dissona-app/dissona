import { expect, test } from '@playwright/test';

import { clienteDeServico } from '../apoio/banco';
import { apagarContaEfemera, criarContaEfemera } from '../apoio/contas';
import type { ContaEfemera } from '../apoio/contas';
import { caminhoDoToken, gerarLinkDeEmail } from '../apoio/email';
import { senhaDeTeste } from '../apoio/personas';
import { VERIFICAR_EMAIL } from '../apoio/textos';

/**
 * D4 · Verificação de e-mail — módulo 1.1, RF-004
 *
 * **Passos**
 * 1. Abra o link de verificação.
 * 2. Abra o mesmo link de novo.
 * 3. Abra a rota sem token.
 *
 * **Resultado esperado**
 * - O link confirma o e-mail e leva ao próximo passo da conta.
 * - Token já usado volta à verificação com o estado de erro.
 * - A tela oferece reenviar e corrigir o endereço.
 *
 * ## Onde o e-mail entra, e onde ele não entra
 *
 * O token é gerado por `auth.admin.generateLink` (`apoio/email.ts`) — é o mesmo
 * objeto do GoTrue que o e-mail carregaria, e o teste o entrega ao **mesmo**
 * route handler. O que não se prova aqui é que o e-mail sai e chega: isso
 * depende de provedor transacional dedicado (open-questions #10) e não é
 * observável de dentro da suíte. A matriz registra a ressalva.
 *
 * Como nada é enviado, este arquivo não consome o limite de ~2 e-mails/hora do
 * SMTP embutido — que, se consumido, faria a suíte falhar de forma
 * intermitente com `over_email_send_rate_limit`.
 *
 * ## Por que conta descartável, e não confirmada
 *
 * Confirmar é irreversível. As personas fixas nascem confirmadas justamente
 * para poderem entrar; usar uma delas aqui não provaria nada, porque não há o
 * que confirmar. Cada teste cria a sua conta **não confirmada** e a apaga.
 */

const descartaveis: ContaEfemera[] = [];

/**
 * Conta recém-criada, com o e-mail ainda pendente — o estado de RF-004.
 *
 * A conta **nasce** pendente. Criar confirmada e desconfirmar depois não
 * funciona: `updateUserById({ email_confirm: false })` é inócuo — a flag só
 * confirma, nunca o contrário. O sintoma é o `generateLink` recusar com "already
 * been registered", que fala de outra coisa e manda procurar no lugar errado.
 */
async function contaNaoConfirmada(indiceDoWorker: number): Promise<ContaEfemera> {
  const conta = await criarContaEfemera({
    rotulo: 'verif',
    indiceDoWorker,
    emailConfirmado: false,
  });
  descartaveis.push(conta);
  return conta;
}

async function estaConfirmada(id: string): Promise<boolean> {
  const { data } = await clienteDeServico().auth.admin.getUserById(id);
  return data.user?.email_confirmed_at != null;
}

test.afterAll(async () => {
  await Promise.all(descartaveis.map(apagarContaEfemera));
});

test.describe('D4 · Verificação de e-mail', { tag: ['@RF-004'] }, () => {
  test('o link confirma o e-mail e leva ao próximo passo', async ({ page }, info) => {
    const conta = await contaNaoConfirmada(info.workerIndex);
    expect(await estaConfirmada(conta.id), 'o cenário começa com o e-mail pendente').toBe(false);

    const link = await gerarLinkDeEmail('signup', conta.email, { senha: senhaDeTeste() });
    await page.goto(link.caminho);

    // Sem papel ainda, então o destino é a seleção de perfil — é o que
    // `inicioDoUsuario` decide, e é o que a tela de verificação promete
    // ("depois de confirmar, um tour rápido mostra como a Dissona funciona").
    await page.waitForURL(/\/selecao-de-perfil|\/onboarding/);

    expect(await estaConfirmada(conta.id), 'abrir o link precisa confirmar o e-mail').toBe(true);
  });

  /**
   * Uso único, e o destino do erro é a tela que tem o reenvio.
   *
   * Mandar para o login seria pior: quem clicou num link velho precisa de um
   * link novo, e o botão que o gera está na verificação.
   */
  test('token já usado volta à verificação com o estado de erro', async ({ page }, info) => {
    const conta = await contaNaoConfirmada(info.workerIndex);

    const link = await gerarLinkDeEmail('signup', conta.email, { senha: senhaDeTeste() });
    await page.goto(link.caminho);
    await page.waitForURL(/\/selecao-de-perfil|\/onboarding/);

    await page.goto(caminhoDoToken(link.tokenHash, 'signup'));

    await expect(page).toHaveURL(/\/verificar-email\?erro=token/);
    await expect(page.getByRole('button', { name: VERIFICAR_EMAIL.reenviar })).toBeVisible();
  });

  test('link sem token aterrissa na verificação, e não numa página de erro', async ({ page }) => {
    await page.goto('/api/auth/confirmar');

    await expect(page).toHaveURL(/\/verificar-email\?erro=token/);
    await expect(page.getByRole('heading', { name: VERIFICAR_EMAIL.titulo })).toBeVisible();
  });

  /**
   * As duas saídas de quem não recebeu o e-mail.
   *
   * "Reenviar" e "corrija o endereço" são o que impede a tela de ser um beco:
   * sem elas, quem digitou o e-mail errado no cadastro fica sem caminho nenhum
   * — a conta existe, não confirma, e não há por onde recomeçar.
   */
  test('a tela oferece reenviar e corrigir o endereço', async ({ page }) => {
    await page.goto('/verificar-email');

    await expect(page.getByRole('heading', { name: VERIFICAR_EMAIL.titulo })).toBeVisible();
    await expect(page.getByRole('button', { name: VERIFICAR_EMAIL.reenviar })).toBeVisible();
    await expect(page.getByRole('link', { name: VERIFICAR_EMAIL.corrigirEndereco })).toBeVisible();
  });
});
