import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { PERSONA } from '../apoio/personas';
import { entrarComo } from '../apoio/sessao';
import { CARTEIRA, CHECKOUT, PACOTES } from '../apoio/textos';

/**
 * B2 · Comprar Claves — módulo 5.1 · 5.2
 *
 * Cenário do [Guia de Testes da R2](../../docs/R2/guia-de-testes-r2.md), que é
 * o gate da release.
 *
 * **Passos**
 * 1. Clique em Comprar Claves e escolha um pacote.
 * 1. No checkout, escolha Cartão ou Pix e confirme.
 * 1. Teste os dois resultados (aprovado e recusado).
 *
 * **Resultado esperado**
 * - Estados Processando / Aprovado / Recusado aparecem.
 * - No aprovado, o saldo atualiza; no recusado, nada é cobrado.
 *
 * ## Os dois provedores
 *
 * Com `PAGAMENTO_SIMULADO=false` o checkout fala com o **sandbox do Asaas**, e
 * o desfecho vem do cartão de teste: `5162…8829` autoriza, `5184…3151` é
 * negado pelo emissor. Sem a variável, o simulador do protótipo decide pelo
 * seletor "Simular resultado". Os testes funcionam nos dois modos; o do Pix
 * com webhook só faz sentido com o Asaas.
 *
 * ## O que este cenário exige do ambiente
 *
 * `SUPABASE_SERVICE_ROLE_KEY`: confirmar e recusar passam por RPCs revogadas
 * até de `authenticated`. Com o Asaas, também `ASAAS_API_KEY` e
 * `ASAAS_WEBHOOK_TOKEN`.
 *
 * ⚠️ **Este cenário escreve**: cada compra aprovada credita um pacote na
 * carteira de `e2e_artista`, e o ledger é append-only. Por isso B1 e B3
 * afirmam estrutura, nunca os números do seed.
 */

const ASAAS = process.env['PAGAMENTO_SIMULADO'] === 'false';

/** CPF válido de teste — o sandbox só exige que os dígitos verificadores fechem. */
const CPF = '529.982.247-25';

/** Cartões de teste do sandbox do Asaas: o primeiro autoriza, o segundo é negado. */
const CARTAO_APROVADO = '5162 3062 1937 8829';
const CARTAO_RECUSADO = '5184 0197 4037 3151';

/**
 * O saldo da Carteira como número, para comparar antes e depois.
 *
 * Localizado pela forma do próprio texto — "25,00 Claves" — e não por um
 * `data-testid`: os outros números da Carteira vêm sem a unidade, então o
 * padrão é único.
 */
async function lerSaldo(page: Page): Promise<number> {
  await page.goto('/artista/carteira');

  const bruto = await page
    .locator('p')
    .filter({ hasText: new RegExp(`^[\\d.,]+\\s*${CARTEIRA.saldoUnidade}$`) })
    .first()
    .innerText();

  return Number(
    bruto.replace(CARTEIRA.saldoUnidade, '').trim().replace(/\./g, '').replace(',', '.'),
  );
}

/** Da Carteira até o checkout do primeiro pacote, pelo caminho da pessoa. */
async function abrirCheckout(page: Page) {
  await page.goto('/artista/carteira');
  await page.getByRole('link', { name: CARTEIRA.comprar }).first().click();
  await page.waitForURL(/\/artista\/pacotes$/);

  await expect(page.getByText(PACOTES.chamada)).toBeVisible();

  await page
    .getByRole('link', { name: new RegExp(`^${PACOTES.escolher}`) })
    .first()
    .click();
  await page.waitForURL(/\/artista\/pacotes\/[0-9a-f-]{36}$/);
}

async function preencherCartao(page: Page, numero: string) {
  await page.getByLabel(CHECKOUT.cpf).fill(CPF);
  await page.getByLabel(CHECKOUT.numero).fill(numero);
  await page.getByLabel(CHECKOUT.nome).fill('E2E Artista');
  await page.getByLabel(CHECKOUT.validade).fill('12/30');
  await page.getByLabel(CHECKOUT.cvv).fill('123');
  await page.getByLabel(CHECKOUT.telefone).fill('11987654321');
  await page.getByLabel(CHECKOUT.cep).fill('01310100');
}

/** Com o simulador, o desfecho vem do seletor; com o Asaas, do cartão. */
async function simularSePreciso(page: Page, desfecho: 'aprovado' | 'recusado') {
  if (ASAAS) return;
  await page.getByRole('radio', { name: CHECKOUT.simulacoes[desfecho] }).click();
}

