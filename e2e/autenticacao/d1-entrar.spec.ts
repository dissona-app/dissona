import { expect, test } from '@playwright/test';

import { ambienteDoPerfil, restaurarAmbienteDoPerfil } from '../apoio/banco';
import { PERSONA, senhaDeTeste } from '../apoio/personas';
import { entrarComo } from '../apoio/sessao';
import { ENTRAR } from '../apoio/textos';

/**
 * D1 · Entrar — módulo 1, RF-001 e RF-008
 *
 * Primeiro cenário **funcional** da R1. Até aqui a release tinha paridade
 * tipográfica com o protótipo (`e2e/prototipo/`) e guarda de rota
 * (`e2e/publico/paginas-legais.spec.ts`), e nenhum critério Given/When/Then era
 * exercido por Playwright — o comportamento estava provado na fronteira de
 * banco (`supabase/testes/0001*`–`0003*`), não na de tela.
 *
 * **Passos**
 * 1. Entre com e-mail e senha.
 * 2. Erre a senha.
 * 3. Entre com uma conta bloqueada, com uma sem papel e com uma de dois papéis.
 *
 * **Resultado esperado**
 * - Credencial válida leva ao ambiente do papel.
 * - O erro **não** diz qual campo falhou.
 * - Conta bloqueada vê o banner próprio.
 * - Quem tem dois papéis entra no último ambiente usado e pode trocar.
 *
 * ## Por que o login já é exercido e mesmo assim precisa deste arquivo
 *
 * Todo cenário da suíte começa entrando, então o caminho feliz roda dezenas de
 * vezes por execução. O que **não** rodava é tudo o que não é o caminho feliz:
 * senha errada, conta bloqueada, conta sem papel, dois papéis. São justamente
 * os ramos em que uma regressão passa despercebida, porque nenhum outro teste
 * chega neles.
 *
 * ## A mensagem genérica é requisito, não descuido
 *
 * "E-mail ou senha inválidos" para os dois casos é o que impede enumeração de
 * contas. Um teste que aceitasse "senha incorreta" deixaria passar exatamente a
 * regressão que interessa aqui.
 */
// Em série por causa de `ultimo_ambiente` da `DOIS_PAPEIS`: um teste afirma que
// entrar leva ao curador, e o seguinte **troca** para artista. Em paralelo, o
// segundo mudaria o estado no meio da asserção do primeiro — e a falha diria
// "esperava /curador, recebi /artista", que parece bug de roteamento.
test.describe.configure({ mode: 'serial' });

