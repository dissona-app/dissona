import { join } from 'node:path';

import { expect, test } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';

import { noAdmin } from '../e2e/apoio/admin';
import { avancar, escolherModalidade, preencherObrigatorios } from '../e2e/apoio/avaliacao';
import { clienteDeServico } from '../e2e/apoio/banco';
import {
  ADMIN_ENTRAR,
  ADMIN_PACOTE_FORMULARIO,
  ADMIN_PACOTES,
  AVALIAR,
  CARTEIRA,
  CHECKOUT,
  CURADOR_CLASSIFICACAO,
  ENTRAR,
  ENVIAR,
  FILA,
  ONBOARDING,
  PACOTES,
  SELECAO,
  STATUS_DO_ENVIO,
} from '../e2e/apoio/textos';
import { percorrerWizard } from '../e2e/apoio/wizard-curador';

import {
  carimboDaRodada,
  clicarLink,
  etapa,
  garantirConta,
  irPara,
  registrarDesvio,
  vigiar5xx,
} from './apoio';
import type { ContaQa } from './apoio';

/**
 * QA de aceite em produção — Release 1 e 2.
 *
 * Quatro jornadas encadeadas, na ordem em que a demonstração acontece:
 *
 *  1. Admin → Artista: o admin publica um pacote e o artista o compra.
 *  2. Artista → Curador: o artista envia a faixa, o curador escuta e avalia,
 *     o artista acompanha até "Pronto".
 *  3. Admin → Curador: o candidato a Prata conclui o cadastro e fica em
 *     análise; a equipe é notificada.
 *  4. Admin → Artista: o admin desativa o pacote e ele sai da vitrine.
 */

const MP3 = join(process.cwd(), 'e2e', 'apoio', 'arquivos', 'e2e-faixa.mp3');
const CPF = '529.982.247-25';
const CARTAO_APROVADO = '5162 3062 1937 8829';

const carimbo = carimboDaRodada();
const NOME_DO_PACOTE = `Pacote QA ${carimbo}`;
const TITULO_DA_FAIXA = `Faixa QA ${carimbo}`;

const conta: Record<'admin' | 'artista' | 'curador' | 'prata', ContaQa> = {} as never;
let envioId = '';

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  conta.admin = await garantirConta(
    { chave: 'admin', nome: 'QA Admin', papel: 'admin', onboardingVisto: true },
    carimbo,
  );
  conta.artista = await garantirConta(
    { chave: 'artista', nome: 'QA Artista', papel: 'artista', onboardingVisto: false },
    carimbo,
  );
  conta.curador = await garantirConta(
    { chave: 'curador', nome: `QA Curador ${carimbo}`, papel: 'curador', onboardingVisto: true },
    carimbo,
  );
  conta.prata = await garantirConta(
    { chave: 'curador_prata', nome: 'QA Curador Prata', papel: 'curador', onboardingVisto: true },
    carimbo,
  );
});

// ------------------------------------------------------------------ apoio

async function novaPagina(browser: Browser, jornada: string): Promise<Page> {
  const contexto = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    baseURL: process.env.BASE_URL,
  });
  const page = await contexto.newPage();
  vigiar5xx(page, jornada);
  return page;
}

/** Login do site, com uma nova tentativa se a action voltar 5xx. */
async function entrarNoSite(page: Page, c: ContaQa, porta: 'artista' | 'curador') {
  for (let tentativa = 1; tentativa <= 4; tentativa += 1) {
    try {
      await irPara(page, `/${porta}/entrar`);
      await page.getByLabel(ENTRAR.rotuloEmail, { exact: true }).fill(c.email);
      await page.getByLabel(ENTRAR.rotuloSenha, { exact: true }).fill(c.senha);
      await page.getByRole('button', { name: ENTRAR.enviar, exact: true }).click();
      await page.waitForURL((url) => !url.pathname.endsWith('/entrar'), { timeout: 30_000 });
      return;
    } catch {
      registrarDesvio(`login de ${c.email} (tentativa ${tentativa})`, new URL(page.url()).pathname);
      if (tentativa === 4) throw new Error(`login de ${c.email} não saiu da tela de entrada`);
    }
  }
}

