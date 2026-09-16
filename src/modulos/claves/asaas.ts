import 'server-only';

/**
 * Cliente HTTP do Asaas — cliente, cobrança por Pix e por cartão.
 *
 * O crédito de Pix **não** acontece aqui: quem confirma é o webhook
 * (`/api/webhooks/asaas`), quando o Asaas avisa que o Pix caiu. O cartão é
 * síncrono — a resposta da cobrança já diz se foi autorizado.
 *
 * Verificado contra o sandbox em 2026-09-16:
 *
 *  - autentica pelo header **`access_token`**, não `Authorization`;
 *  - cliente exige `cpfCnpj` **válido** para gerar cobrança;
 *  - `externalReference` volta intacto no webhook — é por ele que o
 *    `pedido_clave.id` viaja;
 *  - o primeiro `pixQrCode` de uma conta nova pode falhar com "não possui
 *    chave Pix" mesmo com chave ativa (propagação). Daí o retry.
 */

const BASE_PADRAO = 'https://api-sandbox.asaas.com/v3';

function configuracao(): { readonly base: string; readonly chave: string } {
  const chave = process.env.ASAAS_API_KEY;
  if (chave === undefined || chave.trim() === '') {
    throw new Error('Variável de ambiente ausente: ASAAS_API_KEY.');
  }
  return { base: process.env.ASAAS_BASE_URL ?? BASE_PADRAO, chave };
}

export class ErroAsaas extends Error {
  readonly status: number;
  readonly codigos: readonly string[];

  constructor(status: number, codigos: readonly string[]) {
    super(`Asaas respondeu ${status}: ${codigos.join(', ')}`);
    this.name = 'ErroAsaas';
    this.status = status;
    this.codigos = codigos;
  }
}

async function chamar<T>(metodo: 'GET' | 'POST', caminho: string, corpo?: unknown): Promise<T> {
  const { base, chave } = configuracao();
  const resposta = await fetch(`${base}${caminho}`, {
    method: metodo,
    headers: {
      access_token: chave,
      'content-type': 'application/json',
      'user-agent': 'dissona',
    },
    ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });

  const dados = (await resposta.json().catch(() => ({}))) as {
    errors?: readonly { code?: string; description?: string }[];
  };
  if (!resposta.ok) {
    // Só o código: a descrição pode ecoar dado pessoal enviado (CPF, e-mail).
    throw new ErroAsaas(
      resposta.status,
      (dados.errors ?? []).map((e) => e.code ?? 'desconhecido'),
    );
  }
  return dados as T;
}

export type ClienteAsaas = { readonly id: string };

/** Reaproveita o cliente do mesmo CPF, em vez de criar um por compra. */
export async function buscarClientePorCpf(cpf: string): Promise<ClienteAsaas | null> {
  const lista = await chamar<{ readonly data?: readonly ClienteAsaas[] }>(
    'GET',
    `/customers?cpfCnpj=${encodeURIComponent(cpf)}&limit=1`,
  );
  return lista.data?.[0] ?? null;
}

export function criarCliente(dados: {
  readonly nome: string;
  readonly cpfCnpj: string;
  readonly email?: string;
  /** O `perfil.id` — permite achar o cliente de novo sem guardar o id dele. */
  readonly referencia: string;
}): Promise<ClienteAsaas> {
  return chamar<ClienteAsaas>('POST', '/customers', {
    name: dados.nome,
    cpfCnpj: dados.cpfCnpj,
    ...(dados.email === undefined ? {} : { email: dados.email }),
    externalReference: dados.referencia,
    notificationDisabled: true,
  });
}

export type CobrancaAsaas = { readonly id: string; readonly status: string };

/** Centavos inteiros para o valor em reais que a API recebe. */
export function paraReais(centavos: bigint): number {
  return Number(`${centavos / 100n}.${(centavos % 100n).toString().padStart(2, '0')}`);
}

type DadosDaCobranca = {
  readonly clienteId: string;
  readonly valorCentavos: bigint;
  readonly pedidoId: string;
  readonly descricao: string;
  /** `YYYY-MM-DD`. */
  readonly vencimento: string;
};

export function criarCobrancaPix(dados: DadosDaCobranca): Promise<CobrancaAsaas> {
  return chamar<CobrancaAsaas>('POST', '/payments', {
    customer: dados.clienteId,
    billingType: 'PIX',
    value: paraReais(dados.valorCentavos),
    dueDate: dados.vencimento,
    description: dados.descricao,
    externalReference: dados.pedidoId,
  });
}

export type DadosDoCartao = {
  readonly titular: string;
  readonly numero: string;
  readonly mes: string;
  readonly ano: string;
  readonly cvv: string;
};

export type TitularDoCartao = {
  readonly nome: string;
  readonly email: string;
  readonly cpf: string;
  readonly cep: string;
  readonly telefone: string;
};

/**
 * Cobrança por cartão, autorizada na hora.
 *
 * Recusa do emissor chega como **400** com `invalid_action` — não como uma
 * cobrança com status de recusa. O chamador distingue as duas coisas por
 * `ehRecusaDoCartao`.
 *
 * ⚠️ Os dados do cartão só existem dentro desta chamada. Não logar `dados`,
 * não devolvê-los, não os anexar a erro.
 */
export function criarCobrancaCartao(
  dados: DadosDaCobranca & {
    readonly cartao: DadosDoCartao;
    readonly titular: TitularDoCartao;
    readonly ipRemoto: string | null;
  },
): Promise<CobrancaAsaas> {
  return chamar<CobrancaAsaas>('POST', '/payments', {
    customer: dados.clienteId,
    billingType: 'CREDIT_CARD',
    value: paraReais(dados.valorCentavos),
    dueDate: dados.vencimento,
    description: dados.descricao,
    externalReference: dados.pedidoId,
    creditCard: {
      holderName: dados.cartao.titular,
      number: dados.cartao.numero,
      expiryMonth: dados.cartao.mes,
      expiryYear: dados.cartao.ano,
      ccv: dados.cartao.cvv,
    },
    creditCardHolderInfo: {
      name: dados.titular.nome,
      email: dados.titular.email,
      cpfCnpj: dados.titular.cpf,
      postalCode: dados.titular.cep,
      // O Asaas exige o número do endereço junto do CEP em produção, e a tela
      // não o pede: "S/N" é o valor que a própria documentação aceita.
      addressNumber: 'S/N',
      phone: dados.titular.telefone,
    },
    ...(dados.ipRemoto === null ? {} : { remoteIp: dados.ipRemoto }),
  });
}

/** A recusa do emissor, e não uma falha nossa ou de configuração. */
export function ehRecusaDoCartao(erro: unknown): boolean {
  return (
    erro instanceof ErroAsaas &&
    erro.status === 400 &&
    erro.codigos.some((c) => c === 'invalid_action' || c === 'invalid_creditCard')
  );
}

export type QrCodePix = {
  /** PNG em base64, sem o prefixo `data:`. */
  readonly encodedImage: string;
  /** O "copia e cola". */
  readonly payload: string;
  readonly expirationDate: string;
};

export async function lerQrCodePix(cobrancaId: string, tentativas = 3): Promise<QrCodePix> {
  for (let tentativa = 1; ; tentativa += 1) {
    try {
      return await chamar<QrCodePix>(
        'GET',
        `/payments/${encodeURIComponent(cobrancaId)}/pixQrCode`,
      );
    } catch (erro) {
      if (tentativa >= tentativas) throw erro;
      await new Promise((resolver) => setTimeout(resolver, 1000 * tentativa));
    }
  }
}
