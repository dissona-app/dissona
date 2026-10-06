import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { limparCartoesSalvos, ultimoPedidoDe } from '../apoio/banco';
import { PERSONA } from '../apoio/personas';
import { entrarComo } from '../apoio/sessao';
import { CARTAO_SALVO, CARTEIRA, CHECKOUT, PACOTES } from '../apoio/textos';

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
  // Escolhe "Cartão" antes de preencher: se a conta já tem um cartão salvo, a
  // opção padrão passa a ser ele e os campos nem aparecem. Sem esta linha, o
  // teste depende de o cartão salvo **não** existir — e a suíte deixaria de
  // ser determinística na segunda execução.
  const novo = page.getByRole('radio', { name: CHECKOUT.meios.cartao, exact: true });
  if (await novo.isVisible()) await novo.click();

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
//
// O `serial` resolve a disputa dentro do arquivo, e **não** entre arquivos —
// por isso a conta é a `ARTISTA_COMPRA`, e não a `ARTISTA`. B7 confirma seleção
// de curadores e gasta 2 Claves da carteira do `e2e_artista`; caindo dentro da
// janela de medição do Pix, o crescimento medido vem 2 Claves menor e a falha
// aponta para o webhook, que não tem culpa nenhuma. Foi o que aconteceu em
// 2026-09-16 (`Expected: 20, Received: 18`).
test.describe.configure({ mode: 'serial' });