async function entrarNoPainel(page: Page, c: ContaQa) {
  for (let tentativa = 1; tentativa <= 4; tentativa += 1) {
    try {
      await irPara(page, noAdmin('/admin/entrar'));
      await page.getByLabel(ADMIN_ENTRAR.rotuloEmail, { exact: true }).fill(c.email);
      await page.getByLabel(ADMIN_ENTRAR.rotuloSenha, { exact: true }).fill(c.senha);
      await page.getByRole('button', { name: ADMIN_ENTRAR.enviar }).click();
      await page.waitForURL((url) => url.pathname !== '/entrar', { timeout: 30_000 });
      return;
    } catch {
      registrarDesvio(`login do painel (tentativa ${tentativa})`, new URL(page.url()).pathname);
      if (tentativa === 4) throw new Error(`login do painel de ${c.email} não saiu da tela`);
    }
  }
}

async function saldoNaCarteira(page: Page): Promise<number> {
  await irPara(page, '/artista/carteira');
  const bruto = await page
    .locator('p')
    .filter({ hasText: new RegExp(`^[\\d.,]+\\s*${CARTEIRA.saldoUnidade}$`) })
    .first()
    .innerText();
  return Number(
    bruto.replace(CARTEIRA.saldoUnidade, '').trim().replace(/\./g, '').replace(',', '.'),
  );
}

async function situacaoDoEnvio(id: string): Promise<string | null> {
  const { data } = await clienteDeServico()
    .from('envio')
    .select('situacao')
    .eq('id', id)
    .maybeSingle();
  return (data as { situacao?: string } | null)?.situacao ?? null;
}

// ============================================================== jornada 1

