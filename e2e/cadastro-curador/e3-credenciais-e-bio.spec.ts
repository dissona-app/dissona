import { expect, test } from '@playwright/test';

import {
  anexoDaCredencial,
  limparCredenciais,
  perfilPorEmail,
  reporRascunhoDoCurador,
} from '../apoio/banco';
import { PERSONA } from '../apoio/personas';
import { entrarComo } from '../apoio/sessao';
import { CURADOR_CADASTRO } from '../apoio/textos';

/**
 * E3 · Credenciais e bio — módulo 12, RF-014
 *
 * **Passos**
 * 1. No passo 6, marque credenciais e comprove com link ou anexo.
 * 2. No passo 7, escreva a bio.
 *
 * **Resultado esperado**
 * - Marcar sem comprovar é recusado.
 * - Credencial com link válido é aceita.
 * - O anexo recusa tipo e tamanho fora do permitido.
 * - A bio tem mínimo, e o contador mostra quanto falta.
 *
 * ## O passo 6 é o que define a classe, e é por isso que ele exige prova
 *
 * "O que você comprova aqui define sua classe", diz o subtítulo. Uma credencial
 * marcada e não comprovada seria uma promoção por declaração — e a classificação
 * automática (RF-015) conta exatamente as **comprovadas**.
 *
 * O mínimo de credenciais para Prata **não** aparece no código do teste: vem de
 * `configuracao.classe.prata_min_credenciais`, e a tela o interpola. O que se
 * afirma é a forma da frase, nunca o número.
 */

test.describe.configure({ mode: 'serial' });

/**
 * Duas credenciais **diferentes**, de propósito.
 *
 * O arquivo é serial e a persona é a mesma, então o rascunho acumula: usar a
 * mesma credencial nos dois testes faria o segundo encontrá-la já comprovada
 * pelo primeiro, e "marcar sem comprovar" passaria a marcar e comprovar.
 */
const CREDS_COM_LINK = CURADOR_CADASTRO.credenciais.filter((c) => c.prova === 'link');
const CRED_SEM_PROVA = CREDS_COM_LINK[0];
const CRED_COM_LINK = CREDS_COM_LINK[1];
const CRED_COM_ANEXO = CURADOR_CADASTRO.credenciais.find((c) => c.prova === 'anexo');

// Cada teste parte de zero nas credenciais. Sem isto, o arquivo serial
// acumula: uma credencial marcada sem prova por um teste faz o **seguinte**
// falhar na validação, com a mensagem certa no lugar errado.
test.beforeEach(async () => {
  await limparCredenciais(PERSONA.WIZARD_CREDENCIAIS.email);
  await reporRascunhoDoCurador(PERSONA.WIZARD_CREDENCIAIS.email);
});

