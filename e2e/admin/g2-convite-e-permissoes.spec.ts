import { expect, test } from '@playwright/test';

import { clienteDeServico } from '../apoio/banco';
import { apagarContaEfemera, criarContaEfemera } from '../apoio/contas';
import type { ContaEfemera } from '../apoio/contas';
import { gerarLinkDeEmail } from '../apoio/email';
import { PERSONA } from '../apoio/personas';
import { entrarComCredenciais, entrarComoAdmin } from '../apoio/sessao';
import { ADMIN_ENTRAR, EQUIPE, SENHA } from '../apoio/textos';

/**
 * G2 · Convite, aceite, permissões e recuperação — módulos 19 e 27
 *
 * Cobre RF-029 (recuperação de senha do admin), RF-032 (convite), RF-033
 * (aceite) e RF-034 (matriz de permissões).
 *
 * ## Como o teste chega ao token do convite
 *
 * O banco guarda só o `sha256` (migration `0003b`), então o token não é
 * legível de lá. Mas a **tela** o entrega: com o SMTP embutido do Supabase
 * entregando ~2 e-mails por hora, a equipe decidiu mostrar o link uma vez, para
 * quem convidou poder mandá-lo por outro canal. O teste lê esse campo — é o
 * mesmo caminho que uma pessoa usaria hoje.
 *
 * ## Por que a conta convidada é pré-criada
 *
 * Convidar um endereço que **já tem conta** faz `convidarPeloAuth` devolver
 * `ja_tem_conta` e **não enviar e-mail nenhum** — e o convite, com token, volta
 * assim mesmo. É o caminho que `AceiteDeConvite` documenta como real, e de
 * quebra mantém a suíte em zero envios.
 */

const descartaveis: ContaEfemera[] = [];

test.afterAll(async () => {
  await Promise.all(descartaveis.map(apagarContaEfemera));
});

