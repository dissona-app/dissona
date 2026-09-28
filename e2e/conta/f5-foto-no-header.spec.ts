import { expect, test } from '@playwright/test';

import { clienteDeServico } from '../apoio/banco';
import { apagarContaEfemera, criarContaEfemera } from '../apoio/contas';
import type { ContaEfemera } from '../apoio/contas';
import { entrarComCredenciais } from '../apoio/sessao';

/**
 * F5 · A foto de perfil aparece no header — QA D-087
 *
 * O protótipo desenha iniciais no header porque nele a foto não sobe. Aqui ela
 * sobe, e o header seguia só com iniciais: o QA leu isso como "foto não
 * apresentada". O header vale para os três ambientes (o `Shell` é um só), e o
 * artista é o caminho mais curto até ele com uma conta descartável.
 *
 * A foto é gravada direto em `perfil.foto_caminho`, pelo **id** da conta: o
 * cenário prova o header, e o upload já tem prova própria em F1.
 */

let conta: ContaEfemera | null = null;

test.afterAll(async () => {
  if (conta !== null) await apagarContaEfemera(conta);
});

test(
  'o header mostra a foto de perfil no lugar das iniciais',
  { tag: ['@RF-019'] },
  async ({ page }, info) => {
    conta = await criarContaEfemera({
      rotulo: 'foto_header',
      indiceDoWorker: info.workerIndex,
      papeis: ['artista'],
      onboardingVisto: true,
    });

    const caminho = `${conta.id}/perfil.png`;
    const { error } = await clienteDeServico()
      .from('perfil')
      .update({ foto_caminho: caminho })
      .eq('id', conta.id);
    expect(error).toBeNull();

    await entrarComCredenciais(page, conta.email);
    await page.goto('/artista/perfil');

    const disparador = page.getByRole('button', { name: /^Conta de / });
    await expect(disparador.locator(`img[src*="${caminho}"]`)).toHaveCount(1);
  },
);
