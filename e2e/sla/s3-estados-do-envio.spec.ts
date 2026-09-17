import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { avancar, escolherModalidade, preencherObrigatorios } from '../apoio/avaliacao';
import { envioDaFaixa, garantirAudioDaFaixa } from '../apoio/banco';
import { PERSONA } from '../apoio/personas';
import { entrarComo } from '../apoio/sessao';
import { AVALIAR, FILA, STATUS_DO_ENVIO } from '../apoio/textos';

/**
 * S3 · Estados do envio — RF-071
 *
 * O ciclo do envio percorrido numa faixa só, com os dois atores ao mesmo tempo:
 * o curador age, o artista vê em 3.3. Cada estado sozinho já é afirmado por
 * outro cenário; a **sequência** não era por nenhum, e é ela que o requisito
 * descreve.
 *
 * **Não** é cenário do [Guia de Testes da R2](../../docs/R2/guia-de-testes-r2.md).
 *
 * ## Os quatro estados, e o que os destravou
 *
 * RF-071 pede `Recebeu → Ouviu → Avaliando → Pronto`. Até o player existir só
 * dentro do wizard, `ouviu` era inalcançável: chegar ao wizard é clicar em
 * "Iniciar avaliação", que grava `avaliando` (`iniciarAvaliacao`, em
 * `src/modulos/fila/repositorio.ts`), e `marcarEnvioComoOuvido` só age sobre
 * `recebeu` — de propósito, para o estado não andar para trás.
 *
 * O `PlayerComMedicao` agora é montado também na **13.1**, o detalhe do item.
 * O curador ouve antes de assumir a avaliação, que é o que o nome do estado
 * sempre disse. Nenhum estado é forçado por `banco.ts`: cada um vem do gesto
 * que o produz.
 *
 * ## A escuta é real, e é por isso que este arquivo é diferente
 *
 * Os outros cenários semeiam `escuta_percentual = 100`, porque o que eles
 * precisam é do rascunho. Aqui a escuta é o objeto do teste: o áudio vai mesmo
 * para o Storage (`garantirAudioDaFaixa`) e o player toca. Funciona porque
 * `e2e-faixa.mp3` tem cerca de **um segundo** — a faixa inteira cabe no tempo de
 * um teste, e o `MedidorDeEscuta`, que credita intervalos percorridos
 * **tocando**, chega a 100% sozinho. Adiantar a agulha não contaria, e é
 * justamente essa a regra que se quer preservada.
 *
 * ## ⚠️ Consome a faixa
 *
 * Termina em `pronto`, que é terminal. `dados-e2e.sql` repõe
 * `e2e_Faixa dos estados` quando não há envio ativo com esse título.
 */

const FAIXA = 'e2e_Faixa dos estados';

/** A etapa que a tela 3.3 mostra para a faixa, na visão do artista. */
async function etapaNoStatus(pagina: Page, faixaId: string): Promise<string> {
  await pagina.goto(`/artista/enviar/${faixaId}/status`);
  const linha = pagina.getByRole('table').getByRole('row').nth(1);
  return (await linha.innerText()).replace(/\s+/g, ' ');
}

// O ciclo inteiro numa faixa, com dois contextos e uma escuta de verdade.
test.describe.configure({ timeout: 180_000 });

test.describe('S3 · Estados do envio', { tag: ['@RF-071'] }, () => {
  test('o envio percorre Recebeu → Ouviu → Avaliando → Pronto, e o artista acompanha', async ({
    page,
    browser,
  }) => {
    const envio = await envioDaFaixa(FAIXA);
    expect(envio, `rode supabase/testes/dados-e2e.sql — "${FAIXA}" sem envio ativo`).not.toBeNull();
    expect(envio?.situacao, 'o cenário começa em "recebeu"').toBe('recebeu');
    const faixaId = envio?.faixaId ?? '';

    await garantirAudioDaFaixa(FAIXA);

    const contextoDoArtista = await browser.newContext();
    try {
      const artista = await contextoDoArtista.newPage();
      await entrarComo(artista, PERSONA.ARTISTA);

      // --- Recebeu ---------------------------------------------------------
      expect(await etapaNoStatus(artista, faixaId)).toContain(STATUS_DO_ENVIO.etapas.recebeu);

      // --- Ouviu -----------------------------------------------------------
      // O player da 13.1: o curador ouve antes de assumir. Um clique é o gesto
      // que a política de autoplay do Chromium exige — sem ele, `play()` é
      // recusado em silêncio.
      await entrarComo(page, PERSONA.CURADOR_SLA);
      await page.goto('/curador/fila');
      await page.getByRole('row').filter({ hasText: FAIXA }).getByRole('link').first().click();
      await page.getByRole('button', { name: /^Tocar / }).click();

      await expect
        .poll(async () => (await envioDaFaixa(FAIXA))?.situacao, {
          message: 'a escuta medida na 13.1 precisa carimbar o envio como "ouviu"',
          timeout: 30_000,
        })
        .toBe('ouviu');
      expect(await etapaNoStatus(artista, faixaId)).toContain(STATUS_DO_ENVIO.etapas.ouviu);

      // O carimbo **é** a prova de que a medição chegou ao banco:
      // `marcarEnvioComoOuvido` só roda depois de `registrarEscuta`, e só quando
      // o percentual passou de `escuta_minima_percentual`. Uma segunda leitura
      // de `avaliacao.escuta_percentual` não acrescentaria nada e daria mais
      // uma ida à rede para falhar.

      // --- Avaliando -------------------------------------------------------
      await page.getByRole('button', { name: FILA.iniciarAvaliacao }).click();
      await page.waitForURL(/\/curador\/avaliar\/[0-9a-f-]+\/[a-z]+$/);
      const envioId = new URL(page.url()).pathname.split('/')[3] ?? '';

      expect((await envioDaFaixa(FAIXA))?.situacao).toBe('avaliando');
      expect(await etapaNoStatus(artista, faixaId)).toContain(STATUS_DO_ENVIO.etapas.avaliando);

      // --- Pronto ----------------------------------------------------------
      await page.goto(`/curador/avaliar/${envioId}/notas`);
      await preencherObrigatorios(page);
      await avancar(page);

      await page.waitForURL(`**/curador/avaliar/${envioId}/subjetiva`);
      await page.getByLabel(AVALIAR.feedback).fill('Devolutiva da suíte automatizada. '.repeat(8));
      await avancar(page);

      await page.waitForURL(`**/curador/avaliar/${envioId}/compartilhamento`);
      await escolherModalidade(page, AVALIAR.modalidades.nao_compartilhou.rotulo);
      await avancar(page);

      await page.waitForURL(`**/curador/avaliar/${envioId}/remuneracao`);
      await page.getByRole('button', { name: AVALIAR.concluir }).click();

      await expect
        .poll(async () => (await envioDaFaixa(FAIXA))?.situacao, { timeout: 30_000 })
        .toBe('pronto');

      expect(await etapaNoStatus(artista, faixaId)).toContain(STATUS_DO_ENVIO.etapas.pronto);
    } finally {
      await contextoDoArtista.close();
    }
  });
});
