import { randomBytes } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { test } from '@playwright/test';
import type { Locator, Page, Response } from '@playwright/test';

import { clienteDeServico } from '../e2e/apoio/banco';

/**
 * Apoio do QA de aceite: contas `qa_*`, registro de etapas com captura de tela
 * e a contagem das respostas 5xx da hospedagem.
 *
 * Tudo o que é gerado vai para `qa/resultado/` (gitignored) — inclusive a
 * senha das contas, que nunca entra no repositório.
 */

export const PASTA = join(process.cwd(), 'qa', 'resultado');
const CAPTURAS = join(PASTA, 'capturas');
const LOG = join(PASTA, 'etapas.jsonl');
const CONTAS = join(PASTA, 'contas.json');
const FALHAS_5XX = join(PASTA, 'respostas-5xx.jsonl');

mkdirSync(CAPTURAS, { recursive: true });

export const DOMINIO_QA = 'e2e.dissona.local';

export type ContaQa = {
  readonly chave: string;
  readonly id: string;
  readonly email: string;
  readonly senha: string;
  readonly nome: string;
  readonly papel: string;
};

type Contas = Record<string, ContaQa>;

function lerContas(): Contas {
  return existsSync(CONTAS) ? (JSON.parse(readFileSync(CONTAS, 'utf8')) as Contas) : {};
}

/** Uma senha forte por conta, gerada aqui — nunca a `E2E_SENHA` da suíte. */
function senhaForte(): string {
  return `Qa-${randomBytes(9).toString('base64url')}9!`;
}

type Molde = {
  readonly chave: string;
  readonly nome: string;
  readonly papel: 'artista' | 'curador' | 'admin';
  readonly onboardingVisto: boolean;
};

/**
 * Cria a conta (ou devolve a da execução anterior, se ainda existir).
 *
 * Pela API de admin, como na suíte E2E: o `signUp` recusa o domínio não
 * roteável, e é ele que garante que nenhum e-mail sai para fora.
 */
export async function garantirConta(molde: Molde, carimbo: string): Promise<ContaQa> {
  const supabase = clienteDeServico();
  const contas = lerContas();
  const email = `qa_${molde.chave}_${carimbo}@${DOMINIO_QA}`;
  const senha = senhaForte();

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome_completo: molde.nome, aceite_termos: 'true' },
  });
  if (error !== null) throw new Error(`criar ${email}: ${error.message}`);
  const id = data.user.id;

  if (molde.papel === 'admin') {
    const papel = await supabase.from('papel_usuario').insert({ perfil_id: id, papel: 'admin' });
    if (papel.error !== null) throw new Error(`papel admin de ${email}: ${papel.error.message}`);
    const membro = await supabase.from('membro_admin').insert({
      perfil_id: id,
      cargo: 'QA de aceite',
      papel_admin: 'administrador',
      ativo: true,
    });
    if (membro.error !== null) throw new Error(`membro_admin de ${email}: ${membro.error.message}`);
  } else {
    const papel = await supabase
      .from('papel_usuario')
      .insert({ perfil_id: id, papel: molde.papel });
    if (papel.error !== null) throw new Error(`papel de ${email}: ${papel.error.message}`);
    if (molde.papel === 'artista') {
      const perfil = await supabase.from('perfil_artista').insert({ perfil_id: id });
      if (perfil.error !== null) throw new Error(`perfil_artista: ${perfil.error.message}`);
    }
  }

  if (molde.onboardingVisto) {
    await supabase
      .from('perfil')
      .update({ onboarding_visto_em: new Date().toISOString() })
      .eq('id', id);
  }

  const conta: ContaQa = {
    chave: molde.chave,
    id,
    email,
    senha,
    nome: molde.nome,
    papel: molde.papel,
  };
  contas[molde.chave] = conta;
  writeFileSync(CONTAS, JSON.stringify(contas, null, 2));
  return conta;
}

