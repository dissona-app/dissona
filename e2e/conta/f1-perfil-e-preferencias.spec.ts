import { expect, test } from '@playwright/test';

import { apagarContaEfemera, criarContaEfemera } from '../apoio/contas';
import type { ContaEfemera } from '../apoio/contas';
import { entrarComCredenciais } from '../apoio/sessao';
import { ARTISTA_PERFIL, CARTAO_SALVO, CONTA, PREFERENCIAS } from '../apoio/textos';

/**
 * F1 · Perfil e preferências — módulos 7 e 17, RF-019, RF-021 e RF-022
 *
 * **Passos**
 * 1. Edite o perfil do artista.
 * 2. Abra as preferências e alterne um canal.
 * 3. Veja o bloco de ativação do papel de curador.
 *
 * **Resultado esperado**
 * - Bio com contador, no máximo três gêneros, links validados.
 * - Preferência salva sozinha; evento crítico não desliga.
 * - "Ativar papel de curador" leva ao wizard do módulo 12.
 *
 * ## Conta descartável, e não a persona `ARTISTA`
 *
 * Estes cenários **escrevem no perfil**: nome artístico, bio, gêneros,
 * preferências de notificação. `e2e_artista` é lida por B1 a B7 e pela suíte de
 * paridade visual; mudar o nome dela aqui mudaria o que aqueles testes veem.
 *
 * ## O evento crítico é o ponto do RF-022
 *
 * "Eventos críticos não desativáveis" não é detalhe de interface: quem desliga
 * o aviso de prazo deixa de saber que vai perder a Clave. A regra é aplicada no
 * envio, por `registrar_notificacao`, e a tela só conta a verdade — o teste
 * garante que ela continue contando.
 */

const descartaveis: ContaEfemera[] = [];

async function artista(indiceDoWorker: number): Promise<ContaEfemera> {
  const conta = await criarContaEfemera({
    rotulo: 'conta',
    indiceDoWorker,
    papeis: ['artista'],
    onboardingVisto: true,
  });
  descartaveis.push(conta);
  return conta;
}

test.afterAll(async () => {
  await Promise.all(descartaveis.map(apagarContaEfemera));
});