test.describe('D1 · Entrar', () => {
  test('credencial válida leva ao ambiente do papel', { tag: ['@RF-001'] }, async ({ page }) => {
    await entrarComo(page, PERSONA.ARTISTA);
    await expect(page).toHaveURL(/\/artista/);

    await page.goto('/artista/entrar');
    // A guarda expulsa quem já tem sessão: não há como "entrar de novo" sem
    // sair antes, e é isso que se afirma.
    await expect(page).not.toHaveURL(/\/entrar$/);
  });

  test('o curador entra no ambiente dele', { tag: ['@RF-001'] }, async ({ page }) => {
    await entrarComo(page, PERSONA.CURADOR_BRONZE);
    await expect(page).toHaveURL(/\/curador/);
  });

  test('credencial inválida não diz qual campo falhou', { tag: ['@RF-001'] }, async ({ page }) => {
    await page.goto('/artista/entrar');
    await page.getByLabel(ENTRAR.rotuloEmail, { exact: true }).fill(PERSONA.ARTISTA.email);
    await page.getByLabel(ENTRAR.rotuloSenha, { exact: true }).fill('senha-errada-de-proposito');
    await page.getByRole('button', { name: ENTRAR.enviar, exact: true }).click();

    await expect(page.getByText(ENTRAR.bannerCredenciais.titulo)).toBeVisible();
    await expect(page).toHaveURL(/\/entrar/);

    // O ponto do requisito: a mensagem é a mesma para e-mail inexistente e para
    // senha errada, senão a tela vira oráculo de quem tem conta aqui.
    await page
      .getByLabel(ENTRAR.rotuloEmail, { exact: true })
      .fill('e2e_nao_existe@e2e.dissona.local');
    await page.getByRole('button', { name: ENTRAR.enviar, exact: true }).click();
    await expect(page.getByText(ENTRAR.bannerCredenciais.titulo)).toBeVisible();
  });

  /**
   * Campo vazio é erro **de campo**, e nunca vira tentativa de login.
   *
   * Os erros saem um de cada vez: a ação devolve `campo` no singular, e o
   * formulário mostra o erro daquele campo. Não é limitação — é o que evita
   * cobrir a tela de vermelho antes de a pessoa terminar de digitar. O teste
   * segue essa ordem em vez de exigir os dois de uma vez.
   *
   * O que importa em qualquer ordem: o banner de credencial **não** aparece.
   * Ele significaria que a tentativa foi ao servidor e voltou negada — e uma
   * tentativa que nem devia ter saído conta para o bloqueio por repetição.
   */
  test(
    'campo vazio é barrado sem virar tentativa de login',
    { tag: ['@RF-001'] },
    async ({ page }) => {
      await page.goto('/artista/entrar');
      await page.getByRole('button', { name: ENTRAR.enviar, exact: true }).click();

      await expect(page.getByText(ENTRAR.erroEmailVazio)).toBeVisible();
      await expect(page.getByText(ENTRAR.bannerCredenciais.titulo)).toHaveCount(0);

      await page.getByLabel(ENTRAR.rotuloEmail, { exact: true }).fill(PERSONA.ARTISTA.email);
      await page.getByRole('button', { name: ENTRAR.enviar, exact: true }).click();

      await expect(page.getByText(ENTRAR.erroSenhaVazia)).toBeVisible();
      await expect(page.getByText(ENTRAR.bannerCredenciais.titulo)).toHaveCount(0);
      await expect(page).toHaveURL(/\/entrar/);
    },
  );

  /**
   * A conta bloqueada tem banner próprio, e ele é diferente do de credencial.
   *
   * A distinção importa: quem foi bloqueado por tentativas repetidas precisa
   * saber que o caminho é o suporte, e não tentar de novo — tentar de novo é
   * justamente o que o levou ali.
   */
  test(
    'conta bloqueada vê o banner próprio, e não o de credencial',
    { tag: ['@RF-001'] },
    async ({ page }) => {
      await page.goto('/artista/entrar');
      await page.getByLabel(ENTRAR.rotuloEmail, { exact: true }).fill(PERSONA.BLOQUEADA.email);
      await page.getByLabel(ENTRAR.rotuloSenha, { exact: true }).fill(senhaDeTeste());
      await page.getByRole('button', { name: ENTRAR.enviar, exact: true }).click();

      await expect(page.getByText(ENTRAR.bannerBloqueada.titulo)).toBeVisible();
      await expect(page).toHaveURL(/\/entrar/);

      // E a conta não fica com sessão: a guarda a expulsaria de qualquer rota.
      await page.goto('/artista');
      await expect(page).toHaveURL(/\/entrar/);
    },
  );

  test(
    'conta sem papel cai na seleção de perfil',
    { tag: ['@RF-001', '@RF-006'] },
    async ({ page }) => {
      await entrarComo(page, PERSONA.SEM_PAPEL);
      await expect(page).toHaveURL(/\/selecao-de-perfil/);
    },
  );

  /**
   * `?proximo=` é o que devolve a pessoa ao lugar onde ela estava quando a
   * sessão expirou. Sem isso, expirar no meio de uma avaliação joga o curador
   * na raiz do painel, e ele tem de reencontrar a faixa.
   */
  test(
    'o ?proximo= devolve à rota pedida depois do login',
    { tag: ['@RF-001'] },
    async ({ page }) => {
      await page.goto('/curador/fila');
      await expect(page).toHaveURL(/\/entrar\?proximo=/);

      await page.getByLabel(ENTRAR.rotuloEmail, { exact: true }).fill(PERSONA.CURADOR_BRONZE.email);
      await page.getByLabel(ENTRAR.rotuloSenha, { exact: true }).fill(senhaDeTeste());
      await page.getByRole('button', { name: ENTRAR.enviar, exact: true }).click();

      await expect(page).toHaveURL(/\/curador\/fila/);
    },
  );

  /**
   * RF-008 · papéis acumuláveis.
   *
   * Duas metades: entrar leva ao **último ambiente usado**, e a troca pelo
   * cabeçalho muda de ambiente e fica registrada. A persona nasce com
   * `ultimo_ambiente = 'curador'`, então o primeiro destino é conhecido.
   */
  test('dois papéis entram no último ambiente usado', { tag: ['@RF-008'] }, async ({ page }) => {
    await entrarComo(page, PERSONA.DOIS_PAPEIS);
    await expect(page).toHaveURL(/\/curador/);
  });

  test('trocar de papel muda o ambiente, e é lembrado', { tag: ['@RF-008'] }, async ({ page }) => {
    await entrarComo(page, PERSONA.DOIS_PAPEIS);

    const troca = page.getByRole('navigation', { name: 'Trocar de ambiente' });
    await expect(troca, 'quem tem dois papéis precisa ver a troca').toBeVisible();

    await troca.getByRole('link', { name: 'Artista' }).click();
    await page.waitForURL(/\/artista/);

    // `RegistrarAmbiente` grava num `useEffect`, depois da pintura — ir direto
    // para `/entrar` corre com essa escrita, e a falha aparece como "o
    // roteamento não lembrou", que é diagnóstico errado. Espera-se o **efeito**,
    // e não um tempo arbitrário.
    await expect
      .poll(() => ambienteDoPerfil(PERSONA.DOIS_PAPEIS.email), {
        message: 'a troca de ambiente precisa chegar ao perfil',
        timeout: 15_000,
      })
      .toBe('artista');

    // O que o requisito promete não é a navegação — é a memória dela. Entrar de
    // novo tem de cair no ambiente que ficou.
    await page.goto('/artista/entrar');
    await expect(page).toHaveURL(/\/artista/);
  });

  /**
   * Devolve `ultimo_ambiente` ao valor do seed.
   *
   * O teste acima consome esse estado e o de cima dele o afirma — sem a volta,
   * a segunda execução da suíte encontraria `artista` e falharia com "esperava
   * /curador", que parece bug de roteamento.
   *
   * A restauração vai pelo banco, e não pela tela: o produto grava o campo num
   * efeito de cliente (`RegistrarAmbiente`), e esperar por ele dentro de um
   * `afterAll` que está fechando o contexto é corrida — já falhou uma vez, e o
   * sintoma apareceu no teste seguinte, não aqui.
   */
  test.afterAll(async () => {
    await restaurarAmbienteDoPerfil(PERSONA.DOIS_PAPEIS.email, 'curador');
  });

  test(
    'quem tem um papel só não vê a troca de ambiente',
    { tag: ['@RF-008'] },
    async ({ page }) => {
      await entrarComo(page, PERSONA.ARTISTA);

      await expect(
        page.getByRole('navigation', { name: 'Trocar de ambiente' }),
        'uma escolha de um item só é ruído',
      ).toHaveCount(0);
    },
  );
});
