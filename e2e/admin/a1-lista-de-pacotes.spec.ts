import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { noAdmin } from '../apoio/admin';
import { PERSONA } from '../apoio/personas';
import { abrirPacotes, entrarComoAdmin } from '../apoio/sessao';
import { ADMIN_PACOTES } from '../apoio/textos';

/**
 * Linhas ativas e inativas, por texto **exato** da etiqueta de status.
 *
 * `filter({ hasText: 'Ativo' })` não serve: `hasText` com string casa
 * substring **e ignora caixa**, então ele encontra "Inativo" também — e a
 * contagem de ativos passa a ser igual ao total. O sintoma foi um resumo
 * "4 de 4 pacotes visíveis" num catálogo de 3 ativos e 4 pacotes, que é
 * justamente o número que a nota de rodapé promete distinguir.
 */
// A lista do protótipo aprovado é uma grade de cartões, um item por pacote.
function grade(page: Page) {
  return page.getByRole('list', { name: ADMIN_PACOTES.titulo });
}

function linhasAtivas(page: Page) {
  return grade(page)
    .getByRole('listitem')
    .filter({ has: page.getByText(ADMIN_PACOTES.statusAtivo, { exact: true }) });
}

function linhasInativas(page: Page) {
  return grade(page)
    .getByRole('listitem')
    .filter({ has: page.getByText(ADMIN_PACOTES.statusInativo, { exact: true }) });
}

/**
 * A1 · Lista de pacotes — módulo 21
 *
 * Cenário do [Guia de Testes da R2](../../docs/R2/guia-de-testes-r2.md), que é
 * o gate da release.
 *
 * **Passos**
 * 1. Abra Pacotes de Claves.
 * 1. Veja a tabela e o status de cada pacote.
 *
 * **Resultado esperado**
 * - Tabela com Nome, Qtd, Valor, Desconto, Preço/Clave e Status.
 * - Ações Editar / Ativar-Desativar / Excluir visíveis.
 *
 * Os pacotes vêm de `supabase/testes/dados-e2e.sql`, com os valores do
 * protótipo. O teste **não** repete esses números: ele confere a estrutura e a
 * coerência entre colunas. Quem afirma a aritmética é
 * `src/modulos/pacote/__testes__/servico.test.ts`, onde ela custa milissegundos
 * em vez de um navegador.
 */
test.describe('A1 · Lista de pacotes', () => {
  test('cada pacote é um cartão com as três ações', { tag: ['@RF-050'] }, async ({ page }) => {
    await abrirPacotes(page);

    const cartoes = grade(page).getByRole('listitem');
    await expect(cartoes.first()).toBeVisible();

    const primeiro = cartoes.first();
    await expect(primeiro).toContainText(ADMIN_PACOTES.colunas.valor);
    await expect(primeiro).toContainText(ADMIN_PACOTES.colunas.porClave);
    await expect(primeiro.getByRole('link', { name: ADMIN_PACOTES.editar })).toBeVisible();
    await expect(
      primeiro.getByRole('button', {
        name: new RegExp(`${ADMIN_PACOTES.ativar}|${ADMIN_PACOTES.desativar}`),
      }),
    ).toBeVisible();
    await expect(
      primeiro.getByRole('button', { name: new RegExp(`^${ADMIN_PACOTES.excluir}:`) }),
    ).toBeVisible();
  });

  test(
    'cada linha diz se o pacote está na Carteira do artista',
    { tag: ['@RF-050'] },
    async ({ page }) => {
      await abrirPacotes(page);

      // A promessa da nota de rodapé — "Só os pacotes ativos aparecem na
      // Carteira do artista" — só é verificável se a linha disser em qual dos
      // dois estados ela está. Status e sublinha têm de concordar: um pacote
      // "Ativo" marcado como "Fora da Carteira" seria a tela mentindo.
      await expect(linhasAtivas(page).first()).toContainText(ADMIN_PACOTES.subNaCarteira);

      const inativas = linhasInativas(page);
      if ((await inativas.count()) > 0) {
        await expect(inativas.first()).toContainText(ADMIN_PACOTES.subForaDaCarteira);
      }

      await expect(page.getByText(ADMIN_PACOTES.nota)).toBeVisible();
    },
  );

  test(
    'o resumo do topo conta os visíveis para o artista',
    { tag: ['@RF-050'] },
    async ({ page }) => {
      await abrirPacotes(page);

      const total = await grade(page).getByRole('listitem').count();
      const ativos = await linhasAtivas(page).count();

      // O texto é recomposto pela mesma função que a tela usa, e os números
      // vêm da própria tabela. Assim o teste afirma a **coerência** entre o
      // resumo e a lista, sem literal nenhum de negócio.
      await expect(page.getByText(ADMIN_PACOTES.resumo(ativos, total))).toBeVisible();
    },
  );

  /**
   * A terceira camada de autorização (architecture.md §5.2), do lado da tela.
   *
   * O papel `suporte` não tem `pacotes` nem para ler. Sem esta checagem, a
   * página renderizaria a lista vazia — porque a RLS devolve zero linhas, sem
   * erro — e o admin de suporte concluiria que não existe pacote nenhum, o que
   * é pior que ser informado de que não tem acesso.
   */
  test('quem não tem o módulo vê a negativa, e não uma lista vazia', async ({ page }) => {
    await entrarComoAdmin(page, PERSONA.ADMIN_SUPORTE);
    await page.goto(noAdmin('/admin/pacotes'));

    await expect(page.getByRole('list', { name: ADMIN_PACOTES.titulo })).toHaveCount(0);
    await expect(page.getByText(/Sem acesso a Pacotes de Claves/i)).toBeVisible();
    await expect(page.getByRole('link', { name: ADMIN_PACOTES.novo })).toHaveCount(0);
  });
});
