import { expect, test } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';

import { telaDoAdmin, URL_ADMIN } from '../apoio/admin';
import { auditoriaDe, pacotePorNome } from '../apoio/banco';
import { nomeUnico } from '../apoio/personas';
import { abrirPacotes } from '../apoio/sessao';
import { ADMIN_PACOTE_EXCLUIR, ADMIN_PACOTE_FORMULARIO, ADMIN_PACOTES } from '../apoio/textos';

/**
 * A3 · Editar / ativar / excluir — módulo 21.1
 *
 * Cenário do [Guia de Testes da R2](../../docs/R2/guia-de-testes-r2.md), que é
 * o gate da release.
 *
 * **Passos**
 * 1. Edite um pacote.
 * 1. Ative/Desative um pacote.
 * 1. Exclua um pacote (com confirmação).
 *
 * **Resultado esperado**
 * - As ações funcionam e refletem na lista.
 * - Só os pacotes ativos aparecem para o artista.
 *
 * Cada teste **cria o seu próprio pacote**, em vez de mexer nos quatro do
 * catálogo. Duas razões: o projeto Supabase é compartilhado com Preview e
 * Production (open-questions #25), e desativar "Repertório" numa execução de
 * teste o tiraria da Carteira de verdade; e `fullyParallel` faria dois workers
 * disputarem a mesma linha.
 *
 * A última afirmação do cenário — "só os pacotes ativos aparecem **para o
 * artista**" — é feita aqui pelo que a tela do admin declara ("Fora da
 * Carteira" / "Inativo"). A verificação do outro lado, na Carteira do artista,
 * entra com a tela 5 na fatia 9; a garantia de fundo é a policy da `0007`, que
 * já tem prova em `supabase/testes/0007b_pacote_exclusao.testes.sql`.
 */

/** Cria um pacote pela própria tela e devolve o nome. */
async function criarPacote(page: Page, info: TestInfo, rotulo: string): Promise<string> {
  const nome = nomeUnico(rotulo, info.workerIndex);

  await page.getByRole('link', { name: ADMIN_PACOTES.novo }).click();
  await page.getByLabel(ADMIN_PACOTE_FORMULARIO.rotuloNome).fill(nome);
  await page.getByLabel(ADMIN_PACOTE_FORMULARIO.rotuloQuantidade).fill('20');
  await page.getByLabel(ADMIN_PACOTE_FORMULARIO.rotuloDesconto).fill('5');
  await page.getByRole('button', { name: ADMIN_PACOTE_FORMULARIO.salvar }).click();

  // Espera a volta para a lista **antes** de procurar a linha. Sem isso, um
  // salvamento lento faz a busca acontecer ainda no formulário, e a falha diz
  // "linha não encontrada" quando o que houve foi espera insuficiente.
  await page.waitForURL(telaDoAdmin('/pacotes'));
  await expect(page.getByRole('row').filter({ hasText: nome })).toBeVisible();
  return nome;
}

