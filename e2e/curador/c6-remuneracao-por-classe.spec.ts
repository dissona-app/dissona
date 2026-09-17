import { expect, test } from '@playwright/test';

import {
  abrirAvaliacao,
  abrirPelaFila,
  FAIXA_DA_ATOMICIDADE,
  FAIXA_DO_C6,
  FAIXA_PARA_CONCLUIR,
  irAteARemuneracao,
} from '../apoio/avaliacao';
import {
  envioDaFaixa,
  ganhosDoEnvio,
  lancamentosDoEnvio,
  recuarPrazos,
  rodarDevolucaoPorSLA,
  situacaoDaAvaliacao,
} from '../apoio/banco';
import { PERSONA } from '../apoio/personas';
import { entrarComo } from '../apoio/sessao';
import { AVALIAR } from '../apoio/textos';

/**
 * C6 · Remuneração por classe — módulo 14.4
 *
 * Cenário do [Guia de Testes da R2](../../docs/R2/guia-de-testes-r2.md), que é
 * o gate da release.
 *
 * **Passos**
 * 1. Veja a remuneração por classe e conclua a avaliação.
 *
 * **Resultado esperado**
 * - A escala por classe (Bronze/Prata/Ouro) aparece com os acréscimos.
 * - Concluir libera o crédito.
 *
 * ## Onde cada metade é provada
 *
 * A **tela** é provada aqui: a composição do valor, os quatro acréscimos com
 * seu estado, o piso da classe e o teto.
 *
 * A **transação** — grava o ganho com o percentual certo, fecha o envio e
 * notifica os dois lados — é provada por
 * `supabase/testes/0009_remuneracao.testes.sql`, que chama `enviar_avaliacao`
 * direto e afere `ganho_curador`. É onde ela pode ser aferida sem depender do
 * navegador, e onde o `check` do rateio também é exercitado.
 *
 * O que sobra para o navegador é o **fio**: botão → ação → RPC → estado
 * concluído. É o último teste deste arquivo, e ele **consome** um envio — por
 * isso usa uma faixa própria, que `dados-e2e.sql` repõe.
 *
 * ## A tabela é a do board
 *
 * O cliente respondeu a [#5](../../docs/open-questions.md) em 2026-09-16: vale
 * a tabela do board, e um Bronze no prazo tem piso de **38%**. O primeiro teste
 * afirma esse número na tela — é a decisão, e não um detalhe de layout.
 */
// Os três primeiros compartilham um envio; o último consome o seu.
test.describe.configure({ mode: 'serial' });

