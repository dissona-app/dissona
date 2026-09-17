import { join } from 'node:path';

import { expect, test } from '@playwright/test';

import { PERSONA } from '../apoio/personas';
import { entrarComo } from '../apoio/sessao';
import { ENVIAR } from '../apoio/textos';

/**
 * B4 · Enviar por link — módulo 3 · 3.1
 *
 * Cenário do [Guia de Testes da R2](../../docs/R2/guia-de-testes-r2.md), que é
 * o gate da release.
 *
 * **Passos**
 * 1. Cole um link (Spotify/YouTube).
 * 1. Clique em Detectar faixa.
 *
 * **Resultado esperado**
 * - A faixa é detectada (capa e título aparecem).
 * - Se não detectar, abre o preenchimento manual.
 *
 * ## Depende de rede
 *
 * A detecção lê o oEmbed público do YouTube, do servidor do app. Um vídeo
 * estável e conhecido mantém o título previsível; se o YouTube estiver fora,
 * este é o arquivo que falha — e a mensagem de falha é o próprio aviso de
 * preenchimento manual, que é o comportamento certo para a pessoa.
 */

const MP3 = join(process.cwd(), 'e2e', 'apoio', 'arquivos', 'e2e-faixa.mp3');
const LINK_ESTAVEL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
/** Id com formato válido e nenhum vídeo: o oEmbed responde 400. */
const LINK_INEXISTENTE = 'https://www.youtube.com/watch?v=zzzzzzzzzz0';

