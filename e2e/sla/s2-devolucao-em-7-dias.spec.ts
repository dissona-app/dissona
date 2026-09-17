import { expect, test } from '@playwright/test';

import {
  envioDaFaixa,
  ganhosDoEnvio,
  lancamentosDoEnvio,
  recuarPrazos,
  rodarDevolucaoPorSLA,
} from '../apoio/banco';
import { PERSONA } from '../apoio/personas';
import { entrarComo } from '../apoio/sessao';
import { CARTEIRA, STATUS_DO_ENVIO } from '../apoio/textos';

/**
 * S2 · Devolução em 7 dias — RF-070
 *
 * **Não** é cenário do [Guia de Testes da R2](../../docs/R2/guia-de-testes-r2.md):
 * é o job de `pg_cron` da seção 10 de `docs/requirements.md`, que estava sem
 * e2e nenhum.
 *
 * **Passos**
 * 1. Adiante o relógio de um envio para além dos 7 dias.
 * 2. Rode o job da devolução.
 *
 * **Resultado esperado**
 * - A faixa sai da fila do curador.
 * - A Clave volta, e o extrato do artista mostra "Devolvidas".
 * - O status do envio mostra a etapa terminal.
 * - **O curador não ganha nada** — a segunda metade do requisito, que nenhuma
 *   tela mostra.
 *
 * ## ⚠️ Este cenário consome a faixa
 *
 * Devolver é terminal: o envio vira `devolvido` e não volta. `dados-e2e.sql`
 * repõe `e2e_Faixa da devolucao` sempre que não houver envio ativo com aquele
 * título — mesma mecânica de `e2e_Faixa para concluir`. Rodar o seed antes da
 * suíte é o que mantém o cenário repetível; sem isso, a falha diz exatamente
 * isso.
 *
 * ## Por que o curador é o `e2e_curador_sla`
 *
 * Porque devolver **tira faixa da fila**, e C1 conta a fila do `e2e_bronze`
 * durante a asserção. Com a mesma conta, esta devolução mudaria a contagem que
 * C1 afirma, no meio do teste dele, e a falha apareceria lá — longe da causa.
 *
 * ## O saldo do artista não é drenado
 *
 * A devolução **devolve** as Claves: o custo líquido do cenário é zero. Por
 * isso ele pode rodar a cada execução sem esvaziar a carteira que B1 e B3 leem.
 */

const FAIXA = 'e2e_Faixa da devolucao';

// O primeiro teste devolve; os seguintes afirmam sobre o que ele fez.
test.describe.configure({ mode: 'serial' });

test.describe('S2 · Devolução em 7 dias', { tag: ['@RF-070'] }, () => {
  test('sem resposta em 7 dias, a Clave volta e a faixa sai da fila', async ({ page, browser }) => {
    const envio = await envioDaFaixa(FAIXA);
    expect(envio, `rode supabase/testes/dados-e2e.sql — "${FAIXA}" sem envio ativo`).not.toBeNull();
    const envioId = envio?.id ?? '';

    // Antes de devolver, a faixa está na fila. Sem esta asserção, um cenário já
    // consumido passaria pelo resto do teste sem provar nada.
    await entrarComo(page, PERSONA.CURADOR_SLA);
    await page.goto('/curador/fila');
    await expect(page.getByRole('row').filter({ hasText: FAIXA })).toHaveCount(1);

    // Prazo vencido há quatro dias e devolução vencida há uma hora: é o estado
    // que o sétimo dia produz.
    await recuarPrazos(envioId, { prazo: -24 * 4, devolucao: -1 });

    const tratados = await rodarDevolucaoPorSLA();
    expect(tratados, 'o job precisa ter devolvido ao menos este envio').toBeGreaterThanOrEqual(1);

    // --- tela do curador: a faixa sai da fila -------------------------------
    await page.reload();
    await expect(
      page.getByRole('row').filter({ hasText: FAIXA }),
      'faixa devolvida não pode continuar na fila de quem não respondeu',
    ).toHaveCount(0);

    // --- tela do artista: extrato e status ---------------------------------
    const contextoDoArtista = await browser.newContext();
    try {
      const paginaDoArtista = await contextoDoArtista.newPage();
      await entrarComo(paginaDoArtista, PERSONA.ARTISTA);

      await paginaDoArtista.goto('/artista/carteira/extrato');
      await expect(
        paginaDoArtista.getByRole('row').filter({ hasText: CARTEIRA.tipos.devolucao }).first(),
        'a devolução precisa aparecer no extrato do artista',
      ).toBeVisible();

      await paginaDoArtista.goto(`/artista/enviar/${envio?.faixaId ?? ''}/status`);
      await expect(
        paginaDoArtista.getByRole('row').filter({ hasText: STATUS_DO_ENVIO.etapas.devolvido }),
        'o status do envio precisa mostrar a etapa terminal',
      ).toHaveCount(1);
    } finally {
      await contextoDoArtista.close();
    }

    // --- o que nenhuma tela mostra -----------------------------------------
    //
    // "O crédito devolvido **não** entra como ganho" é metade do RF-070, e é
    // ausência de linha: não há interface que a exiba, nem na R2 nem depois.
    expect(
      await ganhosDoEnvio(envioId),
      'devolução por falta de resposta não pode gerar ganho para o curador',
    ).toHaveLength(0);

    const lancamentos = await lancamentosDoEnvio(envioId);
    const devolucoes = lancamentos.filter((l) => l.tipo === 'devolucao');

    // Exatamente uma, e não "ao menos uma": o índice único parcial
    // `(envio_id) where tipo = 'devolucao'` é a defesa que não depende de o job
    // estar correto, e este teste é o que prova que ela vale na prática.
    expect(devolucoes, 'uma devolução por envio, nem mais nem menos').toHaveLength(1);
    expect(devolucoes[0]?.quantidade).toBe(envio?.totalClaves);
  });

  test('o envio devolvido não volta a ser avaliável', async () => {
    const envio = await envioDaFaixa(FAIXA);

    // `envioDaFaixa` devolve o envio mais recente da faixa; depois da devolução
    // ele é o devolvido, e é isso que se afirma.
    expect(envio?.situacao).toBe('devolvido');
  });

  /**
   * Rodar o job de novo é inofensivo.
   *
   * Não é preciosismo: o `pg_cron` roda de hora em hora e a suíte pode rodar
   * junto. O que garante a segurança é o `where situacao in (...)` da RPC, que
   * já não alcança o envio devolvido — e o índice único, caso alcançasse.
   */
  test('rodar o job de novo não devolve duas vezes', async () => {
    const envio = await envioDaFaixa(FAIXA);
    await rodarDevolucaoPorSLA();

    const devolucoes = (await lancamentosDoEnvio(envio?.id ?? '')).filter(
      (l) => l.tipo === 'devolucao',
    );
    expect(devolucoes).toHaveLength(1);
  });
});
