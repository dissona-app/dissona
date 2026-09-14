import { expect, test } from '@playwright/test';

import { PERSONA } from '../apoio/personas';
import type { Persona } from '../apoio/personas';
import {
  PROTOTIPO,
  abrirPrototipo,
  digitaisDeTexto,
  divergencias,
  fonteRenderizada,
  relatorio,
} from '../apoio/prototipo';
import type { Excecao, Prototipo, PropsDoPrototipo } from '../apoio/prototipo';
import { entrarComo, entrarComoAdmin } from '../apoio/sessao';

/**
 * Paridade visual das telas da R1 que exigem sessão.
 *
 * Mesmo método de `telas-de-autenticacao.spec.ts` — os dois lados abertos no
 * mesmo navegador, tipografia comparada texto a texto; o `apoio/prototipo.ts`
 * explica por quê. A diferença é que aqui a tela só existe **num estado**, e o
 * estado é quem dá acesso a ela: a seleção de perfil só aparece para quem não
 * escolheu papel, o tour só para quem não o viu, a tela de análise só para o
 * candidato a Prata. Daí uma persona por estado, semeadas em
 * `supabase/testes/dados-e2e.sql`.
 *
 * Fora daqui ficam as telas de R2 (painel do artista, fila do curador, pacotes)
 * e as **derivadas**, que não existem em protótipo nenhum e portanto não têm com
 * o que ser comparadas: seleção de perfil (1.4), aceite de convite e
 * `/cadastrar/confirmar`. Para essas o que existe é o Design System.
 */

/*
 * 60 s por cenário, contra os 30 s padrão.
 *
 * Cada um faz três coisas lentas em sequência: abre um protótipo de 1,5 MB que
 * se monta em JavaScript, entra pela tela de login — round trip até o Supabase
 * em `us-west-2` — e só então carrega a rota. Com quatro workers em paralelo,
 * 30 s estouravam no login, e o sintoma era "waitForURL" em vez de "a tela está
 * diferente". Aumentar aqui não esconde bug: seletor errado falha na hora.
 */
test.describe.configure({ timeout: 60_000 });

type Cenario = {
  readonly nome: string;
  readonly prototipo: Prototipo;
  readonly props: PropsDoPrototipo;
  readonly rota: string;
  readonly persona: Persona;
  /** `true` para entrar pelo login administrativo. */
  readonly admin?: boolean;
  readonly excecoes?: readonly Excecao[];
};

/**
 * O protótipo não põe `letter-spacing` nos botões destas telas, e põe `-0.01em`
 * no CTA da tela 1 — que é o valor que o Design System registra para rótulo de
 * botão de 16 px (§1.2). O `Botao` aplica o token no tamanho `md`, e é onde as
 * duas fontes concordam; nos tamanhos `denso` e `sm` ele não aplica nada.
 */
const TRACKING_DE_BOTAO_MD = (texto: string): Excecao => ({
  texto,
  propriedades: ['tracking'],
  motivo:
    'Rótulo de botão de 16 px segue o token do Design System §1.2 (-0.01em); ' +
    'o protótipo só o aplica no CTA da tela 1.',
});

