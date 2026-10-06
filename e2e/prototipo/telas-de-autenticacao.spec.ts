import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import {
  PROTOTIPO,
  abrirPrototipo,
  ancoras,
  digitaisDeTexto,
  divergencias,
  fonteRenderizada,
  relatorio,
} from '../apoio/prototipo';
import type { Excecao, Prototipo, PropsDoPrototipo } from '../apoio/prototipo';

/**
 * Paridade visual das telas de autenticação com o protótipo da R2.
 *
 * Cada cenário abre a tela **nos dois lados** — o `.html` do protótipo e a
 * aplicação — no mesmo navegador e na mesma viewport, e compara a tipografia de
 * todo texto que existe nos dois com a mesma string. O `apoio/prototipo.ts`
 * explica o método e por que não é comparação de pixel.
 *
 * Escopo: as telas de autenticação que abrem **sem sessão**. Onboarding (1.5),
 * seleção de perfil (1.4) e confirmação social (1.6) ficam de fora porque a
 * guarda de rota as protege — entram quando houver persona para elas. As duas
 * primeiras já divergem do protótipo hoje; está registrado em
 * `docs/prd/07-pendencias-e-divergencias.md`.
 */

/** O protótipo compõe em 1280×800, e é a viewport da suíte (design-system §3.1). */
type Cenario = {
  readonly nome: string;
  readonly prototipo: Prototipo;
  readonly props: PropsDoPrototipo;
  readonly rota: string;
  /** Tela que o protótipo só mostra depois de um envio — ver `abrirPrototipo`. */
  readonly depois?: (pagina: Page) => Promise<void>;
  readonly excecoes?: readonly Excecao[];
  /**
   * Motivo para pular a checagem de geometria do logotipo — só a tela de
   * verificação de e-mail usa: a composição inteira diverge do protótipo
   * (ver a exceção de tipografia dela), e comparar só a altura do logotipo
   * fora do contexto do resto da composição não diria nada de novo.
   */
  readonly semChecagemDeAncoras?: string;
};

/**
 * O protótipo não põe `letter-spacing` nos botões destas telas, mas põe
 * `-0.01em` no botão primário da tela 1 — e é esse o valor que o Design System
 * registra para rótulo de botão (§1.2). O componente `Botao` segue o token nas
 * duas telas; o protótipo é que é inconsistente consigo mesmo aqui.
 */
const TRACKING_DE_BOTAO = (texto: string): Excecao => ({
  texto,
  propriedades: ['tracking'],
  motivo:
    'Botão segue o token de rótulo de botão do Design System §1.2 (-0.01em); ' +
    'o protótipo só o aplica na tela 1.',
});

