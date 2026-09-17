import { join } from 'node:path';

import { expect, test } from '@playwright/test';

import { mp3DeTamanho } from '../apoio/arquivos';
import { limiteDeUploadMb } from '../apoio/banco';
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
  test('aceita o mp3 e segue para o contexto', { tag: ['@RF-036'] }, async ({ page }, info) => {
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

  test('recusa formato fora da configuração', { tag: ['@RF-036'] }, async ({ page }) => {
    await entrarComo(page, PERSONA.ARTISTA);
    await page.goto('/artista/enviar');

    // O `accept` do input filtra o seletor e nada mais. Quem recusa é o
    // `allowed_mime_types` do bucket `faixas` — e, no caminho sem JavaScript,
    // `validarAudio`. Os dois produzem a mesma mensagem.
    await page.getByLabel(/arraste o arquivo|arquivo escolhido/i).setInputFiles({
      name: 'documento.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4'),
    });
    await page.getByLabel(ENVIAR.rotuloTitulo, { exact: true }).fill('e2e_Formato errado');
    await page.getByRole('button', { name: ENVIAR.continuar }).click();

    await expect(page.getByText(/Formato não aceito/i)).toBeVisible();
  });

  test('sem arquivo, o passo não avança', { tag: ['@RF-036'] }, async ({ page }) => {
    await entrarComo(page, PERSONA.ARTISTA);
    await page.goto('/artista/enviar');

    await page.getByLabel(ENVIAR.rotuloTitulo, { exact: true }).fill('e2e_Sem arquivo');
    await page.getByRole('button', { name: ENVIAR.continuar }).click();

    await expect(page.getByText(ENVIAR.erroArquivoAusente)).toBeVisible();
    await expect(page).toHaveURL(/\/artista\/enviar$/);
  });

  /**
   * Regressão do bug que este cenário deixava passar.
   *
   * A suíte não o pegava porque o `e2e-faixa.mp3` versionado tem 16 KB — e
   * qualquer mp3 de verdade (quatro minutos a 192 kbps dão ~5,7 MB) morria no
   * caminho. Este teste usa um arquivo de tamanho realista.
   *
   * Desde RF-036 o arquivo vai do navegador **direto ao Storage** e a Server
   * Action recebe só o caminho, então os 6 MB nem passam pelo servidor Next.
   * É o que este teste protege: se alguém devolver o `multipart` ao caminho de
   * escrita, o teto da Vercel volta a existir e ele falha.
   *
   * ⚠️ O que nenhum teste local alcança é provar o motivo da mudança: para
   * isso é preciso subir um arquivo **acima de 4,5 MB no Preview da Vercel**.
   */
  test(
    'aceita um mp3 de tamanho realista, e não só o de 16 KB',
    { tag: ['@RF-036'] },
    async ({ page }, info) => {
      test.setTimeout(120_000);

      await entrarComo(page, PERSONA.ARTISTA);
      await page.goto('/artista/enviar');

      await page.getByLabel(/arraste o arquivo|arquivo escolhido/i).setInputFiles(mp3DeTamanho(6));
      await page
        .getByLabel(ENVIAR.rotuloTitulo, { exact: true })
        .fill(`e2e_Faixa B5 6MB ${info.workerIndex}-${Date.now().toString(36)}`);

      await page.getByRole('button', { name: ENVIAR.continuar }).click();

      await page.waitForURL(/\/artista\/enviar\/[0-9a-f-]{36}\/contexto/, { timeout: 60_000 });
    },
  );

  /**
   * O limite, recusado fora do navegador.
   *
   * O número vem de `configuracao.upload.tamanho_max_mb`, nunca escrito aqui —
   * é a regra da casa, e também o que faz o teste continuar certo no dia em que
   * o cliente mudar o limite.
   *
   * Que quem recusa não é o cliente não é suposição: `FormularioDaFaixa.tsx`
   * apenas **traduz** os motivos `ausente|formato|tamanho`, e não há checagem
   * de tamanho no navegador — a recusa vem do `file_size_limit` do bucket
   * `faixas` (`0000_storage.sql`) ou de `validarAudioNoStorage`. O reforço é
   * observar que houve POST antes do erro: se alguém acrescentar uma guarda no
   * navegador, o teste passa a mentir, e esta asserção é o que denuncia.
   */
  test(
    'recusa fora do navegador o arquivo acima do limite',
    { tag: ['@RF-036'] },
    async ({ page }, info) => {
      test.setTimeout(180_000);

      const limite = await limiteDeUploadMb();

      await entrarComo(page, PERSONA.ARTISTA);
      await page.goto('/artista/enviar');

      let houvePost = false;
      page.on('request', (requisicao) => {
        if (requisicao.method() === 'POST') houvePost = true;
      });

      await page
        .getByLabel(/arraste o arquivo|arquivo escolhido/i)
        .setInputFiles(mp3DeTamanho(limite + 1));
      await page
        .getByLabel(ENVIAR.rotuloTitulo, { exact: true })
        .fill(`e2e_Faixa B5 grande ${info.workerIndex}-${Date.now().toString(36)}`);

      await page.getByRole('button', { name: ENVIAR.continuar }).click();

      await expect(page.getByText(ENVIAR.erroArquivoTamanho(limite))).toBeVisible({
        timeout: 120_000,
      });
      await expect(page).toHaveURL(/\/artista\/enviar$/);

      expect(
        houvePost,
        'a recusa tem de vir do Storage — se o cliente barrar antes, este teste deixa de provar o requisito',
      ).toBe(true);
    },
  );
});