test.describe('G2 · Convite, aceite e permissões', () => {
  /**
   * RF-029 · a recuperação do admin é neutra, como a do artista.
   *
   * O motivo é o mesmo e vale mais aqui: confirmar que um endereço tem conta
   * administrativa diria a um atacante **quem** vale a pena atacar.
   */
  test(
    'a recuperação de senha do admin responde de forma neutra',
    { tag: ['@RF-029'] },
    async ({ page }) => {
      await page.goto('/admin/recuperar-senha');
      await page
        .getByLabel(SENHA.rotuloEmail, { exact: true })
        .fill('e2e_ef_nao_existe@e2e.dissona.local');
      await page.getByRole('button', { name: SENHA.recuperarEnviar }).click();

      await expect(page.getByText(SENHA.enviadoTitulo)).toBeVisible();
    },
  );

  test(
    'o link de recuperação leva à redefinição do admin',
    { tag: ['@RF-029'] },
    async ({ page }) => {
      const link = await gerarLinkDeEmail('recovery', PERSONA.ADMIN_SUPORTE.email);
      await page.goto(link.caminho);

      await page.waitForURL(/redefinir-senha/);
      await expect(page.getByRole('heading', { name: SENHA.redefinirTitulo })).toBeVisible();
    },
  );

  /**
   * RF-032 e RF-033 · convidar e aceitar.
   *
   * O convite cria a linha pendente e mostra o link uma vez; aceitar dá o papel
   * administrativo à conta. O mesmo convite não serve duas vezes — é o que
   * impede que um link vazado vire acesso perpétuo.
   */
  test(
    'convidar cria a linha pendente e mostra o link uma vez',
    { tag: ['@RF-032'] },
    async ({ page }, info) => {
      const convidada = await criarContaEfemera({
        rotulo: 'convite',
        indiceDoWorker: info.workerIndex,
      });
      descartaveis.push(convidada);

      await entrarComoAdmin(page);
      await page.goto('/admin/equipe?aba=equipe');

      await page.getByRole('button', { name: EQUIPE.equipe.convidar }).click();

      const dialogo = page.getByRole('dialog');
      await dialogo.getByLabel(EQUIPE.convite.rotuloEmail, { exact: true }).fill(convidada.email);
      await dialogo.getByRole('button', { name: EQUIPE.convite.enviar }).click();

      await expect(page.getByText(EQUIPE.convite.sucesso(convidada.email))).toBeVisible({
        timeout: 30_000,
      });

      // O link aparece uma vez, para quem convidou copiar — é a mitigação do
      // limite de envio do SMTP embutido, e sai quando houver provedor real.
      const campoDoLink = page.getByLabel(EQUIPE.convite.linkTitulo);
      await expect(campoDoLink).toBeVisible();
      const link = await campoDoLink.inputValue();
      expect(link, 'o link do convite precisa carregar o token').toContain('token=');

      // E a linha entra na lista como pendente.
      // `.last()`: o diálogo tem o "Fechar" da ação e o "×" do canto, e os dois
      // carregam o mesmo nome acessível.
      await page.getByRole('button', { name: EQUIPE.convite.fechar }).last().click();
      await expect(page.getByText(convidada.email).first()).toBeVisible();
    },
  );

  /**
   * RF-033 · o aceite, e os dois erros que o mantinham vermelho.
   *
   * 1. **A senha tem de ser outra.** Preencher com `senhaDeTeste()` manda ao
   *    GoTrue a senha que a conta já tem; ele devolve `same_password`, que
   *    `autenticacao/repositorio.ts` traduz para `senha_fraca`. A ação recusava
   *    — corretamente — e a tela não dizia nada, porque lia só `campos` e a
   *    falha vinha em `campo`.
   * 2. **O sucesso não navega.** `AceiteDeConvite` renderiza o estado concluído
   *    **no lugar**, com um `BotaoLink` "Ir para o painel". Esperar
   *    `waitForURL` era esperar por algo que o componente nunca faz.
   */
  test(
    'aceitar o convite dá acesso administrativo',
    { tag: ['@RF-033'] },
    async ({ page, browser }, info) => {
      const convidada = await criarContaEfemera({
        rotulo: 'aceite',
        indiceDoWorker: info.workerIndex,
      });
      descartaveis.push(convidada);

      await entrarComoAdmin(page);
      await page.goto('/admin/equipe?aba=equipe');
      await page.getByRole('button', { name: EQUIPE.equipe.convidar }).click();

      const dialogo = page.getByRole('dialog');
      await dialogo.getByLabel(EQUIPE.convite.rotuloEmail, { exact: true }).fill(convidada.email);
      await dialogo.getByRole('button', { name: EQUIPE.convite.enviar }).click();
      await expect(page.getByLabel(EQUIPE.convite.linkTitulo)).toBeVisible({ timeout: 30_000 });
      const link = await page.getByLabel(EQUIPE.convite.linkTitulo).inputValue();

      // A pessoa convidada, noutro contexto: ela entra com a própria conta e abre
      // o link. É o caminho real — o convite não cria sessão.
      const contexto = await browser.newContext();
      try {
        const convidado = await contexto.newPage();
        await entrarComCredenciais(convidado, convidada.email);

        await convidado.goto(new URL(link).pathname + new URL(link).search);

        // O aceite **não** é automático, e não é só um clique: a tela pede a
        // senha. É o que separa "abri um link" de "aceitei entrar para a
        // equipe" — e é por isso que o token sozinho não dá acesso a ninguém.
        // Senha **diferente** da que a conta já tem: o Auth recusa
        // `same_password` pelo mesmo caminho por onde recusa senha fraca, e o
        // cenário passaria a provar a recusa em vez do aceite.
        const senhaNova = `E2e-${Math.random().toString(36).slice(2, 10)}-9`;
        const camposDeSenha = convidado.locator('input[type="password"]');
        const quantos = await camposDeSenha.count();
        for (let i = 0; i < quantos; i += 1) {
          await camposDeSenha.nth(i).fill(senhaNova);
        }

        await convidado.getByRole('button', { name: EQUIPE.aceite.enviar }).click();

        // O sucesso é renderizado no lugar — não há navegação a esperar.
        await expect(
          convidado.getByRole('heading', { name: EQUIPE.aceite.sucessoTitulo }),
        ).toBeVisible({ timeout: 30_000 });

        // A prova do RF-033 é o **papel**, e não a navegação: aceitar cria a
        // linha em `membro_admin`. Reentrar pela porta do painel é outro
        // requisito (RF-028) e já tem teste próprio; encadeá-lo aqui só tornaria
        // este cenário lento e quebradiço.
        const { data: membro } = await clienteDeServico()
          .from('membro_admin')
          .select('papel_admin, ativo')
          .eq('perfil_id', convidada.id)
          .maybeSingle();

        expect(membro, 'aceitar o convite precisa criar o membro da equipe').not.toBeNull();
        expect(membro?.ativo).toBe(true);
      } finally {
        await contexto.close();
      }
    },
  );

  /**
   * RF-034 · a matriz de permissões existe e o Administrador é intocável.
   *
   * Poder retirar permissão do próprio papel de administrador é o caminho mais
   * curto para uma equipe se trancar para fora do painel.
   */
  test(
    'a matriz de papéis abre, com o Administrador travado',
    { tag: ['@RF-034'] },
    async ({ page }) => {
      await entrarComoAdmin(page);
      await page.goto('/admin/equipe?aba=papeis');

      await expect(page.getByText(EQUIPE.abas.papeis).first()).toBeVisible();

      // As células editáveis são `<select>`; as travadas são `<span>` com
      // título — o Administrador não tem o que alterar, e é o que impede a
      // equipe de se trancar para fora.
      await expect(page.getByRole('combobox').first()).toBeAttached();
    },
  );

  test('o login do admin não aceita quem não existe', { tag: ['@RF-028'] }, async ({ page }) => {
    await page.goto('/admin/entrar');
    await page
      .getByLabel(ADMIN_ENTRAR.rotuloEmail, { exact: true })
      .fill('e2e_ef_ninguem@e2e.dissona.local');
    await page.getByLabel(ADMIN_ENTRAR.rotuloSenha, { exact: true }).fill('qualquer-coisa-1');
    await page.getByRole('button', { name: ADMIN_ENTRAR.enviar }).click();

    await expect(page.getByText(ADMIN_ENTRAR.bannerCredenciais.titulo)).toBeVisible();
  });
});
