import { expect, test } from '@playwright/test';

import {
  fotoDoPerfil,
  limparFotoDoPerfil,
  perfilPorEmail,
  reporRascunhoDoCurador,
} from '../apoio/banco';
import { PERSONA } from '../apoio/personas';
import { entrarComo } from '../apoio/sessao';
import { CURADOR_CADASTRO } from '../apoio/textos';

/**
 * E1 · Wizard do curador, navegação e retomada — módulo 12, RF-011
 *
 * **Passos**
 * 1. Abra `/curador/cadastro`.
 * 2. Avance, volte, pule.
 * 3. Saia e entre de novo.
 *
 * **Resultado esperado**
 * - Nome e e-mail vêm da conta, e a senha não é pedida.
 * - O indicador mostra "Passo X de 8".
 * - `/curador/cadastro` abre no passo salvo.
 * - Pular avança sem gravar, nos passos puláveis.
 * - Voltar do passo 1 sai do wizard.
 *
 * ## Por que uma persona só deste arquivo
 *
 * O wizard é o recurso mais disputado da suíte: os oito passos escrevem no
 * **mesmo** `perfil_curador`, e `fullyParallel` faria um arquivo salvar o passo
 * 5 enquanto outro afirma o passo 1. `WIZARD_NAV` existe só para este arquivo,
 * e o seed a repõe no passo 1 — é o mesmo remédio das faixas C3–C6.
 *
 * ## A retomada é o ponto, e ela não tem tela própria
 *
 * `/curador/cadastro` sem número **não é uma tela**: ela redireciona para o
 * passo salvo. É a linha que sustenta "você pode retomar de onde parou", que a
 * seleção de perfil promete ao curador — e é invisível em qualquer teste que
 * navegue direto para `/curador/cadastro/3`.
 */

// Em série: os testes avançam e voltam o **mesmo** rascunho, e cada um afirma
// sobre o passo que o anterior deixou.
test.describe.configure({ mode: 'serial' });

const TOTAL = 8;

// Cada teste parte do passo 1. Os cenários **avançam** o rascunho — é o que
// eles provam —, e sem a volta o seguinte encontraria a retomada abrindo onde o
// anterior parou, falhando como se o produto estivesse errado.
test.beforeEach(async () => {
  await reporRascunhoDoCurador(PERSONA.WIZARD_NAV.email);
  await limparFotoDoPerfil(PERSONA.WIZARD_NAV.email);
});

// E depois do arquivo inteiro, porque `avatares` é bucket **público**: um
// `perfil.jpg` da suíte esquecido lá fica legível por qualquer um, e o expurgo
// da `0011` não apaga objeto de Storage.
test.afterAll(async () => {
  await limparFotoDoPerfil(PERSONA.WIZARD_NAV.email);
});