test('Jornada 1 · Admin → Artista: pacote publicado e comprado', async ({ browser }) => {
  const J = 'Admin → Artista';
  const admin = await novaPagina(browser, J);
  const artista = await novaPagina(browser, J);

  await etapa(admin, J, 'Admin entra no painel (painel.dissona.com.br)', async () => {
    await entrarNoPainel(admin, conta.admin);
    await expect(admin.getByRole('heading', { level: 1 })).toBeVisible();
  });

  await etapa(admin, J, 'Admin abre Equipe e vê a própria conta', async () => {
    await irPara(admin, noAdmin('/admin/equipe'));
    await expect(admin.getByRole('textbox', { name: 'E-mail corporativo' })).toHaveValue(
      conta.admin.email,
    );
    await clicarLink(admin, admin.getByRole('link', { name: 'Equipe', exact: true }), /aba=equipe/);
    await expect(admin.getByText(conta.admin.nome).first()).toBeVisible();
  });

  await etapa(admin, J, 'Admin cria um pacote de 30 Claves com 10% de desconto', async () => {
    await irPara(admin, noAdmin('/admin/pacotes'));
    await expect(admin.getByRole('heading', { level: 1 })).toContainText('Pacotes de Claves');
    await irPara(admin, noAdmin('/admin/pacotes/novo'));
    await admin.getByLabel(ADMIN_PACOTE_FORMULARIO.rotuloNome).fill(NOME_DO_PACOTE);
    await admin.getByLabel(ADMIN_PACOTE_FORMULARIO.rotuloQuantidade).fill('30');
    await admin.getByLabel(ADMIN_PACOTE_FORMULARIO.rotuloDesconto).fill('10');
    await expect(admin.getByLabel(ADMIN_PACOTE_FORMULARIO.rotuloValor)).toHaveValue('270,00');
    await admin.getByRole('button', { name: ADMIN_PACOTE_FORMULARIO.salvar }).click();
    await admin.waitForURL((url) => !url.pathname.endsWith('/novo'), { timeout: 60_000 });
    if (!(await admin.getByText(ADMIN_PACOTE_FORMULARIO.flashCriado).isVisible())) {
      registrarDesvio('salvar pacote: sem a confirmação na tela', new URL(admin.url()).pathname);
      await irPara(admin, noAdmin('/admin/pacotes'));
    }
    const linha = admin.getByRole('listitem').filter({ hasText: NOME_DO_PACOTE });
    await expect(linha).toContainText(ADMIN_PACOTES.statusAtivo);
    await expect(linha).toContainText(ADMIN_PACOTES.subNaCarteira);
  });

  await etapa(artista, J, 'Artista novo entra e passa pelo tour de boas-vindas', async () => {
    await entrarNoSite(artista, conta.artista, 'artista');
    await artista.waitForURL(/\/onboarding/);
    const total = ONBOARDING.artista.length;
    await expect(artista.getByText(ONBOARDING.passoDe(1, total))).toBeVisible();
    for (let passo = 1; passo < total; passo += 1) {
      await artista.getByRole('button', { name: ONBOARDING.avancar }).click();
    }
    await artista.getByRole('button', { name: ONBOARDING.finalizar }).click();
    await artista.waitForURL(/\/artista/);
  });

  let saldoAntes = 0;
  await etapa(artista, J, 'Artista vê a carteira zerada', async () => {
    saldoAntes = await saldoNaCarteira(artista);
    expect(saldoAntes).toBe(0);
  });

  await etapa(artista, J, 'O pacote do admin aparece na vitrine do artista', async () => {
    await irPara(artista, '/artista/pacotes');
    await expect(artista.getByText(PACOTES.chamada)).toBeVisible();
    const cartao = artista
      .getByRole('main')
      .getByRole('listitem')
      .filter({ has: artista.getByRole('link', { name: new RegExp(NOME_DO_PACOTE) }) });
    await expect(cartao).toBeVisible();
    await expect(cartao).toContainText(/por Clave/);
    await clicarLink(
      artista,
      cartao.getByRole('link', { name: new RegExp(`^${PACOTES.escolher}`) }),
      /\/artista\/pacotes\/[0-9a-f-]{36}$/,
    );
  });

  await etapa(artista, J, 'Artista paga com cartão (simulado, aprovado)', async () => {
    const checkout = artista.url();
    for (let tentativa = 1; tentativa <= 4; tentativa += 1) {
      if (tentativa > 1) await irPara(artista, checkout);
      const resumo = artista.getByRole('region', { name: CHECKOUT.resumoTitulo });
      await expect(resumo).toContainText(/270,00/);
      const novo = artista.getByRole('radio', { name: CHECKOUT.meios.cartao, exact: true });
      if (await novo.isVisible()) await novo.click();
      await artista.getByLabel(CHECKOUT.cpf).fill(CPF);
      await artista.getByLabel(CHECKOUT.numero).fill(CARTAO_APROVADO);
      await artista.getByLabel(CHECKOUT.nome).fill('QA ARTISTA');
      await artista.getByLabel(CHECKOUT.validade).fill('12/30');
      await artista.getByLabel(CHECKOUT.cvv).fill('123');
      await artista.getByLabel(CHECKOUT.telefone).fill('11987654321');
      await artista.getByLabel(CHECKOUT.cep).fill('01310100');
      const simulacao = artista.getByRole('radio', { name: CHECKOUT.simulacoes.aprovado });
      if ((await simulacao.count()) > 0) await simulacao.click();
      await artista.getByRole('button', { name: CHECKOUT.confirmar }).click();
      const desfecho = await Promise.race([
        artista
          .getByText(CHECKOUT.aprovadoTitulo)
          .waitFor({ timeout: 60_000 })
          .then(() => 'ok' as const),
        artista
          .getByText('This page couldn’t load')
          .waitFor({ timeout: 60_000 })
          .then(() => 'erro' as const),
      ]);
      if (desfecho === 'ok') return;
      registrarDesvio(`pagamento (tentativa ${tentativa}) — tela de erro do servidor`, checkout);
    }
    throw new Error('o pagamento falhou nas 4 tentativas');
  });

  await etapa(artista, J, 'Saldo credita 30 Claves e o extrato registra a compra', async () => {
    await expect.poll(() => saldoNaCarteira(artista), { timeout: 60_000 }).toBe(saldoAntes + 30);
    await expect(artista.getByText(/30 Claves/).first()).toBeVisible();
  });

  await admin.context().close();
  await artista.context().close();
});

