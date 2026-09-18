import { expect, test } from '@playwright/test';

import { apagarContaEfemera, criarContaEfemera } from '../apoio/contas';
import type { ContaEfemera } from '../apoio/contas';
import { entrarComCredenciais } from '../apoio/sessao';
import { ARTISTA_PERFIL, ARTISTA_VITRINE } from '../apoio/textos';

/**
 * F4 · Vitrine do perfil do artista — módulo 7.1, RF-019
 *
 * **Passos**
 * 1. Abra `/artista/perfil` com uma conta nova.
 * 2. Vá para o formulário pelo botão da vitrine.
 *
 * **Resultado esperado**
 * - A vitrine mostra as três estatísticas com os rótulos do protótipo.
 * - Conta sem faixa vê o estado vazio, com o CTA de envio — e não uma lista
 *   em branco nem números inventados.
 * - "Editar cadastro" leva a `/artista/perfil/editar`.
 * - "Ver todas" está visível e desabilitado: o catálogo é da R4.
 *
 * ## Por que conta descartável
 *
 * A vitrine conta faixas, leituras e indicações. `e2e_artista` tem envios
 * semeados, e o número dela muda a cada rodada de B e C — afirmar sobre ele
 * aqui faria este teste falhar por causa de outro. Conta nova tem zero, e zero
 * é um número estável.
 *
 * O caminho com dados — faixa enviada virando "Lida" e a estatística subindo —
 * é coberto pelo unitário de `modulos/artista/servico.ts`, que é onde a
 * derivação mora.
 */

const descartaveis: ContaEfemera[] = [];

async function artista(indiceDoWorker: number): Promise<ContaEfemera> {
  const conta = await criarContaEfemera({
    rotulo: 'vitrine',
    indiceDoWorker,
    papeis: ['artista'],
    onboardingVisto: true,
  });
  descartaveis.push(conta);
  return conta;
}

test.afterAll(async () => {
  await Promise.all(descartaveis.map(apagarContaEfemera));
});

test.describe('F4 · Vitrine do perfil', () => {
  test(
    'a vitrine mostra as três estatísticas e o estado vazio',
    { tag: ['@RF-019'] },
    async ({ page }, info) => {
      const conta = await artista(info.workerIndex);
      await entrarComCredenciais(page, conta.email);
      await page.goto('/artista/perfil');

      // Pelas linhas de apoio, e não pelos rótulos: "Faixas" e "Leituras" são
      // o texto do `<dt>` **mais** o `<span>` de apoio aninhado, então
      // `exact` não casa — e sem `exact` "Faixas" casaria também com "Suas
      // faixas". As linhas de apoio são folhas, e únicas na tela.
      for (const apoio of [
        ARTISTA_VITRINE.estatisticas.faixasApoio,
        ARTISTA_VITRINE.estatisticas.leiturasApoio,
        ARTISTA_VITRINE.estatisticas.indicacoesApoio,
      ]) {
        await expect(page.getByText(apoio, { exact: true }), apoio).toBeVisible();
      }

      // E o bloco é uma lista de definição de verdade: três termos, três valores.
      await expect(page.getByRole('term')).toHaveCount(3);

      // Conta nova: nenhuma faixa, e a tela diz o que fazer a respeito.
      await expect(page.getByText(ARTISTA_VITRINE.vazioTitulo)).toBeVisible();
      await expect(page.getByRole('link', { name: ARTISTA_VITRINE.vazioAcao })).toBeVisible();

      // "Ver todas" existe e não navega — o catálogo é o módulo 6, da R4.
      const verTodas = page.getByText(ARTISTA_VITRINE.verTodas, { exact: true });
      await expect(verTodas).toBeVisible();
      await expect(verTodas).toHaveAttribute('aria-disabled', 'true');
    },
  );

  test('"Editar cadastro" leva ao formulário', { tag: ['@RF-019'] }, async ({ page }, info) => {
    const conta = await artista(info.workerIndex);
    await entrarComCredenciais(page, conta.email);
    await page.goto('/artista/perfil');

    await page.getByRole('link', { name: ARTISTA_VITRINE.editar }).click();

    await page.waitForURL(/\/artista\/perfil\/editar/);
    await expect(page.getByLabel(ARTISTA_PERFIL.rotuloBio, { exact: true })).toBeVisible();
  });
});