test.describe('C6 · Remuneração por classe', () => {
  test(
    'a composição do valor aparece: piso, acréscimos e teto',
    { tag: ['@RF-066'] },
    async ({ page }) => {
      const envioId = await abrirAvaliacao(page, FAIXA_DO_C6);
      await irAteARemuneracao(page, envioId);

      await expect(page.getByRole('heading', { name: AVALIAR.tituloRemuneracao })).toBeVisible();

      // A classe do curador, pelo selo — a persona é Bronze.
      await expect(page.getByText(AVALIAR.suaClasse, { exact: true })).toBeVisible();
      await expect(page.getByText(AVALIAR.classes.bronze, { exact: true })).toBeVisible();

      // O piso, com a legenda de dentro do prazo — e o número que o cliente
      // decidiu: Bronze no prazo é 38%, pela tabela do board (open-questions #5).
      await expect(page.getByText(AVALIAR.pisoNoPrazo)).toBeVisible();
      await expect(page.getByText('38%', { exact: true })).toBeVisible();

      // Os quatro acréscimos do catálogo.
      await expect(page.getByText(AVALIAR.acrescimos.onze_criterios(11))).toBeVisible();
      await expect(page.getByText(/Justificativa de \d+ caracteres/)).toBeVisible();
      await expect(page.getByText(/Feedback com \d+ caracteres/)).toBeVisible();
      await expect(page.getByText(AVALIAR.acrescimos.compartilhou)).toBeVisible();

      // Um teto só desde a `0009b` — o degrau "na avaliação / com
      // compartilhamento" do protótipo não existe na tabela do board.
      await expect(page.getByText(AVALIAR.tetoNota(AVALIAR.classes.bronze, 50))).toBeVisible();
      await expect(page.getByText(/na avaliação e \d+% com/)).toHaveCount(0);
    },
  );

  test('distingue acréscimo cumprido de não cumprido', { tag: ['@RF-066'] }, async ({ page }) => {
    const envioId = await abrirAvaliacao(page, FAIXA_DO_C6);
    await irAteARemuneracao(page, envioId);

    // Cinco dos onze respondidos: "onze critérios" não entra.
    await expect(page.getByText(AVALIAR.detalheCriterios(5, 11))).toBeVisible();
    // Nenhuma justificativa escrita.
    await expect(page.getByText(AVALIAR.detalheJustificativas(0))).toBeVisible();
    // Recusou compartilhar.
    await expect(page.getByText(AVALIAR.detalheSemCompartilhamento)).toBeVisible();

    // O feedback passou de 150, então esse acréscimo entrou — e ao menos um
    // "+N%" precisa aparecer, senão o teste não distinguiria "não cumprido" de
    // "não calculado".
    await expect(page.getByText(/^\+\d+%$/).first()).toBeVisible();
  });

  test(
    '"Você recebe" traz o valor e a base paga pelo artista',
    { tag: ['@RF-066'] },
    async ({ page }) => {
      const envioId = await abrirAvaliacao(page, FAIXA_DO_C6);
      await irAteARemuneracao(page, envioId);

      await expect(page.getByRole('heading', { name: AVALIAR.voceRecebe })).toBeVisible();
      await expect(page.getByText(/^R\$\s?[\d.,]+$/).first()).toBeVisible();
      await expect(page.getByText(/\d+% de R\$\s?[\d.,]+ pagos pelo artista/)).toBeVisible();

      await expect(page.getByRole('button', { name: AVALIAR.concluir })).toBeVisible();
    },
  );

  /**
   * Consome a faixa reservada: concluída, ela sai da fila para sempre —
   * `ganho_curador` não é reescrito nem apagado, e o envio vira `pronto`.
   * `dados-e2e.sql` cria outra sempre que não houver nenhuma pendente.
   */
  test('concluir libera o crédito e fecha a avaliação', { tag: ['@RF-067'] }, async ({ page }) => {
    const envioId = await abrirAvaliacao(page, FAIXA_PARA_CONCLUIR);
    await irAteARemuneracao(page, envioId);

    await page.getByRole('button', { name: AVALIAR.concluir }).click();

    await expect(page.getByText(AVALIAR.concluidaTitulo)).toBeVisible();
    await expect(page.getByText(/Devolutiva enviada\. Crédito de R\$/)).toBeVisible();

    // O botão some: concluída não se reescreve (`avaliacao_concluida_e_final`).
    await expect(page.getByRole('button', { name: AVALIAR.concluir })).toHaveCount(0);

    // E a faixa deixa a fila — o envio virou `pronto`.
    await page.getByRole('link', { name: AVALIAR.voltarParaFila }).click();
    await page.waitForURL('**/curador/fila');
    await expect(page.getByRole('row').filter({ hasText: FAIXA_PARA_CONCLUIR })).toHaveCount(0);
  });

  /**
   * A segunda metade do RF-067: *"se qualquer etapa falha, nada é gravado
   * parcialmente"*.
   *
   * ## A falha é do próprio produto, e não injetada
   *
   * Não há mock a montar nem erro a forçar: existe uma corrida real, e ela é a
   * mais plausível de todas. O curador está na tela da remuneração quando o job
   * de 7 dias devolve o envio. `enviar_avaliacao` recusa com `DS004` — "envio
   * nao esta em avaliacao" —, e o wizard traduz para `AVALIAR.erroSituacao`.
   *
   * Um erro fabricado provaria que a transação aborta quando **aquele** erro
   * acontece. Este prova o que interessa: que a invariante vale contra o
   * concorrente que o sistema de fato tem.
   *
   * ## O que se afirma é o que **não** aconteceu
   *
   * Um "nada foi gravado pela metade" não tem tela. É ausência de linha, e por
   * isso a prova é de banco. O rascunho permanecer não é gravação parcial — ele
   * já existia antes, e é justamente o que o curador esperaria reencontrar.
   */
  test('falha na conclusão não grava nada pela metade', { tag: ['@RF-067'] }, async ({ page }) => {
    const envio = await envioDaFaixa(FAIXA_DA_ATOMICIDADE);
    expect(
      envio,
      `rode supabase/testes/dados-e2e.sql — "${FAIXA_DA_ATOMICIDADE}" sem envio ativo`,
    ).not.toBeNull();

    await entrarComo(page, PERSONA.CURADOR_SLA);
    const envioId = await abrirPelaFila(page, FAIXA_DA_ATOMICIDADE);
    await irAteARemuneracao(page, envioId);

    // O sétimo dia chega enquanto a tela está aberta.
    await recuarPrazos(envioId, { prazo: -24 * 4, devolucao: -1 });
    expect(await rodarDevolucaoPorSLA()).toBeGreaterThanOrEqual(1);

    await page.getByRole('button', { name: AVALIAR.concluir }).click();
    await expect(page.getByText(AVALIAR.erroSituacao)).toBeVisible();

    // Nada de ganho: é o que a transação teria criado se tivesse seguido.
    expect(
      await ganhosDoEnvio(envioId),
      'a conclusão recusada não pode ter criado ganho para o curador',
    ).toHaveLength(0);

    // Nada de crédito no ledger — só a devolução que o job fez.
    const lancamentos = await lancamentosDoEnvio(envioId);
    expect(lancamentos.filter((l) => l.tipo === 'devolucao')).toHaveLength(1);
    expect(
      lancamentos.filter((l) => l.tipo !== 'devolucao' && l.tipo !== 'consumo'),
      'nenhum lançamento além do consumo original e da devolução',
    ).toHaveLength(0);

    // E a avaliação segue em rascunho: o trabalho do curador não sumiu, e
    // também não foi promovido a concluído pela metade.
    expect(await situacaoDaAvaliacao(envioId)).toBe('rascunho');
  });
});