type CobrancaDoSandbox = {
  readonly id: string;
  readonly externalReference: string;
  readonly valor: number;
};

async function chamarAsaas<T>(metodo: 'GET' | 'DELETE', caminho: string): Promise<T> {
  const base = process.env['ASAAS_BASE_URL'] ?? 'https://api-sandbox.asaas.com/v3';
  const resposta = await fetch(`${base}${caminho}`, {
    method: metodo,
    // `.env.local` guarda a chave como `\$aact_…` — ver `e2e/setup/ambiente.ts`.
    headers: {
      access_token: (process.env['ASAAS_API_KEY'] ?? '').replace(/^\\\$/, '$'),
      'user-agent': 'dissona-e2e',
    },
  });
  return (await resposta.json()) as T;
}

/** A cobrança Pix pendente mais recente do CPF de teste — a que a tela gerou. */
async function ultimaCobrancaPix(): Promise<CobrancaDoSandbox> {
  const clientes = await chamarAsaas<{ data: { id: string }[] }>(
    'GET',
    `/customers?cpfCnpj=${CPF.replace(/\D/g, '')}&limit=1`,
  );
  const cliente = clientes.data[0];
  if (cliente === undefined) throw new Error('cliente do CPF de teste não encontrado no sandbox');

  const cobrancas = await chamarAsaas<{
    data: { id: string; externalReference: string; value: number }[];
  }>('GET', `/payments?customer=${cliente.id}&billingType=PIX&status=PENDING&limit=1`);
  const cobranca = cobrancas.data[0];
  if (cobranca === undefined) throw new Error('cobrança Pix pendente não encontrada no sandbox');

  return { id: cobranca.id, externalReference: cobranca.externalReference, valor: cobranca.value };
}

// Em série: três testes creditam ou leem a carteira da **mesma** conta, e o do
// Pix afirma o crescimento exato do saldo. Em paralelo, a compra de cartão de
// outro worker entra no meio e o teste acusa crédito em dobro que não houve.
test.describe.configure({ mode: 'serial' });