test.describe('E3 · Credenciais e bio', { tag: ['@RF-014'] }, () => {
  test('as seis credenciais aparecem, com a dica de prova de cada uma', async ({ page }) => {
    await entrarComo(page, PERSONA.WIZARD_CREDENCIAIS);
    await page.goto('/curador/cadastro/6');

    for (const credencial of CURADOR_CADASTRO.credenciais) {
      await expect(
        page.getByText(credencial.rotulo, { exact: true }),
        `credencial "${credencial.rotulo}"`,
      ).toBeVisible();
    }

    // A contagem e a dica de classe são derivadas de `configuracao`, então o
    // teste afirma a **forma**, e não o número.
    await expect(page.getByText(/\d+ de \d+ necessárias|\d+ comprovadas/)).toBeVisible();
  });

  test('marcar sem comprovar é recusado', async ({ page }) => {
    await entrarComo(page, PERSONA.WIZARD_CREDENCIAIS);
    await page.goto('/curador/cadastro/6');

    await page.getByText(CRED_SEM_PROVA?.rotulo ?? '', { exact: true }).click();
    await page.getByRole('button', { name: CURADOR_CADASTRO.continuar }).click();

    await expect(page.getByText(CURADOR_CADASTRO.erroCredencial)).toBeVisible();
    await expect(page).toHaveURL(/\/curador\/cadastro\/6$/);
  });

  test('credencial com link válido é aceita e avança', async ({ page }) => {
    await entrarComo(page, PERSONA.WIZARD_CREDENCIAIS);
    await page.goto('/curador/cadastro/6');

    await page.getByText(CRED_COM_LINK?.rotulo ?? '', { exact: true }).click();
    await page
      .getByLabel(`${CRED_COM_LINK?.rotulo}: ${CRED_COM_LINK?.dica}`)
      .fill('https://exemplo.test/credencial-e2e');
    await page.getByRole('button', { name: CURADOR_CADASTRO.continuar }).click();

    await page.waitForURL(/\/curador\/cadastro\/7$/);
  });

  /**
   * Os dois limites do anexo, agora recusados **na escolha**.
   *
   * O arquivo sobe do navegador direto ao bucket `materiais` no `onChange`, e a
   * conferência vem antes do upload — então a mensagem aparece sem clicar em
   * "Continuar". Clicar mesmo assim é parte do teste: o arquivo continua no
   * `<input>` quando a conferência falha, de propósito, para o caminho sem
   * JavaScript seguir valendo. O passo não pode avançar por nenhum dos dois.
   *
   * Por que a conferência é do cliente aqui e não é no envio de faixa: lá o
   * bucket declara exatamente os mesmos 50 MB da `configuracao`, então deixar a
   * recusa para o Storage é seguro. Aqui `materiais` permite **20 MB** e aceita
   * `docx` — bem mais frouxo que os 5 MB e os três tipos da aplicação. Sem a
   * conferência, um arquivo que a aplicação vai recusar sobe assim mesmo e,
   * com `upsert` num nome fixo, sobrescreve o certificado válido que já estava
   * no bucket.
   */
  test('o anexo recusa tipo fora do permitido', async ({ page }) => {
    await entrarComo(page, PERSONA.WIZARD_CREDENCIAIS);
    await page.goto('/curador/cadastro/6');

    await page.getByText(CRED_COM_ANEXO?.rotulo ?? '', { exact: true }).click();
    await page.getByLabel(new RegExp(CURADOR_CADASTRO.anexarComprovacao)).setInputFiles({
      name: 'planilha.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('a,b,c'),
    });

    await expect(
      page.getByRole('alert').filter({ hasText: CURADOR_CADASTRO.erroAnexoTipo }),
    ).toBeVisible();

    await page.getByRole('button', { name: CURADOR_CADASTRO.continuar }).click();
    await expect(page, 'anexo de tipo não suportado não pode avançar o passo').toHaveURL(
      /\/curador\/cadastro\/6$/,
    );
  });

  test('o anexo recusa tamanho acima do limite', async ({ page }) => {
    await entrarComo(page, PERSONA.WIZARD_CREDENCIAIS);
    await page.goto('/curador/cadastro/6');

    await page.getByText(CRED_COM_ANEXO?.rotulo ?? '', { exact: true }).click();
    // 6 MB num limite de 5, e um **PDF**: o tipo é conferido antes do tamanho, e
    // um formato recusado faria este teste provar o cenário do anterior. O
    // bucket aceitaria estes 6 MB; quem recusa é a aplicação.
    await page.getByLabel(new RegExp(CURADOR_CADASTRO.anexarComprovacao)).setInputFiles({
      name: 'comprovacao.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(6 * 1024 * 1024)]),
    });

    await expect(
      page.getByRole('alert').filter({ hasText: CURADOR_CADASTRO.erroAnexoTamanho }),
    ).toBeVisible();

    await page.getByRole('button', { name: CURADOR_CADASTRO.continuar }).click();
    await expect(page).toHaveURL(/\/curador\/cadastro\/6$/, { timeout: 60_000 });
  });

  /**
   * O caminho de escrita em `materiais`, que não tinha prova nenhuma.
   *
   * Os dois cenários acima são negativos — eles mostram o que é recusado. Um
   * anexo **válido** nunca foi exercitado, e é justamente o caminho que mudou:
   * o arquivo agora sobe do navegador direto ao bucket, e a Server Action
   * recebe só o caminho.
   *
   * Duas asserções, e as duas importam. A requisição para
   * `/storage/v1/object/materiais/` prova que o upload saiu do navegador — se
   * alguém devolver o arquivo ao corpo da Server Action, o teto de ~4,5 MB da
   * Vercel volta a existir e esta linha é a que denuncia. E o caminho gravado
   * em `credencial_curador.anexo_caminho` prova que ele chegou inteiro do
   * cliente à tabela, sob a pasta da própria pessoa.
   */
  test('anexo válido sobe direto ao Storage e grava o caminho', async ({ page }) => {
    await entrarComo(page, PERSONA.WIZARD_CREDENCIAIS);
    await page.goto('/curador/cadastro/6');

    let subiuAoStorage = false;
    page.on('request', (requisicao) => {
      if (requisicao.url().includes('/storage/v1/object/materiais/')) subiuAoStorage = true;
    });

    await page.getByText(CRED_COM_ANEXO?.rotulo ?? '', { exact: true }).click();
    await page.getByLabel(new RegExp(CURADOR_CADASTRO.anexarComprovacao)).setInputFiles({
      name: 'certificado.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\nsuíte automatizada\n'),
    });

    // O upload acontece na escolha, não no envio: é o que tira os bytes de
    // "Voltar" e "Pular", que submetem o mesmo formulário por `formAction`.
    await expect
      .poll(() => subiuAoStorage, {
        message: 'o anexo tem de subir do navegador, e não pelo corpo da Server Action',
        timeout: 30_000,
      })
      .toBe(true);

    await page.getByRole('button', { name: CURADOR_CADASTRO.continuar }).click();
    await page.waitForURL(/\/curador\/cadastro\/7$/);

    const perfilId = await perfilPorEmail(PERSONA.WIZARD_CREDENCIAIS.email);
    expect(await anexoDaCredencial(PERSONA.WIZARD_CREDENCIAIS.email)).toBe(
      `${perfilId}/formacao.pdf`,
    );
  });

  test('a bio tem mínimo, e o contador mostra quanto falta', async ({ page }) => {
    await entrarComo(page, PERSONA.WIZARD_CREDENCIAIS);
    await page.goto('/curador/cadastro/7');

    await page.getByLabel(CURADOR_CADASTRO.rotuloBio).fill('curta');
    await expect(page.getByText(/faltam \d+ para o mínimo/)).toBeVisible();

    await page.getByRole('button', { name: CURADOR_CADASTRO.continuar }).click();
    await expect(page.getByText(CURADOR_CADASTRO.erroBioCurta)).toBeVisible();

    await page
      .getByLabel(CURADOR_CADASTRO.rotuloBio)
      .fill('Bio da suíte automatizada, com tamanho suficiente para passar do mínimo exigido.');
    await page.getByRole('button', { name: CURADOR_CADASTRO.continuar }).click();

    await page.waitForURL(/\/curador\/cadastro\/8$/);
  });
});