test.describe('B4 · Enviar por link', () => {
  test(
    'detecta a faixa: capa e título aparecem, e o envio segue',
    { tag: ['@RF-035'] },
    async ({ page }) => {
      await entrarComo(page, PERSONA.ARTISTA);
      await page.goto('/artista/enviar');

      await page.getByLabel(ENVIAR.rotuloYoutube, { exact: true }).fill(LINK_ESTAVEL);
      await page.getByRole('button', { name: ENVIAR.detectar }).click();

      await expect(page.getByText(ENVIAR.faixaEncontrada)).toBeVisible({ timeout: 15_000 });
      await expect(
        page.getByRole('img', { name: /^Capa de .*Never Gonna Give You Up/ }),
      ).toBeVisible();
      await expect(page.getByLabel(ENVIAR.rotuloTitulo, { exact: true })).toHaveValue(
        /Never Gonna Give You Up/,
      );

      // "Corrigir dados" leva ao título, que continua editável.
      await page.getByRole('button', { name: ENVIAR.corrigirDados }).click();
      await expect(page.getByLabel(ENVIAR.rotuloTitulo, { exact: true })).toBeFocused();
      // Prefixo `e2e_`, como toda faixa que a suíte cria.
      await page
        .getByLabel(ENVIAR.rotuloTitulo, { exact: true })
        .fill(`e2e_Faixa B4 ${Date.now().toString(36)}`);

      // O arquivo segue obrigatório no caminho por link.
      await page.getByLabel(/arraste o arquivo|arquivo escolhido/i).setInputFiles(MP3);
      await page.getByRole('button', { name: ENVIAR.continuar }).click();
      await page.waitForURL(/\/artista\/enviar\/[0-9a-f-]{36}\/contexto/);

      // Voltar ao passo 1 mostra o que foi detectado — ficou gravado.
      const passo1 = page.url().replace(/\/contexto$/, '/faixa');
      await page.goto(passo1);
      await expect(page.getByText(ENVIAR.faixaEncontrada)).toBeVisible();
    },
  );

  test('sem detecção, abre o preenchimento manual', { tag: ['@RF-035'] }, async ({ page }) => {
    await entrarComo(page, PERSONA.ARTISTA);
    await page.goto('/artista/enviar');

    await page.getByLabel(ENVIAR.rotuloYoutube, { exact: true }).fill(LINK_INEXISTENTE);
    await page.getByRole('button', { name: ENVIAR.detectar }).click();

    await expect(page.getByText(ENVIAR.naoDetectada)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(ENVIAR.faixaEncontrada)).toHaveCount(0);
    await expect(page.getByLabel(ENVIAR.rotuloTitulo, { exact: true })).toBeEditable();
  });

  /**
   * RF-037 pede que os dados preenchidos à mão **sejam gravados** — e o teste
   * acima só provava que o formulário abre.
   *
   * A prova é a volta: preencher, avançar, e retornar ao passo 1 pela URL.
   * Se algum campo não fosse persistido, ele voltaria vazio, e é exatamente
   * esse o modo de falha que um "preencheu e avançou" não pegaria — a tela
   * seguinte não mostra estilo nem data de lançamento.
   *
   * O rótulo da data muda conforme a resposta (`rotuloData`), então ele é
   * derivado da mesma função que a tela usa, e não escrito à mão.
   */
  test(
    'o preenchimento manual grava estilo, lançamento e título',
    { tag: ['@RF-037'] },
    async ({ page }) => {
      const titulo = `e2e_Faixa B4 manual ${Date.now().toString(36)}`;
      const ESTILO = 'Indie';
      const DATA = '2025-03-14';

      await entrarComo(page, PERSONA.ARTISTA);
      await page.goto('/artista/enviar');

      await page.getByLabel(ENVIAR.rotuloYoutube, { exact: true }).fill(LINK_INEXISTENTE);
      await page.getByRole('button', { name: ENVIAR.detectar }).click();
      await expect(page.getByText(ENVIAR.naoDetectada)).toBeVisible({ timeout: 15_000 });

      await page.getByLabel(ENVIAR.rotuloTitulo, { exact: true }).fill(titulo);
      await page.getByLabel(ENVIAR.rotuloEstilo, { exact: true }).fill(ESTILO);
      await page.getByText(ENVIAR.lancadaSim, { exact: true }).click();
      await page.getByLabel(ENVIAR.rotuloData(true), { exact: true }).fill(DATA);
      await page.getByLabel(/arraste o arquivo|arquivo escolhido/i).setInputFiles(MP3);

      await page.getByRole('button', { name: ENVIAR.continuar }).click();
      await page.waitForURL(/\/artista\/enviar\/[0-9a-f-]{36}\/contexto/);

      await page.goto(page.url().replace(/\/contexto$/, '/faixa'));

      await expect(page.getByLabel(ENVIAR.rotuloTitulo, { exact: true })).toHaveValue(titulo);
      await expect(page.getByLabel(ENVIAR.rotuloEstilo, { exact: true })).toHaveValue(ESTILO);
      await expect(page.getByLabel(ENVIAR.rotuloData(true), { exact: true })).toHaveValue(DATA);

      // A revisão declara a fonte como "preenchida por você" — é o que distingue
      // este caminho do detectado, e o que o curador vai ver na origem do dado.
      //
      // Passa pelo contexto em vez de ir direto: `podeAbrir` devolve quem tenta
      // alcançar a revisão sem contexto, e é assim que tem de ser (RF-039). Ir
      // por URL aqui testaria a guarda, não a fonte.
      await page.getByRole('button', { name: ENVIAR.continuar }).click();
      await page.waitForURL(/\/contexto$/);
      await page.getByText(ESTILO, { exact: true }).click();
      await page
        .getByRole('textbox', { name: new RegExp(ENVIAR.rotuloContexto) })
        .fill('Faixa da suíte automatizada: preenchimento manual.');
      await page.getByRole('button', { name: ENVIAR.continuar }).click();
      await page.waitForURL(/\/revisao$/);

      await expect(page.getByText(ENVIAR.resumoFonte.manual)).toBeVisible();
    },
  );

  test(
    'link de outro serviço é recusado antes de sair para a rede',
    { tag: ['@RF-035'] },
    async ({ page }) => {
      await entrarComo(page, PERSONA.ARTISTA);
      await page.goto('/artista/enviar');

      await page
        .getByLabel(ENVIAR.rotuloSpotify, { exact: true })
        .fill('https://soundcloud.com/x/y');
      await page.getByRole('button', { name: ENVIAR.detectar }).click();

      await expect(page.getByText(ENVIAR.erroLinkNaoSuportado)).toBeVisible();
    },
  );
});