test.describe('B2 · Comprar Claves', () => {
  test('a vitrine lista os pacotes com preço por Clave', async ({ page }) => {
    await entrarComo(page, PERSONA.ARTISTA);
    await page.goto('/artista/pacotes');

    // Escopo em `main`: a sidebar do shell também é uma lista.
    const cartoes = page.getByRole('main').getByRole('listitem');
    await expect(cartoes.first()).toBeVisible();
    await expect(cartoes.first()).toContainText(/por Clave/);
    await expect(
      cartoes.first().getByRole('link', { name: new RegExp(`^${PACOTES.escolher}`) }),
    ).toBeVisible();
  });

  test('o checkout mostra o resumo do pedido com total e preço por Clave', async ({ page }) => {
    await entrarComo(page, PERSONA.ARTISTA);
    await abrirCheckout(page);

    const resumo = page.getByRole('region', { name: CHECKOUT.resumoTitulo });
    await expect(resumo).toBeVisible();
    await expect(resumo.getByText(CHECKOUT.total, { exact: true })).toBeVisible();
    await expect(resumo).toContainText(/R\$/);
  });

  test('o checkout recusa antes de cobrar quando os campos não são válidos', async ({ page }) => {
    await entrarComo(page, PERSONA.ARTISTA);
    await abrirCheckout(page);

    // O protótipo, sendo mock, **preenchia** os campos inválidos com valores
    // fictícios e seguia. Aqui o erro aparece no campo e a ação não roda.
    await page.getByRole('button', { name: CHECKOUT.confirmar }).click();

    await expect(page.getByText(CHECKOUT.erroCpf)).toBeVisible();
    await expect(page.getByText(CHECKOUT.erroCartaoNumero)).toBeVisible();
    await expect(page.getByText(CHECKOUT.erroTelefone)).toBeVisible();
    await expect(page.getByText(CHECKOUT.aprovadoTitulo)).toHaveCount(0);
    await expect(page.getByText(CHECKOUT.recusadoTitulo)).toHaveCount(0);
  });

  test('recusado: o estado aparece e o saldo não muda', async ({ page }) => {
    await entrarComo(page, PERSONA.ARTISTA);
    const antes = await lerSaldo(page);

    await abrirCheckout(page);
    await preencherCartao(page, CARTAO_RECUSADO);
    await simularSePreciso(page, 'recusado');
    await page.getByRole('button', { name: CHECKOUT.confirmar }).click();

    await expect(page.getByText(CHECKOUT.recusadoTitulo)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(CHECKOUT.recusadoTexto)).toBeVisible();

    // "Nada foi debitado e o saldo continua o mesmo" é a promessa da tela.
    expect(await lerSaldo(page)).toBe(antes);
  });

  test('aprovado no cartão: o saldo cresce e o extrato registra a compra', async ({ page }) => {
    await entrarComo(page, PERSONA.ARTISTA);
    const antes = await lerSaldo(page);

    await abrirCheckout(page);
    await preencherCartao(page, CARTAO_APROVADO);
    await simularSePreciso(page, 'aprovado');
    await page.getByRole('button', { name: CHECKOUT.confirmar }).click();

    await expect(page.getByText(CHECKOUT.aprovadoTitulo)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/entraram na sua carteira/)).toBeVisible();

    expect(await lerSaldo(page)).toBeGreaterThan(antes);

    await page.goto('/artista/carteira/extrato');
    await expect(
      page.getByRole('row').filter({ hasText: CARTEIRA.tipos.compra }).first(),
    ).toBeVisible();
  });

  /**
   * Pix de ponta a ponta, com o Asaas real e o **nosso** webhook.
   *
   * O sandbox não alcança `localhost`, então o teste faz o papel do Asaas:
   * acha a cobrança que a tela gerou (pela API do sandbox, pelo CPF) e entrega
   * ao servidor local o evento que o Asaas entregaria, com o token no header.
   * **Duas vezes**: o gate da R2 pede que a entrega repetida não credite de
   * novo.
   */
  test('Pix: o QR code aparece e o webhook credita uma única vez', async ({ page, request }) => {
    test.skip(!ASAAS, 'só com o Asaas ligado (PAGAMENTO_SIMULADO=false)');

    await entrarComo(page, PERSONA.ARTISTA);
    const antes = await lerSaldo(page);

    await abrirCheckout(page);

    // Quantas Claves o pacote dá, lido do resumo ("20 Claves") — o seed de
    // pacotes muda, e o teste não pode fixá-lo.
    const linhaDoPacote = await page
      .getByRole('region', { name: CHECKOUT.resumoTitulo })
      .getByText(/^[\d.,]+ Claves$/)
      .first()
      .innerText();
    const pacote = Number(
      linhaDoPacote.replace(' Claves', '').replace(/\./g, '').replace(',', '.'),
    );

    await page.getByRole('radio', { name: CHECKOUT.meios.pix }).click();
    await page.getByLabel(CHECKOUT.cpf).fill(CPF);
    await page.getByRole('button', { name: CHECKOUT.confirmar }).click();

    await expect(page.getByText(CHECKOUT.pixAguardandoTitulo)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('img', { name: CHECKOUT.pixQrAlt })).toBeVisible();
    await expect(page.getByLabel(CHECKOUT.pixCodigoRotulo)).toHaveValue(/^0002/);

    const cobranca = await ultimaCobrancaPix();

    for (const entrega of [1, 2]) {
      const resposta = await request.post('/api/webhooks/asaas', {
        headers: { 'asaas-access-token': process.env['ASAAS_WEBHOOK_TOKEN'] ?? '' },
        data: {
          id: `evt_e2e_${cobranca.id}`,
          event: 'PAYMENT_RECEIVED',
          payment: { id: cobranca.id, externalReference: cobranca.externalReference },
        },
      });
      expect(resposta.status(), `entrega ${entrega}`).toBe(200);
    }

    // A tela percebe sozinha, sem recarregar.
    await expect(page.getByText(CHECKOUT.aprovadoTitulo)).toBeVisible({ timeout: 20_000 });

    // Creditou uma vez só: o saldo cresce exatamente um pacote.
    expect((await lerSaldo(page)) - antes).toBe(pacote);

    await chamarAsaas('DELETE', `/payments/${cobranca.id}`);
  });

  test('o webhook recusa quem não tem o token', async ({ request }) => {
    const resposta = await request.post('/api/webhooks/asaas', {
      headers: { 'asaas-access-token': 'errado' },
      data: { id: 'evt_x', event: 'PAYMENT_RECEIVED', payment: { id: 'pay_x' } },
    });
    expect(resposta.status()).toBe(401);
  });
});