const CENARIOS: readonly Cenario[] = [
  {
    nome: 'onboarding · passo 1',
    prototipo: PROTOTIPO.ARTISTA,
    props: { telaInicial: 'Onboarding', passoOnboarding: 1 },
    rota: '/onboarding',
    persona: PERSONA.TOUR,
    excecoes: [TRACKING_DE_BOTAO_MD('Avançar')],
  },
  {
    nome: 'conta do artista',
    prototipo: PROTOTIPO.ARTISTA,
    props: { telaInicial: 'Configurações' },
    rota: '/artista/conta',
    persona: PERSONA.TOUR,
    excecoes: [
      {
        texto: 'Aurora',
        propriedades: ['cor'],
        motivo:
          'O nome no topbar do protótipo não tem `color` declarado e cai no preto ' +
          'do navegador; a aplicação usa `--dsn-ink`. Preto puro não é decisão de ' +
          'design — não existe em nenhum token do R2.',
      },
    ],
  },
  ...([1, 2, 3, 4, 5, 6, 7, 8] as const).map((passo): Cenario => ({
    nome: `wizard do curador · passo ${passo}`,
    prototipo: PROTOTIPO.CURADOR,
    props: { telaInicial: 'Cadastro', passoInicial: passo, curadorLogado: true },
    rota: `/curador/cadastro/${passo}`,
    persona: PERSONA.WIZARD,
    excecoes:
      passo === 8
        ? [
            {
              texto: 'Completo',
              propriedades: ['cor'],
              // O R2 tem dois verdes de sucesso quase iguais, e os dois estão
              // auditados no Design System §1.1: `#1E7A4A` (4,74:1) e
              // `#1B7A46` (4,76:1). A aplicação usa o token; um segundo token
              // para um delta de contraste de 0,02 seria ruído.
              motivo:
                'O protótipo usa #1B7A46 aqui e #1E7A4A nas outras telas; ' +
                'a aplicação segue o token --dsn-success-fg (§1.1).',
            },
          ]
        : undefined,
  })),
  {
    nome: 'classificação do curador',
    prototipo: PROTOTIPO.CURADOR,
    props: { telaInicial: 'Classificação' },
    rota: '/curador/cadastro/classificacao',
    persona: PERSONA.CURADOR_BRONZE,
  },
  {
    nome: 'boas-vindas Bronze',
    prototipo: PROTOTIPO.CURADOR,
    props: { telaInicial: 'Boas-vindas Bronze' },
    rota: '/curador/cadastro/bronze',
    persona: PERSONA.CURADOR_BRONZE,
    excecoes: [
      {
        texto: 'Começar o curso',
        propriedades: ['cor'],
        motivo:
          'O curso é conteúdo de outra release, e o botão está desabilitado — daí ' +
          'o rótulo em `ink` no lugar do branco sobre laranja do protótipo. ' +
          'Registrado em docs/prd/07-pendencias-e-divergencias.md.',
      },
      {
        texto: 'Ir para o painel',
        propriedades: ['cor'],
        motivo:
          'Com o curso desabilitado, "Ir para o painel" assume o primário da tela ' +
          '— no protótipo ele é o secundário. Mesma divergência do item acima.',
      },
    ],
  },
  {
    nome: 'cadastro em análise',
    prototipo: PROTOTIPO.CURADOR,
    props: { telaInicial: 'Cadastro em análise' },
    rota: '/curador/cadastro/analise',
    persona: PERSONA.CURADOR_PRATA,
    excecoes: [
      {
        texto: 'A equipe já recebeu o alerta para avaliar suas credenciais.',
        propriedades: ['corpo', 'entrelinha', 'cor'],
        motivo:
          'A aplicação põe a frase num `Aviso` informativo; no protótipo ela é uma ' +
          'linha de texto solta. Divergência de composição registrada em ' +
          'docs/prd/07-pendencias-e-divergencias.md.',
      },
    ],
  },
  {
    nome: 'conta do curador',
    prototipo: PROTOTIPO.CURADOR,
    props: { telaInicial: 'Conta e configurações' },
    rota: '/curador/conta',
    persona: PERSONA.CURADOR_BRONZE,
  },
  {
    nome: 'conta e equipe do admin',
    prototipo: PROTOTIPO.ADMIN,
    props: { telaInicial: 'Conta e equipe' },
    rota: '/admin/equipe',
    persona: PERSONA.ADMIN,
    admin: true,
    excecoes: [
      {
        texto: 'Trocar foto',
        propriedades: ['cor'],
        motivo:
          'O upload de foto é pendência declarada na tela, e o botão está ' +
          'desabilitado — daí o cinza no lugar do roxo do protótipo.',
      },
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

      if (cenario.admin === true) await entrarComoAdmin(page, cenario.persona);
      else await entrarComo(page, cenario.persona);

      await page.goto(cenario.rota);
      await page.locator('h1').first().waitFor();

      // O ponteiro fica onde o último clique o deixou, e o hover de um cartão
      // ou de um botão muda cor e borda. Longe dos dois lados, então.
      await doPrototipo.mouse.move(2, 2);
      await page.mouse.move(2, 2);

      const esperado = await digitaisDeTexto(doPrototipo);
      const obtido = await digitaisDeTexto(page);

      await info.attach('prototipo.png', {
        body: await doPrototipo.screenshot({ fullPage: true }),
        contentType: 'image/png',
      });
      await info.attach('aplicacao.png', {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png',
      });

      const pareados = Object.keys(esperado).filter((texto) => texto in obtido);
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

      if (cenario.admin === true) await entrarComoAdmin(page, cenario.persona);
      else await entrarComo(page, cenario.persona);

      await page.goto(cenario.rota);
      await page.locator('h1').first().waitFor();

      const noPrototipo = await fonteRenderizada(doPrototipo, 'h1');
      const naAplicacao = await fonteRenderizada(page, 'h1');

      expect(noPrototipo, 'o protótipo deveria renderizar o h1 em Inter').toEqual(
        expect.arrayContaining([expect.stringMatching(/^Inter/)]),
      );
      expect(naAplicacao).toEqual(noPrototipo);
    });
  });
}