test.describe('A3 · Editar / ativar / excluir', () => {
  test('editar reflete na lista', { tag: ['@RF-051'] }, async ({ page }, info) => {
    await abrirPacotes(page);
    const nome = await criarPacote(page, info, 'A3 editar');

    await page
      .getByRole('row')
      .filter({ hasText: nome })
      .getByRole('link', { name: ADMIN_PACOTES.editar })
      .click();

    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      ADMIN_PACOTE_FORMULARIO.tituloEditar,
    );

    // O formulário abre com o que está gravado — 20 Claves, 5% de desconto,
    // R$ 190. Sem isto, "editar" seria "criar de novo".
    await expect(page.getByLabel(ADMIN_PACOTE_FORMULARIO.rotuloNome)).toHaveValue(nome);
    await expect(page.getByLabel(ADMIN_PACOTE_FORMULARIO.rotuloQuantidade)).toHaveValue('20');
    await expect(page.getByLabel(ADMIN_PACOTE_FORMULARIO.rotuloValor)).toHaveValue('190,00');

    await page.getByLabel(ADMIN_PACOTE_FORMULARIO.rotuloDesconto).fill('20');
    await page.getByRole('button', { name: ADMIN_PACOTE_FORMULARIO.salvar }).click();

    await expect(page.getByText(ADMIN_PACOTE_FORMULARIO.flashAtualizado)).toBeVisible();

    const linha = page.getByRole('row').filter({ hasText: nome });
    // 20 Claves × R$ 10 = R$ 200, menos 20% = R$ 160, ou R$ 8,00 por Clave.
    await expect(linha).toContainText('20%');
    await expect(linha).toContainText('8,00');
  });

  test(
    'desativar tira da Carteira e ativar devolve',
    { tag: ['@RF-052'] },
    async ({ page }, info) => {
      await abrirPacotes(page);
      const nome = await criarPacote(page, info, 'A3 alternar');

      const linha = page.getByRole('row').filter({ hasText: nome });
      await expect(linha).toContainText(ADMIN_PACOTES.statusAtivo);

      await linha.getByRole('button', { name: ADMIN_PACOTES.desativar }).click();

      await expect(page.getByText(ADMIN_PACOTES.flashDesativado(nome))).toBeVisible();
      await expect(linha).toContainText(ADMIN_PACOTES.statusInativo);
      // A promessa da nota de rodapé, do lado do admin: o pacote continua na
      // lista da equipe e sai da Carteira do artista.
      await expect(linha).toContainText(ADMIN_PACOTES.subForaDaCarteira);

      await linha.getByRole('button', { name: ADMIN_PACOTES.ativar }).click();

      await expect(page.getByText(ADMIN_PACOTES.flashAtivado(nome))).toBeVisible();
      await expect(linha).toContainText(ADMIN_PACOTES.statusAtivo);
      await expect(linha).toContainText(ADMIN_PACOTES.subNaCarteira);
    },
  );

  test(
    'excluir exige confirmação e some da lista',
    { tag: ['@RF-053'] },
    async ({ page }, info) => {
      await abrirPacotes(page);
      const nome = await criarPacote(page, info, 'A3 excluir');

      const linha = page.getByRole('row').filter({ hasText: nome });
      await linha.getByRole('button', { name: new RegExp(`^${ADMIN_PACOTES.excluir}:`) }).click();

      const dialogo = page.getByRole('dialog');
      await expect(dialogo).toBeVisible();
      // O diálogo nomeia o que vai sair, com a quantidade: "e2e_… · 20 Claves".
      await expect(dialogo).toContainText(nome);
      await expect(dialogo).toContainText(ADMIN_PACOTE_EXCLUIR.texto);

      // Cancelar não apaga. É metade do "com confirmação" do cenário, e a metade
      // que costuma faltar em teste.
      await dialogo.getByRole('button', { name: ADMIN_PACOTE_EXCLUIR.cancelar }).click();
      await expect(dialogo).toHaveCount(0);
      await expect(linha).toBeVisible();

      await linha.getByRole('button', { name: new RegExp(`^${ADMIN_PACOTES.excluir}:`) }).click();
      await page
        .getByRole('dialog')
        .getByRole('button', { name: ADMIN_PACOTE_EXCLUIR.confirmar })
        .click();

      await expect(page.getByText(ADMIN_PACOTES.flashExcluido(nome))).toBeVisible();
      // Excluído sai da lista do admin — é o que o distingue de desativado, que
      // continua listado como "Inativo". A `0007b` é que sustenta a diferença.
      await expect(page.getByRole('row').filter({ hasText: nome })).toHaveCount(0);
    },
  );

  /**
   * Exclusão é irreversível, e o teste prova pelo caminho do usuário.
   *
   * O trigger `pacote_clave_exclusao_irreversivel` (`0007c`, `DS014`) recusa
   * zerar `excluido_em`. Aqui a afirmação é a consequência visível: a URL do
   * pacote excluído deixa de resolver, então não há tela por onde reativá-lo.
   */
  test(
    'pacote excluído não tem mais tela de edição',
    { tag: ['@RF-053'] },
    async ({ page }, info) => {
      await abrirPacotes(page);
      const nome = await criarPacote(page, info, 'A3 sumido');

      const linha = page.getByRole('row').filter({ hasText: nome });
      const url = await linha
        .getByRole('link', { name: ADMIN_PACOTES.editar })
        .getAttribute('href');
      expect(url).not.toBeNull();

      await linha.getByRole('button', { name: new RegExp(`^${ADMIN_PACOTES.excluir}:`) }).click();
      await page
        .getByRole('dialog')
        .getByRole('button', { name: ADMIN_PACOTE_EXCLUIR.confirmar })
        .click();
      await expect(page.getByText(ADMIN_PACOTES.flashExcluido(nome))).toBeVisible();

      // O `href` é o caminho limpo do subdomínio; relativo, ele resolveria
      // contra o host principal e o 404 viria por motivo errado.
      await page.goto(`${URL_ADMIN}${url ?? '/pacotes'}`);

      // A tela de não encontrado, e nenhum formulário de edição. O status HTTP
      // não serve de prova aqui: com o `loading.tsx` do painel a resposta já
      // começou (200) quando o `notFound()` dispara, e o Next entrega o 404
      // dentro do stream — com `noindex` — em vez de trocar o status.
      await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
      await expect(page.getByRole('button', { name: ADMIN_PACOTE_FORMULARIO.salvar })).toHaveCount(
        0,
      );
    },
  );

  /**
   * *"…e a exclusão é registrada em log"* — a última cláusula do RF-053.
   *
   * O que se espera **não** é uma linha `delete`: a exclusão é lógica desde a
   * `0007b`, porque `pedido_clave` referencia o pacote e compras já feitas
   * continuam válidas. O rastro é um `update` com `excluido_em` preenchido, e
   * escrever o teste esperando `delete` seria escrever o teste do modelo
   * errado.
   *
   * O mesmo cenário cobre o RF-052: ativar e desativar também têm de deixar
   * rastro, e os dois são `update` — distinguidos pelo que mudou em `depois`.
   */
  test(
    'desativar e excluir deixam rastro no log',
    { tag: ['@RF-052', '@RF-053'] },
    async ({ page }, info) => {
      await abrirPacotes(page);
      const nome = await criarPacote(page, info, 'A3 log');

      const pacoteId = await pacotePorNome(nome);
      expect(pacoteId, `o pacote "${nome}" precisa existir no banco`).not.toBeNull();

      const linha = page.getByRole('row').filter({ hasText: nome });
      await linha.getByRole('button', { name: ADMIN_PACOTES.desativar }).click();
      await expect(page.getByText(ADMIN_PACOTES.flashDesativado(nome))).toBeVisible();

      await linha.getByRole('button', { name: new RegExp(`^${ADMIN_PACOTES.excluir}:`) }).click();
      await page
        .getByRole('dialog')
        .getByRole('button', { name: ADMIN_PACOTE_EXCLUIR.confirmar })
        .click();
      await expect(page.getByText(ADMIN_PACOTES.flashExcluido(nome))).toBeVisible();

      const rastro = await auditoriaDe('pacote_clave', pacoteId ?? '');

      expect(
        rastro.some((l) => l.acao === 'update' && l.depois?.['ativo'] === false),
        'desativar tem de deixar um `update` com ativo = false',
      ).toBe(true);

      expect(
        rastro.some((l) => l.acao === 'update' && l.depois?.['excluido_em'] !== null),
        'excluir tem de deixar um `update` com excluido_em preenchido — a exclusão é lógica',
      ).toBe(true);

      expect(
        rastro.some((l) => l.acao === 'delete'),
        'não pode haver `delete`: pedido_clave referencia o pacote',
      ).toBe(false);
    },
  );
});
