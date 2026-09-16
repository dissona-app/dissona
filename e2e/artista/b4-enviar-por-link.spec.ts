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
  test('detecta a faixa: capa e título aparecem, e o envio segue', async ({ page }) => {
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
  });

  test('sem detecção, abre o preenchimento manual', async ({ page }) => {
    await entrarComo(page, PERSONA.ARTISTA);
    await page.goto('/artista/enviar');

    await page.getByLabel(ENVIAR.rotuloYoutube, { exact: true }).fill(LINK_INEXISTENTE);
    await page.getByRole('button', { name: ENVIAR.detectar }).click();

    await expect(page.getByText(ENVIAR.naoDetectada)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(ENVIAR.faixaEncontrada)).toHaveCount(0);
    await expect(page.getByLabel(ENVIAR.rotuloTitulo, { exact: true })).toBeEditable();
  });

  test('link de outro serviço é recusado antes de sair para a rede', async ({ page }) => {
    await entrarComo(page, PERSONA.ARTISTA);
    await page.goto('/artista/enviar');

    await page.getByLabel(ENVIAR.rotuloSpotify, { exact: true }).fill('https://soundcloud.com/x/y');
    await page.getByRole('button', { name: ENVIAR.detectar }).click();

    await expect(page.getByText(ENVIAR.erroLinkNaoSuportado)).toBeVisible();
  });
});