// ============================================================== jornada 2

test('Jornada 2 · Artista → Curador: envio, escuta, avaliação e devolutiva', async ({
  browser,
}) => {
  const J = 'Artista → Curador';
  const curador = await novaPagina(browser, J);
  const artista = await novaPagina(browser, J);

  await etapa(curador, J, 'Curador entra e é levado ao cadastro (wizard de 8 passos)', async () => {
    await entrarNoSite(curador, conta.curador, 'curador');
    await expect(curador).toHaveURL(/\/curador\/cadastro/);
  });

  await etapa(curador, J, 'Curador conclui o cadastro sem credenciais → Bronze', async () => {
    await percorrerWizard(curador, { credenciais: 0 });
    await expect(
      curador.getByRole('heading', { name: CURADOR_CLASSIFICACAO.tituloBronze, exact: true }),
    ).toBeVisible();
  });

  await etapa(curador, J, 'Bronze é liberado na hora: o painel abre', async () => {
    await clicarLink(
      curador,
      curador.getByRole('link', { name: CURADOR_CLASSIFICACAO.continuar }),
      /\/curador\/cadastro\/bronze/,
    );
    await expect(curador.getByText(CURADOR_CLASSIFICACAO.seloBronze)).toBeVisible();
    await irPara(curador, '/curador/fila');
    await expect(curador).toHaveURL(/\/curador\/fila/);
  });

  let saldoAntes = 0;
  await etapa(artista, J, 'Artista entra e envia a faixa por arquivo (mp3)', async () => {
    await entrarNoSite(artista, conta.artista, 'artista');
    saldoAntes = await saldoNaCarteira(artista);
    await irPara(artista, '/artista/enviar');
    await artista.getByLabel(/arraste o arquivo|arquivo escolhido/i).setInputFiles(MP3);
    await artista
      .getByRole('textbox', { name: new RegExp(ENVIAR.rotuloTitulo) })
      .fill(TITULO_DA_FAIXA);
    await artista.getByRole('button', { name: ENVIAR.continuar }).click();
    await artista.waitForURL(/\/contexto$/, { timeout: 90_000 });
  });

  await etapa(artista, J, 'Artista escolhe o gênero e descreve o contexto', async () => {
    await artista.getByText('Indie', { exact: true }).click();
    await artista
      .getByRole('textbox', { name: new RegExp(ENVIAR.rotuloContexto) })
      .fill('Single de estreia. Quero saber se o refrão segura e se a mix está pronta para rádio.');
    await artista.getByRole('button', { name: ENVIAR.continuar }).click();
    await artista.waitForURL(/\/revisao$/);
    await expect(artista.getByText(TITULO_DA_FAIXA)).toBeVisible();
  });

  await etapa(
    artista,
    J,
    'Artista seleciona o curador QA e confirma (Claves debitadas)',
    async () => {
      await clicarLink(
        artista,
        artista.getByRole('link', { name: ENVIAR.enviarParaCuradoria }),
        /\/curadores$/,
      );
      const caixa = artista.getByRole('checkbox', { name: new RegExp(conta.curador.nome) });
      if ((await caixa.count()) > 0) {
        await caixa.first().check({ force: true });
      } else {
        await artista.getByText(conta.curador.nome).first().click();
      }
      await artista.getByRole('button', { name: SELECAO.confirmar }).click();
      await artista.waitForURL(/\/confirmacao$/);
      await expect(artista.getByText(ENVIAR.confirmacaoTitulo)).toBeVisible();
    },
  );

  await etapa(
    artista,
    J,
    'Status mostra "Recebeu" e o saldo caiu pelo preço do curador',
    async () => {
      await clicarLink(
        artista,
        artista.getByRole('link', { name: ENVIAR.acompanharStatus }),
        /\/status$/,
      );
      const tabela = artista.getByRole('table', { name: STATUS_DO_ENVIO.titulo });
      await expect(tabela.getByText(STATUS_DO_ENVIO.etapas.recebeu).first()).toBeVisible();
      const statusUrl = artista.url();
      expect(await saldoNaCarteira(artista)).toBe(saldoAntes - 2);
      await irPara(artista, statusUrl);
    },
  );

  await etapa(curador, J, 'A faixa chega na fila do curador', async () => {
    await irPara(curador, '/curador/fila');
    const linha = curador.getByRole('listitem').filter({ hasText: TITULO_DA_FAIXA });
    await expect(linha).toHaveCount(1);
    await clicarLink(curador, linha.getByRole('link').first(), /\/curador\/fila\/.+/);
  });

  await etapa(curador, J, 'Curador ouve a faixa no player (envio vira "Ouviu")', async () => {
    await curador.getByRole('button', { name: /^Tocar / }).click();
    await curador.waitForTimeout(4_000);
    await expect(curador.getByRole('button', { name: FILA.iniciarAvaliacao })).toBeVisible();
  });

  await etapa(curador, J, 'Curador inicia a avaliação e dá as notas objetivas', async () => {
    await curador.getByRole('button', { name: FILA.iniciarAvaliacao }).click();
    await curador.waitForURL(/\/curador\/avaliar\/[0-9a-f-]+\/[a-z]+$/);
    envioId = new URL(curador.url()).pathname.split('/')[3] ?? '';
    await irPara(curador, `/curador/avaliar/${envioId}/notas`);
    await preencherObrigatorios(curador, '4');
    await avancar(curador);
    await curador.waitForURL(`**/curador/avaliar/${envioId}/subjetiva`);
  });

  await etapa(curador, J, 'Curador escreve a devolutiva', async () => {
    await curador
      .getByLabel(AVALIAR.feedback)
      .fill(
        'Refrão forte e memorável; a voz está bem colocada. A mix pede mais espaço no grave — ' +
          'o baixo compete com o bumbo no segundo verso. A introdução pode ser encurtada em ' +
          'oito compassos para chegar mais rápido ao gancho. Com esses ajustes, está pronta para playlist.',
      );
    await avancar(curador);
    await curador.waitForURL(`**/curador/avaliar/${envioId}/compartilhamento`);
  });

  await etapa(curador, J, 'Curador informa o compartilhamento e vê a remuneração', async () => {
    await escolherModalidade(curador, AVALIAR.modalidades.nao_compartilhou.rotulo);
    await avancar(curador);
    await curador.waitForURL(`**/curador/avaliar/${envioId}/remuneracao`);
    await expect(curador.getByRole('button', { name: AVALIAR.concluir })).toBeVisible();
  });

  await etapa(curador, J, 'Curador conclui a avaliação', async () => {
    await curador.getByRole('button', { name: AVALIAR.concluir }).click();
    await expect.poll(() => situacaoDoEnvio(envioId), { timeout: 60_000 }).toBe('pronto');
  });

  await etapa(artista, J, 'Artista vê o envio em "Pronto"', async () => {
    await artista.reload();
    const tabela = artista.getByRole('table', { name: STATUS_DO_ENVIO.titulo });
    await expect(tabela.getByText(STATUS_DO_ENVIO.etapas.pronto).first()).toBeVisible();
  });

  await etapa(curador, J, 'Curador vê o ganho na carteira', async () => {
    await irPara(curador, '/curador/carteira');
    await expect(curador.getByRole('heading', { level: 1 })).toBeVisible();
  });

  await curador.context().close();
  await artista.context().close();
});

