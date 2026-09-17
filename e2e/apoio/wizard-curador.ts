import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import { CURADOR_CADASTRO } from './textos';

/**
 * Percorre os oito passos do cadastro de curador, pela tela.
 *
 * ## Por que percorrer, em vez de semear
 *
 * As três saídas do módulo 12 — Bronze, candidato a Prata e a tela de
 * classificação — são produzidas por `concluir_cadastro_curador`, e ela conta
 * as credenciais **comprovadas** no momento do envio. Semear o resultado
 * provaria que o seed sabe escrever uma classe; percorrer prova que o produto
 * sabe classificar.
 *
 * É o cenário mais caro da suíte (~25 s por percurso) e é o único jeito.
 *
 * ## O número de credenciais é o que decide, e ele não é escrito aqui
 *
 * O limiar vem de `configuracao.classe.prata_min_credenciais`. Quem chama passa
 * **quantas** credenciais quer comprovar, e o cenário afirma a coerência entre
 * o que a tela conta e a classe que sai — nunca um número fixo.
 */

export type OpcoesDoPercurso = {
  /** Quantas credenciais comprovar com link. Zero produz Bronze. */
  readonly credenciais: number;
};

/** O rótulo do primeiro gênero, que serve a qualquer cadastro de teste. */
const GENERO = CURADOR_CADASTRO.generos[0];
const FRENTE = CURADOR_CADASTRO.frentes[0];
const TEMPO = CURADOR_CADASTRO.tempos[0];

const CREDS_COM_LINK = CURADOR_CADASTRO.credenciais.filter((c) => c.prova === 'link');

async function continuar(page: Page): Promise<void> {
  await page.getByRole('button', { name: CURADOR_CADASTRO.continuar }).click();
}

/**
 * Do passo 1 até a tela de classificação.
 *
 * Pressupõe sessão de um curador em rascunho no passo 1 — é o estado em que a
 * seleção de perfil deixa quem escolheu "Sou curador".
 */
export async function percorrerWizard(page: Page, opcoes: OpcoesDoPercurso): Promise<void> {
  await page.goto('/curador/cadastro');
  await page.waitForURL(/\/curador\/cadastro\/1$/);

  // 1 · dados básicos — nome e e-mail vêm da conta, não há o que preencher.
  await continuar(page);
  await page.waitForURL(/\/curador\/cadastro\/2$/);

  // 2 · gêneros.
  await page.getByText(GENERO, { exact: true }).click();
  await continuar(page);
  await page.waitForURL(/\/curador\/cadastro\/3$/);

  // 3 · atuação: frentes e tempo.
  await page.getByText(FRENTE, { exact: true }).click();
  await page.getByText(TEMPO, { exact: true }).click();
  await continuar(page);
  await page.waitForURL(/\/curador\/cadastro\/4$/);

  // 4 · canais — pulável, e o percurso pula: o que define a classe é o passo 6.
  await page.getByRole('button', { name: CURADOR_CADASTRO.pular }).click();
  await page.waitForURL(/\/curador\/cadastro\/5$/);

  // 5 · serviços: feedback é obrigatório e precisa de preço.
  await page.getByLabel(/^Preço de Feedback/).fill('2');
  await continuar(page);
  await page.waitForURL(/\/curador\/cadastro\/6$/);

  // 6 · credenciais — o passo que decide a classe.
  if (opcoes.credenciais === 0) {
    await page.getByRole('button', { name: CURADOR_CADASTRO.pular }).click();
  } else {
    for (const credencial of CREDS_COM_LINK.slice(0, opcoes.credenciais)) {
      await page.getByText(credencial.rotulo, { exact: true }).click();
      await page
        .getByLabel(`${credencial.rotulo}: ${credencial.dica}`)
        .fill(`https://exemplo.test/e2e-${credencial.valor}`);
    }
    await continuar(page);
  }
  await page.waitForURL(/\/curador\/cadastro\/7$/);

  // 7 · bio — pulável, e o percurso pula.
  await page.getByRole('button', { name: CURADOR_CADASTRO.pular }).click();
  await page.waitForURL(/\/curador\/cadastro\/8$/);

  // 8 · revisão e envio.
  await page.getByRole('button', { name: CURADOR_CADASTRO.enviarCadastro }).click();

  await expect(page, 'o envio do cadastro tem de levar à classificação (12.4)').toHaveURL(
    /\/curador\/cadastro\/classificacao/,
    { timeout: 30_000 },
  );
}