export function carimboDaRodada(): string {
  const agora = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(agora.getMonth() + 1)}${p(agora.getDate())}${p(agora.getHours())}${p(agora.getMinutes())}`;
}

// ------------------------------------------------------------ etapas e capturas

let sequencia = 0;

/**
 * Uma etapa da jornada: roda, tira a captura e registra o resultado.
 *
 * A falha é registrada **e** propagada — a jornada para onde quebrou, que é o
 * comportamento honesto para um QA de aceite.
 */
export async function etapa(
  page: Page,
  jornada: string,
  descricao: string,
  corpo: () => Promise<void>,
): Promise<void> {
  sequencia += 1;
  const id = String(sequencia).padStart(2, '0');
  const arquivo = `${id}-${jornada.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
  const inicio = Date.now();
  let erro: string | null = null;

  await test.step(`${jornada} · ${descricao}`, async () => {
    try {
      await corpo();
    } catch (e) {
      erro = e instanceof Error ? (e.message.split('\n')[0] ?? String(e)) : String(e);
      throw e;
    } finally {
      await page.screenshot({ path: join(CAPTURAS, arquivo), fullPage: false }).catch(() => {});
      appendFileSync(
        LOG,
        JSON.stringify({
          id,
          jornada,
          descricao,
          ok: erro === null,
          erro,
          ms: Date.now() - inicio,
          url: page.url(),
          captura: `capturas/${arquivo}`,
        }) + '\n',
      );
    }
  });
}

// ------------------------------------------------------- resiliência a 5xx

/**
 * Conta toda resposta 5xx de documento ou de Server Action dos dois domínios.
 *
 * No plano gratuito do Workers, ~10% das requisições estouram o limite de CPU
 * e voltam 503. O QA registra cada uma — é um achado, não ruído.
 */
export function vigiar5xx(page: Page, jornada: string): void {
  page.on('response', (resposta: Response) => {
    const status = resposta.status();
    if (status < 500) return;
    const url = new URL(resposta.url());
    const alvos = [process.env.BASE_URL, process.env.BASE_URL_ADMIN].map(
      (u) => new URL(u ?? 'http://x').host,
    );
    if (!alvos.includes(url.host)) return;
    appendFileSync(
      FALHAS_5XX,
      JSON.stringify({
        quando: new Date().toISOString(),
        jornada,
        status,
        metodo: resposta.request().method(),
        tipo: resposta.request().resourceType(),
        url: `${url.host}${url.pathname}`,
      }) + '\n',
    );
  });
}

/**
 * `goto` que tenta de novo em 5xx ou resposta vazia — até 4 vezes.
 *
 * É o que uma pessoa faz (recarregar). A tentativa extra fica registrada pela
 * vigia de 5xx, então o relatório mostra quantas recargas foram precisas.
 */
export async function irPara(page: Page, url: string): Promise<void> {
  const destino = new URL(url, process.env.BASE_URL).pathname;
  let ultimo = '';
  for (let tentativa = 1; tentativa <= 6; tentativa += 1) {
    try {
      const resposta = await page.goto(url, { waitUntil: 'load' });
      const caminho = new URL(page.url()).pathname;
      if (resposta !== null && resposta.status() >= 500) {
        ultimo = `HTTP ${resposta.status()}`;
      } else if (caminho !== destino && !destino.endsWith('/entrar')) {
        // A sessão "sumiu" nesta requisição: o middleware mandou ao login, ou
        // o login, vendo a sessão, mandou ao início. É o falso logout.
        ultimo = `desviado para ${caminho}`;
        registrarDesvio(url, caminho);
      } else if (await page.getByText('This page couldn’t load').isVisible()) {
        // O cliente do Next não carregou (um pedaço da página voltou 503).
        ultimo = 'tela "This page couldn’t load"';
        registrarDesvio(url, 'This page couldn’t load');
      } else {
        return;
      }
    } catch (e) {
      ultimo = e instanceof Error ? (e.message.split('\n')[0] ?? '') : String(e);
    }
    await page.waitForTimeout(1_000 * tentativa);
  }
  throw new Error(`${url} não abriu depois de 6 tentativas (${ultimo})`);
}

const DESVIOS = join(PASTA, 'desvios.jsonl');

export function registrarDesvio(url: string, caminho: string): void {
  appendFileSync(
    DESVIOS,
    JSON.stringify({ quando: new Date().toISOString(), url, caiu_em: caminho }) + '\n',
  );
}

/**
 * Clica num link e espera a tela de destino. Se a navegação do cliente não
 * acontecer (o pedaço da página voltou 5xx ou com a sessão "perdida"),
 * registra o desvio e abre o endereço do link direto — é o que a pessoa faz
 * ao clicar de novo ou recarregar.
 */
export async function clicarLink(page: Page, link: Locator, destino: RegExp): Promise<void> {
  const href = await link.getAttribute('href');
  await link.click();
  try {
    await page.waitForURL(destino, { timeout: 20_000 });
    return;
  } catch {
    registrarDesvio(`clique em ${href ?? 'link'} não navegou`, new URL(page.url()).pathname);
  }
  if (href === null) throw new Error('link sem href');
  await irPara(page, href);
  await page.waitForURL(destino);
}