const CENARIOS: readonly Cenario[] = [
  {
    // O login do artista. Não há cenário para uma rota `/entrar` neutra porque
    // ela não existe mais: o protótipo tem três telas de login, uma por
    // ambiente, e a quarta — cópia desta — foi apagada em 2026-09-23.
    //
    // As provas sociais do pé vêm desligadas por padrão no painel do protótipo,
    // e a tela as tem — é o que `mostrarProvas` liga.
    nome: 'login do artista',
    prototipo: PROTOTIPO.ARTISTA,
    props: { telaInicial: 'Login', mostrarProvas: true },
    rota: '/artista/entrar',
  },
  {
    // A tela que ficou idêntica à do artista por uma release — logotipo
    // 36px fixo (não `clamp(28px,3vw,36px)`), `gap` de chamada 7px (não
    // 8px), `max-width` de 620px (não 600px) e o subtítulo do curador, que
    // simplesmente não existia. É este cenário que teria acusado.
    nome: 'login do curador',
    prototipo: PROTOTIPO.CURADOR,
    props: { telaInicial: 'Login', mostrarProvas: true },
    rota: '/curador/entrar',
  },
  {
    nome: 'cadastro',
    prototipo: PROTOTIPO.ARTISTA,
    props: { telaInicial: 'Cadastro' },
    rota: '/cadastrar',
  },
  {
    // O protótipo não tem uma tela de cadastro isolada para o curador — é a
    // variante sem sessão do passo 1 do wizard (`curadorLogado: false`), com
    // o campo de senha visível. `MolduraDoWizard`/`PainelDeMarca`, não a
    // moldura de auth com o aside "Como funciona" do artista.
    nome: 'cadastro do curador',
    prototipo: PROTOTIPO.CURADOR,
    props: { telaInicial: 'Cadastro', curadorLogado: false },
    rota: '/curador/cadastrar',
    excecoes: [TRACKING_DE_BOTAO('Continuar')],
  },
  {
    nome: 'verificação de e-mail',
    prototipo: PROTOTIPO.ARTISTA,
    props: { telaInicial: 'Cadastro' },
    rota: '/verificar-email?email=aurora.menezes%40email.com',
    // Não está no `routeMap` do protótipo: só se chega enviando o cadastro.
    depois: async (pagina) => {
      await pagina.locator('button', { hasText: 'Criar conta' }).last().click();
      await pagina.getByRole('heading', { name: /Confirme seu e-mail/ }).waitFor();
    },
    excecoes: [
      {
        texto: 'Confirme seu e-mail para continuar',
        propriedades: ['corpo', 'tracking', 'entrelinha'],
        motivo:
          'No protótipo esta tela não é um cartão de 436 px: é um bloco de 560 px ' +
          'alinhado à esquerda, sobre fundo branco, e o título é um hero de 40 px. ' +
          'A aplicação a unificou na moldura das outras telas de auth. Divergência ' +
          'de composição registrada em docs/prd/07-pendencias-e-divergencias.md.',
      },
      TRACKING_DE_BOTAO('Já confirmei, continuar'),
      TRACKING_DE_BOTAO('Reenviar e-mail'),
    ],
    semChecagemDeAncoras:
      'Composição inteira diverge do protótipo (ver a exceção de tipografia acima); ' +
      'pendente em docs/prd/07-pendencias-e-divergencias.md.',
  },
  {
    nome: 'recuperação de senha',
    prototipo: PROTOTIPO.ARTISTA,
    props: { telaInicial: 'Recuperação' },
    rota: '/recuperar-senha',
  },
  {
    nome: 'redefinição de senha · link expirado',
    prototipo: PROTOTIPO.ARTISTA,
    // Sem token na URL, a aplicação mostra o estado de link inválido — o mesmo
    // que `estadoToken: 'Expirado'` mostra no protótipo. O estado de link
    // válido depende de um token real do Supabase e não cabe aqui.
    props: { telaInicial: 'Redefinição', estadoToken: 'Expirado' },
    rota: '/redefinir-senha',
    excecoes: [
      TRACKING_DE_BOTAO('Reiniciar recuperação'),
      TRACKING_DE_BOTAO('Voltar para o Login'),
    ],
  },
  {
    nome: 'login do admin',
    prototipo: PROTOTIPO.ADMIN,
    props: { telaInicial: 'Login' },
    rota: '/admin/entrar',
  },
  {
    nome: 'recuperação de senha do admin',
    prototipo: PROTOTIPO.ADMIN,
    props: { telaInicial: 'Recuperação' },
    rota: '/admin/recuperar-senha',
  },
  {
    nome: 'redefinição de senha do admin · link expirado',
    prototipo: PROTOTIPO.ADMIN,
    props: { telaInicial: 'Redefinição', estadoToken: 'Expirado' },
    rota: '/admin/redefinir-senha',
    excecoes: [
      TRACKING_DE_BOTAO('Reiniciar recuperação'),
      TRACKING_DE_BOTAO('Voltar para o Login'),
    ],
  },
];