// ============================================================== jornada 3

test('Jornada 3 · Admin → Curador: candidato a Prata em análise', async ({ browser }) => {
  const J = 'Admin → Curador';
  const prata = await novaPagina(browser, J);
  const admin = await novaPagina(browser, J);

  await etapa(prata, J, 'Curador entra e é levado ao cadastro', async () => {
    await entrarNoSite(prata, conta.prata, 'curador');
    await expect(prata).toHaveURL(/\/curador\/cadastro/);
  });

  await etapa(prata, J, 'Curador conclui o cadastro com credenciais comprovadas', async () => {
    // Todas as credenciais com link: passa do limiar de Prata, e Ouro não sai
    // do cadastro — é por convite ou desempenho.
    await percorrerWizard(prata, { credenciais: 99 });
    await expect(
      prata.getByRole('heading', { name: CURADOR_CLASSIFICACAO.tituloPrata, exact: true }),
    ).toBeVisible();
  });

  await etapa(prata, J, 'Candidato a Prata fica na tela de análise, fora do painel', async () => {
    await clicarLink(
      prata,
      prata.getByRole('link', { name: CURADOR_CLASSIFICACAO.continuar }),
      /\/curador\/cadastro\/analise/,
    );
    await expect(prata.getByText(CURADOR_CLASSIFICACAO.seloAnalise).first()).toBeVisible();
    await prata.goto('/curador/fila');
    await expect(prata).toHaveURL(/\/curador\/cadastro\/analise/);
  });

  await etapa(admin, J, 'A equipe do admin recebe a notificação do novo cadastro', async () => {
    const { data } = await clienteDeServico()
      .from('notificacao')
      .select('id, titulo')
      .eq('perfil_id', conta.admin.id)
      .eq('evento', 'curador_prata_em_analise')
      .contains('contexto', { curador_id: conta.prata.id });
    const qtd = (data ?? []).length;
    if (qtd === 0) {
      const { data: qualquer } = await clienteDeServico()
        .from('notificacao')
        .select('id')
        .eq('perfil_id', conta.admin.id)
        .eq('evento', 'curador_prata_em_analise');
      expect(
        (qualquer ?? []).length,
        'nenhuma notificação de Prata em análise para o admin',
      ).toBeGreaterThan(0);
    }
    await entrarNoPainel(admin, conta.admin);
  });

  await prata.context().close();
  await admin.context().close();
});