test.describe('F1 · Perfil e preferências', () => {
  test(
    'o formulário do perfil traz os campos que o curador vê',
    { tag: ['@RF-019'] },
    async ({ page }, info) => {
      const conta = await artista(info.workerIndex);
      await entrarComCredenciais(page, conta.email);
      await page.goto('/artista/perfil/editar');

      // O `<h1>` da rota é "Editar cadastro"; o painel de dentro é "Seus dados".
      await expect(page.getByRole('heading', { name: ARTISTA_PERFIL.titulo })).toBeVisible();

      for (const rotulo of [
        ARTISTA_PERFIL.rotuloNomeExibicao,
        ARTISTA_PERFIL.rotuloCidade,
        ARTISTA_PERFIL.rotuloHandle,
        ARTISTA_PERFIL.rotuloBio,
      ]) {
        await expect(page.getByLabel(rotulo, { exact: true }), `campo "${rotulo}"`).toBeVisible();
      }

      // Protótipo aprovado: sem nota no rodapé; senha e e-mail ficam fora daqui.
      await expect(page.getByLabel(/senha/i)).toHaveCount(0);
    },
  );

  /**
   * O que este teste aprendeu a não fazer.
   *
   * 1. **Não recarrega antes do sucesso.** `click()` seguido de `reload()` na
   *    linha seguinte aborta o POST da Server Action em voo: a navegação cancela
   *    a requisição, e o perfil nunca é gravado. Espera-se o aviso de sucesso —
   *    que é `role="status"`, e não `alert`, porque `Aviso` reserva `alert` para
   *    erro e alerta.
   * 2. **Não reusa o handle entre execuções.** `e2e_artista_${workerIndex}` é
   *    estável, e uma conta efêmera que escape da limpeza faz o update bater em
   *    `23505` → `CONFLITO/handle`. O sufixo aleatório tira o teste dessa
   *    dependência.
   */
  test('o perfil grava nome, cidade e bio', { tag: ['@RF-019'] }, async ({ page }, info) => {
    const conta = await artista(info.workerIndex);
    await entrarComCredenciais(page, conta.email);
    await page.goto('/artista/perfil/editar');

    const nome = `e2e_Artista ${info.workerIndex}`;
    const handle = `e2e_${Math.random().toString(36).slice(2, 10)}`.slice(0, 30);

    await page.getByLabel(ARTISTA_PERFIL.rotuloNomeExibicao, { exact: true }).fill(nome);
    await page.getByLabel(ARTISTA_PERFIL.rotuloCidade, { exact: true }).fill('São Paulo');
    await page.getByLabel(ARTISTA_PERFIL.rotuloHandle, { exact: true }).fill(handle);
    await page.getByRole('button', { name: ARTISTA_PERFIL.salvar }).click();

    await expect(page.getByRole('status').filter({ hasText: ARTISTA_PERFIL.salvo })).toBeVisible();

    await page.reload();
    await expect(page.getByLabel(ARTISTA_PERFIL.rotuloNomeExibicao, { exact: true })).toHaveValue(
      nome,
    );
    await expect(page.getByLabel(ARTISTA_PERFIL.rotuloCidade, { exact: true })).toHaveValue(
      'São Paulo',
    );
    await expect(page.getByLabel(ARTISTA_PERFIL.rotuloHandle, { exact: true })).toHaveValue(handle);
  });

  test('link inválido é recusado', { tag: ['@RF-019'] }, async ({ page }, info) => {
    const conta = await artista(info.workerIndex);
    await entrarComCredenciais(page, conta.email);
    await page.goto('/artista/perfil/editar');

    await page.getByLabel(ARTISTA_PERFIL.rotuloInstagram, { exact: true }).fill('não é link');
    await page.getByRole('button', { name: ARTISTA_PERFIL.salvar }).click();

    // Continua na tela: um link quebrado no perfil é um link que o curador
    // clica e não abre.
    await expect(page).toHaveURL(/\/artista\/perfil/);
    await expect(page.getByRole('alert').first()).toBeVisible();
  });

  test('a preferência salva sozinha', { tag: ['@RF-022'] }, async ({ page }, info) => {
    const conta = await artista(info.workerIndex);
    await entrarComCredenciais(page, conta.email);
    await page.goto('/artista/conta?aba=preferencias');

    await expect(
      page.getByRole('heading', { name: PREFERENCIAS.notificacoesTitulo }),
    ).toBeVisible();

    // Não há botão Salvar — e a tela diz isso. É o contrato com quem mexe.
    await expect(page.getByText(PREFERENCIAS.salvoAutomaticamente).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^Salvar/ })).toHaveCount(0);
  });

  test('evento crítico não pode ser desligado', { tag: ['@RF-022'] }, async ({ page }, info) => {
    const conta = await artista(info.workerIndex);
    await entrarComCredenciais(page, conta.email);
    await page.goto('/artista/conta?aba=preferencias');

    // Protótipo aprovado: a categoria crítica tem o interruptor ligado e
    // travado — e o nome acessível diz que é "Sempre ativo".
    const prazo = page.getByRole('switch', { name: PREFERENCIAS.categorias.artista[1].titulo });
    await expect(prazo).toHaveAttribute('aria-checked', 'true');
    await expect(prazo).toHaveAttribute('aria-disabled', 'true');
  });

  test('o idioma pode ser trocado', { tag: ['@RF-022'] }, async ({ page }, info) => {
    const conta = await artista(info.workerIndex);
    await entrarComCredenciais(page, conta.email);
    await page.goto('/artista/conta?aba=preferencias');

    const idioma = page.getByLabel(PREFERENCIAS.idiomaTitulo);
    await expect(idioma).toBeVisible();
    await idioma.selectOption('es');
    await expect(idioma).toHaveValue('es');
    await idioma.selectOption('pt-BR');
  });

  /**
   * RF-021 · ativar o papel de curador.
   *
   * O bloco só existe no ambiente do artista e só para quem **ainda não** é
   * curador — mostrar "ative o papel" a quem já o tem seria ruído, e o próprio
   * texto ("os papéis se acumulam") é o que impede a pessoa de criar uma
   * segunda conta.
   */
  test('ativar papel de curador leva ao wizard', { tag: ['@RF-021'] }, async ({ page }, info) => {
    const conta = await artista(info.workerIndex);
    await entrarComCredenciais(page, conta.email);
    await page.goto('/artista/conta?aba=dados');

    await expect(page.getByText(CONTA.papeis.titulo).first()).toBeVisible();
    await expect(page.getByText(CONTA.papeis.texto).first()).toBeVisible();

    // O destino é o wizard do módulo 12 — e a conta ainda não tem o papel, então
    // a guarda a leva ao passo 1 pela rota de seleção de perfil. O que se
    // afirma é sair de Conta rumo ao cadastro, não o número do passo.
    await page.getByRole('link', { name: CONTA.papeis.acao }).click();
    await expect(page).not.toHaveURL(/\/artista\/conta/, { timeout: 30_000 });
  });

  /**
   * ⚠️ RF-020 e RF-026 **não estão implementados**.
   *
   * A tela mostra o aviso de que os blocos financeiros chegam depois, em vez de
   * campos que não gravariam nada. O teste afirma a pendência: é honesto, e
   * vira regressão no dia em que a tela real chegar — se alguém a implementar e
   * esquecer de remover o aviso, este teste falha e diz por quê.
   */
  test(
    'os dados de cobrança mostram o cartão guardado, ou dizem que não há',
    { tag: ['@RF-020'] },
    async ({ page }, info) => {
      const conta = await artista(info.workerIndex);
      await entrarComCredenciais(page, conta.email);
      await page.goto('/artista/conta?aba=dados');

      // Protótipo aprovado: "Dados de cobrança" traz o cartão dentro. A conta
      // nova não tem cartão, e o bloco diz como ele aparece.
      await expect(page.getByText(CONTA.financeiroPendente.artista.titulo).first()).toBeVisible();
      await expect(page.getByText(CARTAO_SALVO.vazioEmConta)).toBeVisible();
    },
  );
});