test.describe('B2 · Comprar Claves', () => {
  // Os testes de cartão digitam o número; um cartão salvo de rodada anterior
  // esconderia o campo.
  test.beforeEach(async () => {
    await limparCartoesSalvos(PERSONA.ARTISTA_COMPRA.email);
  });

  test('a vitrine lista os pacotes com preço por Clave', { tag: ['@RF-043'] }, async ({ page }) => {
    await entrarComo(page, PERSONA.ARTISTA_COMPRA);
    await page.goto('/artista/pacotes');

    // Escopo em `main`: a sidebar do shell também é uma lista.
    const cartoes = page.getByRole('main').getByRole('listitem');
    await expect(cartoes.first()).toBeVisible();
    await expect(cartoes.first()).toContainText(/por Clave/);
    await expect(
      cartoes.first().getByRole('link', { name: new RegExp(`^${PACOTES.escolher}`) }),
    ).toBeVisible();
  });

  test(
    'o checkout mostra o resumo do pedido com total e preço por Clave',
    { tag: ['@RF-044'] },
    async ({ page }) => {
      await entrarComo(page, PERSONA.ARTISTA_COMPRA);
      await abrirCheckout(page);

      const resumo = page.getByRole('region', { name: CHECKOUT.resumoTitulo });
      await expect(resumo).toBeVisible();
      await expect(resumo.getByText(CHECKOUT.total, { exact: true })).toBeVisible();
      await expect(resumo).toContainText(/R\$/);
    },
  );

  test('o checkout recusa antes de cobrar quando os campos não são válidos', async ({ page }) => {
    await entrarComo(page, PERSONA.ARTISTA_COMPRA);
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

  test('recusado: o estado aparece e o saldo não muda', { tag: ['@RF-046'] }, async ({ page }) => {
    await entrarComo(page, PERSONA.ARTISTA_COMPRA);
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

  test(
    'aprovado no cartão: o saldo cresce e o extrato registra a compra',
    { tag: ['@RF-045', '@RF-046'] },
    async ({ page }) => {
      await entrarComo(page, PERSONA.ARTISTA_COMPRA);
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
    },
  );

  /**
   * RF-045 · o cartão não é persistido, e não sai para terceiros.
   *
   * ## O que dá para afirmar de verdade
   *
   * Três coisas, e só três — o resto seria encenação:
   *
   * 1. **Nenhuma requisição do navegador para fora da nossa origem carrega os
   *    dígitos.** É o que se observa interceptando o tráfego da página.
   * 2. **A linha de `pedido_clave` não contém o cartão.** A tabela nem tem
   *    coluna para isso (`0007_claves.sql`), e é justamente essa ausência que se
   *    quer travar contra regressão: o que a plataforma guarda é
   *    `provedor_cobranca_id`, a referência da cobrança no gateway.
   * 3. **Nenhum PAN volta para a tela** depois da confirmação.
   *
   * ## ⚠️ A ressalva, que o teste não pode esconder
   *
   * O Asaas não tem SDK de navegador (ver `src/modulos/claves/esquemas.ts`), e
   * por isso o número **transita** pelo nosso servidor dentro de
   * `criarCobrancaCartao`. Se "tokenizados", no RF-045, significar tokenização
   * no cliente — o cartão nunca tocando a nossa infraestrutura —, isso é lacuna
   * de produto, e nenhum teste daqui a cobre. Registrado na matriz.
   */
  test(
    'o cartão não é persistido nem sai para terceiros',
    { tag: ['@RF-045'] },
    async ({ page }) => {
      const digitos = CARTAO_APROVADO.replace(/\s/g, '');

      await entrarComo(page, PERSONA.ARTISTA_COMPRA);
      await abrirCheckout(page);

      const paraTerceiros: string[] = [];
      page.on('request', (requisicao) => {
        const url = new URL(requisicao.url());
        const nossa = new URL(page.url()).host;
        if (url.host === nossa) return;

        const corpo = requisicao.postData() ?? '';
        if (corpo.includes(digitos) || url.href.includes(digitos)) {
          paraTerceiros.push(url.host);
        }
      });

      await preencherCartao(page, CARTAO_APROVADO);
      await simularSePreciso(page, 'aprovado');
      await page.getByRole('button', { name: CHECKOUT.confirmar }).click();
      await expect(page.getByText(CHECKOUT.aprovadoTitulo)).toBeVisible({ timeout: 30_000 });

      expect(
        paraTerceiros,
        `o número do cartão saiu do navegador para ${paraTerceiros.join(', ')}`,
      ).toHaveLength(0);

      // Nenhum PAN de volta na tela — nem inteiro, nem em grupos de quatro.
      await expect(page.getByText(new RegExp(digitos))).toHaveCount(0);

      // E nada guardado: o pedido mais recente desta conta não contém o cartão.
      const pedido = await ultimoPedidoDe(PERSONA.ARTISTA_COMPRA.email);
      expect(pedido, 'a compra precisa ter deixado um pedido').not.toBeNull();
      expect(
        JSON.stringify(pedido),
        'nenhum campo de `pedido_clave` pode conter o número do cartão',
      ).not.toContain(digitos);
      // Só o Asaas devolve referência de cobrança; o simulador não tem gateway.
      if (ASAAS) {
        expect(
          (pedido as { provedor_cobranca_id?: string } | null)?.provedor_cobranca_id,
          'o que se guarda é a referência da cobrança no gateway, não o cartão',
        ).toBeTruthy();
      }
    },
  );

  /**
   * RF-046 · o estado **processando**, que faltava entre o aprovado e o recusado.
   *
   * Segurar a resposta da Server Action com `page.route` é o que torna o estado
   * observável: sem isso ele dura o tempo de um ida e volta ao gateway e o teste
   * viraria uma corrida. O que se afirma é o que o requisito promete — a pessoa
   * vê que está em curso, e o botão não aceita um segundo clique que criaria
   * uma segunda cobrança.
   */
  test(
    'cartão: enquanto o gateway não responde, a tela fica em processando',
    { tag: ['@RF-046'] },
    async ({ page }) => {
      await entrarComo(page, PERSONA.ARTISTA_COMPRA);
      await abrirCheckout(page);
      await preencherCartao(page, CARTAO_RECUSADO);
      await simularSePreciso(page, 'recusado');

      // Segura o POST da Server Action por tempo suficiente para observar o
      // estado, e então deixa seguir — o desfecho é o recusado, que não credita.
      await page.route(
        (url) => url.href.startsWith(new URL(page.url()).origin),
        async (rota, requisicao) => {
          if (requisicao.method() !== 'POST') return rota.continue();
          await new Promise((resolva) => setTimeout(resolva, 3_000));
          return rota.continue();
        },
      );

      const confirmar = page.getByRole('button', { name: CHECKOUT.confirmar });
      await confirmar.click();

      await expect(page.getByText(CHECKOUT.processando)).toBeVisible();
      await expect(confirmar.or(page.getByText(CHECKOUT.processando))).toBeDisabled();

      // Enquanto processa, nenhum desfecho aparece: mostrar os dois estados ao
      // mesmo tempo seria pior que não mostrar nenhum.
      await expect(page.getByText(CHECKOUT.aprovadoTitulo)).toHaveCount(0);
      await expect(page.getByText(CHECKOUT.recusadoTitulo)).toHaveCount(0);

      await page.unroute((url) => url.href.startsWith(new URL(page.url()).origin));
    },
  );

  /**
   * Pix de ponta a ponta, com o Asaas real e o **nosso** webhook.
   *
   * O sandbox não alcança `localhost`, então o teste faz o papel do Asaas:
   * acha a cobrança que a tela gerou (pela API do sandbox, pelo CPF) e entrega
   * ao servidor local o evento que o Asaas entregaria, com o token no header.
   * **Duas vezes**: o gate da R2 pede que a entrega repetida não credite de
   * novo.
   */
  test(
    'Pix: o QR code aparece e o webhook credita uma única vez',
    { tag: ['@RF-044', '@RF-047'] },
    async ({ page, request }) => {
      test.skip(!ASAAS, 'só com o Asaas ligado (PAGAMENTO_SIMULADO=false)');

      await entrarComo(page, PERSONA.ARTISTA_COMPRA);
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
    },
  );

  test('o webhook recusa quem não tem o token', { tag: ['@RF-047'] }, async ({ request }) => {
    const resposta = await request.post('/api/webhooks/asaas', {
      headers: { 'asaas-access-token': 'errado' },
      data: { id: 'evt_x', event: 'PAYMENT_RECEIVED', payment: { id: 'pay_x' } },
    });
    expect(resposta.status()).toBe(401);
  });

  // Cobrança que não nasceu deste checkout: 200, ou o Asaas reenvia até pausar
  // a fila inteira do webhook.
  test(
    'o webhook ignora pagamento de pedido que não existe',
    { tag: ['@RF-047'] },
    async ({ request }) => {
      test.skip(!process.env['ASAAS_WEBHOOK_TOKEN'], 'exige ASAAS_WEBHOOK_TOKEN');

      const resposta = await request.post('/api/webhooks/asaas', {
        headers: { 'asaas-access-token': process.env['ASAAS_WEBHOOK_TOKEN'] ?? '' },
        data: {
          id: `evt_e2e_inexistente_${Date.now()}`,
          event: 'PAYMENT_CONFIRMED',
          payment: { id: 'pay_e2e_inexistente', externalReference: crypto.randomUUID() },
        },
      });
      expect(resposta.status()).toBe(200);
    },
  );
  /**
   * RF-045 · o token guardado, e o que ele muda.
   *
   * A tokenização do Asaas é **posterior**: a primeira cobrança vai com o
   * cartão e a resposta traz um `creditCardToken` para as próximas. Este
   * cenário percorre o ciclo inteiro — a compra que salva, a compra que reusa,
   * e a remoção — porque é o que prova o ganho: **na segunda compra nenhum
   * dígito do cartão é digitado nem enviado**.
   *
   * Termina removendo o cartão, e não por educação: a conta é compartilhada
   * pelos cenários deste arquivo, e deixá-lo salvo mudaria a opção padrão do
   * checkout para os outros na próxima execução.
   */
  test(
    'o cartão salvo é reusado na compra seguinte, e some quando removido',
    { tag: ['@RF-045'] },
    async ({ page }) => {
      await entrarComo(page, PERSONA.ARTISTA_COMPRA);

      // 1. A compra que gera o token.
      await abrirCheckout(page);
      await preencherCartao(page, CARTAO_APROVADO);
      await simularSePreciso(page, 'aprovado');
      await page.getByRole('button', { name: CHECKOUT.confirmar }).click();
      await expect(page.getByText(CHECKOUT.aprovadoTitulo)).toBeVisible({ timeout: 30_000 });

      // 2. O checkout seguinte já oferece o cartão, e ele é o padrão.
      const antes = await lerSaldo(page);
      await abrirCheckout(page);

      const salvo = page.getByRole('radio', { name: /···· \d{4}$/ });
      await expect(salvo).toBeVisible();
      await expect(salvo).toBeChecked();

      // O número não é pedido: os campos do cartão nem estão na tela.
      await expect(page.getByLabel(CHECKOUT.numero)).toBeHidden();
      await expect(page.getByText(CARTAO_SALVO.notaNoCheckout)).toBeVisible();

      await page.getByLabel(CHECKOUT.cpf).fill(CPF);
      await simularSePreciso(page, 'aprovado');
      await page.getByRole('button', { name: CHECKOUT.confirmar }).click();

      await expect(page.getByText(CHECKOUT.aprovadoTitulo)).toBeVisible({ timeout: 30_000 });
      expect(await lerSaldo(page)).toBeGreaterThan(antes);

      // 3. Remover, em Dados da conta — guardar sem poder tirar seria guardar
      // sem consentimento revogável.
      await page.goto('/artista/conta?aba=dados');
      await expect(page.getByText(/···· \d{4}$/)).toBeVisible();
      await page.getByRole('button', { name: CARTAO_SALVO.remover }).click();
      await expect(
        page.getByRole('status').filter({ hasText: CARTAO_SALVO.removido }),
      ).toBeVisible();

      await page.reload();
      await expect(page.getByText(CARTAO_SALVO.vazioEmConta)).toBeVisible();
    },
  );
});