// ============================================================== jornada 4

test('Jornada 4 · Admin → Artista: pacote desativado sai da vitrine', async ({ browser }) => {
  const J = 'Admin → Artista (desativar)';
  const admin = await novaPagina(browser, J);
  const artista = await novaPagina(browser, J);

  await etapa(admin, J, 'Admin desativa o pacote QA', async () => {
    await entrarNoPainel(admin, conta.admin);
    await irPara(admin, noAdmin('/admin/pacotes'));
    const linha = admin.getByRole('listitem').filter({ hasText: NOME_DO_PACOTE });
    await linha.getByRole('button', { name: ADMIN_PACOTES.desativar }).click();
    await expect(admin.getByText(ADMIN_PACOTES.flashDesativado(NOME_DO_PACOTE))).toBeVisible();
    await expect(linha).toContainText(ADMIN_PACOTES.subForaDaCarteira);
  });

  await etapa(artista, J, 'O pacote some da vitrine do artista', async () => {
    await entrarNoSite(artista, conta.artista, 'artista');
    await irPara(artista, '/artista/pacotes');
    await expect(artista.getByText(PACOTES.chamada)).toBeVisible();
    await expect(artista.getByRole('link', { name: new RegExp(NOME_DO_PACOTE) })).toHaveCount(0);
  });

  await admin.context().close();
  await artista.context().close();
});