test.describe('E1 · Wizard, navegação e retomada', { tag: ['@RF-011'] }, () => {
  test('o passo 1 herda nome e e-mail da conta, sem pedir senha', async ({ page }) => {
    await entrarComo(page, PERSONA.WIZARD_NAV);
    await page.goto('/curador/cadastro');
    await page.waitForURL(/\/curador\/cadastro\/1$/);

    await expect(page.getByText(CURADOR_CADASTRO.passoDe(1, TOTAL))).toBeVisible();
    await expect(page.getByText(CURADOR_CADASTRO.herdado)).toBeVisible();

    // Nome e e-mail são **leitura**, e não campos: eles vêm da conta, e a nota
    // logo acima diz isso. Um `<input>` ali convidaria a editar o que o passo
    // não edita — é o que a própria copy ("vêm da conta em que você já está")
    // existe para evitar.
    await expect(page.getByText(CURADOR_CADASTRO.rotuloNome, { exact: true })).toBeVisible();
    await expect(page.getByText(PERSONA.WIZARD_NAV.nome, { exact: true })).toBeVisible();
    await expect(page.getByText(CURADOR_CADASTRO.rotuloEmail, { exact: true })).toBeVisible();
    await expect(page.getByText(PERSONA.WIZARD_NAV.email, { exact: true })).toBeVisible();

    // Senha **não** é pedida: quem chega aqui já tem sessão. O protótipo tem a
    // variante com senha, para o cadastro deslogado, e ela não existe no
    // produto — a guarda de `(app)/curador` exige o papel.
    await expect(page.getByLabel(/senha/i)).toHaveCount(0);
  });

  /**
   * A foto, que é o único campo gravável do passo 1.
   *
   * Três cenários, e os três guardam coisas que já estiveram quebradas:
   *
   * 1. **O caminho de escrita em `avatares`.** A foto sobe do navegador direto
   *    ao bucket e a Server Action recebe só o caminho — é o que tira os bytes
   *    do corpo da ação e, com ele, o teto de ~4,5 MB da Vercel. A requisição
   *    para `/storage/v1/object/avatares/` é o que denuncia alguém devolvendo o
   *    arquivo ao `multipart`.
   * 2. **As duas mensagens de recusa.** `erroFotoTipo` e `erroFotoTamanho`
   *    estiveram escritas e **inalcançáveis**: o passo lia o motivo de
   *    `detalhes.motivo`, que `concluir()` nunca preenche, e quem escolhia um
   *    PDF via só o texto genérico. Estes dois testes são a trava.
   * 3. **A recusa acontece antes do upload.** O bucket `avatares` aceita
   *    `image/webp` e a aplicação não; sem a conferência do cliente, um arquivo
   *    que a aplicação vai recusar sobe assim mesmo e sobrescreve, por `upsert`
   *    num nome fixo, a foto boa que já estava lá.
   */
  test('a foto sobe direto ao Storage e grava o caminho no perfil', async ({ page }) => {
    await entrarComo(page, PERSONA.WIZARD_NAV);
    await page.goto('/curador/cadastro/1');

    let subiuAoStorage = false;
    page.on('request', (requisicao) => {
      if (requisicao.url().includes('/storage/v1/object/avatares/')) subiuAoStorage = true;
    });

    await page.getByLabel(new RegExp(CURADOR_CADASTRO.adicionarFoto)).setInputFiles({
      name: 'retrato.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('jpeg da suíte automatizada'),
    });

    // O upload é no `onChange`, não no envio: é o que impede "Voltar" e "Pular",
    // que submetem o mesmo formulário por `formAction`, de carregarem os bytes.
    await expect
      .poll(() => subiuAoStorage, {
        message: 'a foto tem de subir do navegador, e não pelo corpo da Server Action',
        timeout: 30_000,
      })
      .toBe(true);

    await page.getByRole('button', { name: CURADOR_CADASTRO.continuar }).click();
    await page.waitForURL(/\/curador\/cadastro\/2$/);

    const perfilId = await perfilPorEmail(PERSONA.WIZARD_NAV.email);
    expect(await fotoDoPerfil(PERSONA.WIZARD_NAV.email)).toBe(`${perfilId}/perfil.jpg`);
  });

  test('a foto recusa tipo fora do permitido', async ({ page }) => {
    await entrarComo(page, PERSONA.WIZARD_NAV);
    await page.goto('/curador/cadastro/1');

    await page.getByLabel(new RegExp(CURADOR_CADASTRO.adicionarFoto)).setInputFiles({
      name: 'documento.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4'),
    });

    await expect(
      page.getByRole('alert').filter({ hasText: CURADOR_CADASTRO.erroFotoTipo }),
    ).toBeVisible();

    // O arquivo continua no `<input>` quando a conferência falha, de propósito,
    // para o caminho sem JavaScript seguir valendo — então "Continuar" o manda
    // ao servidor, que recusa pelo mesmo motivo. O passo não avança por nenhum.
    await page.getByRole('button', { name: CURADOR_CADASTRO.continuar }).click();
    await expect(page).toHaveURL(/\/curador\/cadastro\/1$/);
    expect(await fotoDoPerfil(PERSONA.WIZARD_NAV.email)).toBeNull();
  });

  test('a foto recusa tamanho acima do limite', async ({ page }) => {
    await entrarComo(page, PERSONA.WIZARD_NAV);
    await page.goto('/curador/cadastro/1');

    // 3 MB num limite de 2. O bucket `avatares` também recusaria, mas quem
    // recusa primeiro é a conferência do cliente — e é ela que impede o arquivo
    // de sobrescrever a foto válida antes de a aplicação dizer não.
    await page.getByLabel(new RegExp(CURADOR_CADASTRO.adicionarFoto)).setInputFiles({
      name: 'retrato-grande.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.alloc(3 * 1024 * 1024),
    });

    await expect(
      page.getByRole('alert').filter({ hasText: CURADOR_CADASTRO.erroFotoTamanho }),
    ).toBeVisible();

    await page.getByRole('button', { name: CURADOR_CADASTRO.continuar }).click();
    await expect(page).toHaveURL(/\/curador\/cadastro\/1$/);
    expect(await fotoDoPerfil(PERSONA.WIZARD_NAV.email)).toBeNull();
  });

  test('voltar do passo 1 sai do wizard', async ({ page }) => {
    await entrarComo(page, PERSONA.WIZARD_NAV);
    await page.goto('/curador/cadastro/1');

    // No passo 1 o rótulo muda: não há passo anterior, então a saída é o login.
    // É **botão**, e não link: voltar também é submit, com `formAction`
    // própria — o passo grava o que já foi digitado antes de recuar.
    await expect(page.getByRole('button', { name: CURADOR_CADASTRO.voltarAoLogin })).toBeVisible();
  });

  test('avançar grava o passo, e a retomada volta nele', async ({ page }) => {
    await entrarComo(page, PERSONA.WIZARD_NAV);
    await page.goto('/curador/cadastro/1');

    await page.getByRole('button', { name: CURADOR_CADASTRO.continuar }).click();
    await page.waitForURL(/\/curador\/cadastro\/2$/);
    await expect(page.getByText(CURADOR_CADASTRO.passoDe(2, TOTAL))).toBeVisible();

    // A retomada: `/curador/cadastro` sem número redireciona para o passo salvo.
    await page.goto('/curador/cadastro');
    await expect(
      page,
      'sem número, a rota tem de abrir no passo salvo — é o que sustenta "retome de onde parou"',
    ).toHaveURL(/\/curador\/cadastro\/2$/);
  });

  test('voltar a partir do passo 2 volta um passo', async ({ page }) => {
    await entrarComo(page, PERSONA.WIZARD_NAV);
    await page.goto('/curador/cadastro/2');

    await page.getByRole('button', { name: CURADOR_CADASTRO.voltar }).click();
    await page.waitForURL(/\/curador\/cadastro\/1$/);
  });

  /**
   * "Pular" só existe nos passos que o protótipo deixa pular — canais,
   * credenciais e bio (`PASSOS_PULAVEIS`).
   *
   * Nos outros ele não pode existir: pular o gênero deixaria o curador sem nada
   * que o torne selecionável, e pular os serviços o deixaria sem preço.
   */
  test('pular existe no passo de canais, e não no de gêneros', async ({ page }) => {
    await entrarComo(page, PERSONA.WIZARD_NAV);

    await page.goto('/curador/cadastro/2');
    await expect(
      page.getByRole('button', { name: CURADOR_CADASTRO.pular }),
      'gênero não é pulável: sem ele o curador não é selecionável',
    ).toHaveCount(0);

    await page.goto('/curador/cadastro/4');
    await expect(page.getByRole('button', { name: CURADOR_CADASTRO.pular })).toBeVisible();
  });

  test('sair e entrar de novo retoma no mesmo passo', async ({ page, context }) => {
    await entrarComo(page, PERSONA.WIZARD_NAV);
    await page.goto('/curador/cadastro/1');
    await page.getByRole('button', { name: CURADOR_CADASTRO.continuar }).click();
    await page.waitForURL(/\/curador\/cadastro\/2$/);

    // Sessão nova, do zero: é o que "sair e voltar amanhã" significa.
    await context.clearCookies();
    await entrarComo(page, PERSONA.WIZARD_NAV);

    await expect(page).toHaveURL(/\/curador\/cadastro\/2$/);
  });
});