for (const cenario of CENARIOS) {
  test.describe(`${cenario.nome} (${cenario.rota})`, () => {
    test('tipografia igual à do protótipo em todo texto pareado', async ({
      page,
      context,
    }, info) => {
      const doPrototipo = await context.newPage();
      await abrirPrototipo(doPrototipo, cenario.prototipo, cenario.props);
      if (cenario.depois !== undefined) await cenario.depois(doPrototipo);

      await page.goto(cenario.rota);
      await page.locator('h1').first().waitFor();

      const esperado = await digitaisDeTexto(doPrototipo);
      const obtido = await digitaisDeTexto(page);

      // As duas telas vão para o relatório mesmo quando passa: quando falha, é
      // o que responde "como está lá e como está aqui" sem rodar nada de novo.
      await info.attach('prototipo.png', {
        body: await doPrototipo.screenshot({ fullPage: true }),
        contentType: 'image/png',
      });
      await info.attach('aplicacao.png', {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png',
      });

      const pareados = Object.keys(esperado).filter((texto) => texto in obtido);
      // Guarda do próprio método: se a navegação no protótipo for para a tela
      // errada, quase nada pareia — e o teste passaria por não ter o que
      // comparar. Os cenários pareiam entre 4 e 22 textos.
      expect(
        pareados.length,
        'poucos textos pareados — a tela do protótipo é a mesma da rota?',
      ).toBeGreaterThanOrEqual(4);

      const lista = divergencias(esperado, obtido, cenario.excecoes);
      expect(lista, `divergências de tipografia:\n${relatorio(lista)}`).toEqual([]);
    });

    test('títulos renderizam em Inter, e não no fallback do sistema', async ({ page, context }) => {
      const doPrototipo = await context.newPage();
      await abrirPrototipo(doPrototipo, cenario.prototipo, cenario.props);
      if (cenario.depois !== undefined) await cenario.depois(doPrototipo);

      await page.goto(cenario.rota);
      await page.locator('h1').first().waitFor();

      // A fonte usada, e não a declarada: `--dsn-font-sans` sempre nomeou Inter
      // primeiro, e por não haver `@font-face` o Windows renderizava os `h1` em
      // Segoe UI Black — mais grossos e mais largos que o protótipo, e
      // diferentes em cada sistema operacional.
      const noPrototipo = await fonteRenderizada(doPrototipo, 'h1');
      const naAplicacao = await fonteRenderizada(page, 'h1');

      expect(noPrototipo, 'o protótipo deveria renderizar o h1 em Inter').toEqual(
        expect.arrayContaining([expect.stringMatching(/^Inter/)]),
      );
      expect(naAplicacao).toEqual(noPrototipo);
    });

    /**
     * Geometria do logotipo — o que a tipografia não fecha porque uma `<img>`
     * não tem texto próprio. É esta medida, e não uma inspeção visual, que
     * teria acusado o logotipo do admin em `clamp(28px,3vw,36px)` (a altura
     * do artista) em vez do seu próprio `clamp(44px,5.6vh,60px)`.
     */
    test('altura do logotipo igual à do protótipo', async ({ page, context }) => {
      test.skip(cenario.semChecagemDeAncoras !== undefined, cenario.semChecagemDeAncoras);

      const doPrototipo = await context.newPage();
      await abrirPrototipo(doPrototipo, cenario.prototipo, cenario.props);
      if (cenario.depois !== undefined) await cenario.depois(doPrototipo);

      await page.goto(cenario.rota);
      await page.locator('h1').first().waitFor();

      const seletores = { marca: 'img[alt="Dissona"]' };
      const noPrototipo = await ancoras(doPrototipo, seletores);
      const naAplicacao = await ancoras(page, seletores);

      // 1px de folga: arredondamento de subpixel entre os dois motores de
      // fonte/layout, não divergência de composição.
      const alturaPrototipo = noPrototipo['marca']?.altura;
      const alturaAplicacao = naAplicacao['marca']?.altura;
      expect(alturaPrototipo, 'protótipo sem logotipo visível na tela').not.toBeNull();
      expect(alturaAplicacao, 'aplicação sem logotipo visível na tela').not.toBeNull();
      if (alturaPrototipo !== undefined && alturaAplicacao !== undefined) {
        expect(Math.abs(alturaAplicacao - alturaPrototipo)).toBeLessThanOrEqual(1);
      }
    });
  });
}
