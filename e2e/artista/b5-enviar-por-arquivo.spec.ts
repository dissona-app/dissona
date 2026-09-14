import { join } from 'node:path';

import { expect, test } from '@playwright/test';

import { PERSONA } from '../apoio/personas';
import { entrarComo } from '../apoio/sessao';
import { ENVIAR } from '../apoio/textos';

/**
 * B5 · Enviar por arquivo — módulo 3 · 3.2
 *
 * Cenário do [Guia de Testes da R2](../../docs/R2/guia-de-testes-r2.md), que é
 * o gate da release.
 *
 * **Passos**
 * 1. Envie um arquivo (mp3/wav).
 * 1. Preencha os detalhes (título, capa, gênero, data).
 *
 * **Resultado esperado**
 * - Aceita o arquivo e segue para o contexto.
 *
 * O mp3 de teste é um frame MPEG silencioso gerado em `e2e/apoio/arquivos/` —
 * o que importa é ter bytes e o MIME certo, porque a validação do servidor
 * confere o **tipo**, não a extensão do nome.
 */

const MP3 = join(process.cwd(), 'e2e', 'apoio', 'arquivos', 'e2e-faixa.mp3');

test.describe('B5 · Enviar por arquivo', () => {
  test('aceita o mp3 e segue para o contexto', async ({ page }, info) => {
    await entrarComo(page, PERSONA.ARTISTA);
    await page.goto('/artista/enviar');

    await page.getByLabel(/arraste o arquivo|arquivo escolhido/i).setInputFiles(MP3);
    await page
      .getByLabel(ENVIAR.rotuloTitulo, { exact: true })
      .fill(`e2e_Faixa B5 ${info.workerIndex}-${Date.now().toString(36)}`);

    await page.getByRole('button', { name: ENVIAR.continuar }).click();

    // O passo 2 é o destino: a faixa foi criada e o arquivo subiu.
    await page.waitForURL(/\/artista\/enviar\/[0-9a-f-]{36}\/contexto/);
    await expect(page.getByText(ENVIAR.passoDe(2, 3))).toBeVisible();
    await expect(page.getByText(ENVIAR.rotuloContexto).first()).toBeVisible();
  });

  test('recusa formato fora da configuração', async ({ page }) => {
    await entrarComo(page, PERSONA.ARTISTA);
    await page.goto('/artista/enviar');

    // O `accept` do input filtra o seletor, mas não o que chega ao servidor —
    // é a validação de lá que este teste exercita.
    await page.getByLabel(/arraste o arquivo|arquivo escolhido/i).setInputFiles({
      name: 'documento.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4'),
    });
    await page.getByLabel(ENVIAR.rotuloTitulo, { exact: true }).fill('e2e_Formato errado');
    await page.getByRole('button', { name: ENVIAR.continuar }).click();

    await expect(page.getByText(/Formato não aceito/i)).toBeVisible();
  });

  test('sem arquivo, o passo não avança', async ({ page }) => {
    await entrarComo(page, PERSONA.ARTISTA);
    await page.goto('/artista/enviar');

    await page.getByLabel(ENVIAR.rotuloTitulo, { exact: true }).fill('e2e_Sem arquivo');
    await page.getByRole('button', { name: ENVIAR.continuar }).click();

    await expect(page.getByText(ENVIAR.erroArquivoAusente)).toBeVisible();
    await expect(page).toHaveURL(/\/artista\/enviar$/);
  });
});
