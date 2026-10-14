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
import { enderecoDe } from '../apoio/admin';
import type { Excecao, Prototipo, PropsDoPrototipo } from '../apoio/prototipo';
import { entrarComo, entrarComoAdmin } from '../apoio/sessao';
import { FAIXA_DO_C3 } from '../apoio/avaliacao';
import { envioDaFaixa } from '../apoio/banco';

/**
 * Paridade visual das telas da R2 com o protótipo aprovado (30/09/2026).
 *
 * Mesmo método de `telas-da-r1.spec.ts`. Os dados dos dois lados são outros —
 * o protótipo traz "Aurora Menezes" e cinco faixas fictícias, a aplicação as
 * personas do seed —, e por isso só pareiam os textos fixos da tela: títulos,
 * rótulos, botões e notas. É o que basta para pegar corpo, peso, tracking e
 * cor fora do aprovado.
 */
test.describe.configure({ timeout: 60_000 });

type Cenario = {
  readonly nome: string;
  readonly prototipo: Prototipo;
  readonly props: PropsDoPrototipo;
  /** A rota, ou como chegar nela quando depende de um id do seed. */
  readonly rota: string | (() => Promise<string>);
  readonly persona: Persona;
  readonly admin?: boolean;
  readonly excecoes?: readonly Excecao[];
};

const CENARIOS: readonly Cenario[] = [
  {
    nome: 'carteira do artista',
    prototipo: PROTOTIPO.ARTISTA,
    props: { telaInicial: 'Carteira' },
    rota: '/artista/carteira',
    persona: PERSONA.ARTISTA,
  },
  {
    nome: 'perfil do artista',
    prototipo: PROTOTIPO.ARTISTA,
    props: { telaInicial: 'Perfil' },
    rota: '/artista/perfil',
    persona: PERSONA.ARTISTA,
    excecoes: [
      {
        texto: 'Ver todas',
        propriedades: ['cor'],
        motivo:
          'O catálogo (Minhas faixas) é de outra release; o link está desabilitado ' +
          'e por isso cinza, e não o roxo do protótipo.',
      },
    ],
  },
  {
    nome: 'editar cadastro do artista',
    prototipo: PROTOTIPO.ARTISTA,
    props: { telaInicial: 'Editar cadastro' },
    rota: '/artista/perfil/editar',
    persona: PERSONA.ARTISTA,
    // Dado, e não design: a Aurora do protótipo tem esses dois gêneros
    // marcados (em tinta), e a persona não.
    excecoes: ['MPB contemporânea', 'Eletrônico'].map((texto): Excecao => ({
      texto,
      propriedades: ['cor'],
      motivo: 'Gênero marcado no protótipo e solto na persona do seed.',
    })),
  },
  {
    nome: 'enviar faixa',
    prototipo: PROTOTIPO.ARTISTA,
    props: { telaInicial: 'Enviar' },
    rota: '/artista/enviar',
    persona: PERSONA.ARTISTA,
    excecoes: [
      {
        texto: 'Detectar faixa',
        propriedades: ['cor'],
        motivo:
          'Sem link colado o botão fica desabilitado (cinza); no protótipo ele ' +
          'está sempre ativo, mesmo sem ter o que detectar.',
      },
    ],
  },
  {
    nome: 'fila do curador',
    prototipo: PROTOTIPO.CURADOR,
    props: { telaInicial: 'Fila' },
    rota: '/curador/fila',
    persona: PERSONA.CURADOR_BRONZE,
  },
  {
    nome: 'meu perfil do curador',
    prototipo: PROTOTIPO.CURADOR,
    props: { telaInicial: 'Meu perfil' },
    rota: '/curador/meu-cadastro',
    persona: PERSONA.CURADOR_MANUTENCAO,
  },
  {
    nome: 'avaliação · notas objetivas',
    prototipo: PROTOTIPO.CURADOR,
    props: { telaInicial: 'Avaliação' },
    rota: async () => {
      const envio = await envioDaFaixa(FAIXA_DO_C3);
      if (envio === null) throw new Error('Rode o seed: falta o envio da faixa do C3.');
      return `/curador/avaliar/${envio.id}/notas`;
    },
    persona: PERSONA.CURADOR_BRONZE,
  },
  {
    nome: 'pacotes do admin',
    prototipo: PROTOTIPO.ADMIN,
    props: { telaInicial: 'Pacotes de Claves' },
    rota: '/admin/pacotes',
    persona: PERSONA.ADMIN,
    admin: true,
  },
];

for (const cenario of CENARIOS) {
  const rotulo = typeof cenario.rota === 'string' ? cenario.rota : 'rota do seed';
  const rotaDe = async (): Promise<string> =>
    typeof cenario.rota === 'string' ? cenario.rota : cenario.rota();

  test.describe(`${cenario.nome} (${rotulo})`, () => {
    test('tipografia igual à do protótipo em todo texto pareado', async ({
      page,
      context,
    }, info) => {
      const doPrototipo = await context.newPage();
      await abrirPrototipo(doPrototipo, cenario.prototipo, cenario.props);

      if (cenario.admin === true) await entrarComoAdmin(page, cenario.persona);
      else await entrarComo(page, cenario.persona);

      await page.goto(enderecoDe(await rotaDe()));
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

    test('títulos renderizam em Anton, e não no fallback do sistema', async ({ page, context }) => {
      const doPrototipo = await context.newPage();
      await abrirPrototipo(doPrototipo, cenario.prototipo, cenario.props);

      if (cenario.admin === true) await entrarComoAdmin(page, cenario.persona);
      else await entrarComo(page, cenario.persona);

      await page.goto(enderecoDe(await rotaDe()));
      await page.locator('h1').first().waitFor();

      const noPrototipo = await fonteRenderizada(doPrototipo, 'h1');
      const naAplicacao = await fonteRenderizada(page, 'h1');

      expect(noPrototipo, 'o protótipo aprovado renderiza o h1 em Anton').toEqual(
        expect.arrayContaining([expect.stringMatching(/^Anton/)]),
      );
      expect(naAplicacao).toEqual(noPrototipo);
    });
  });
}
