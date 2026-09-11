import { defineConfig, devices } from '@playwright/test';

import { carregarEnvLocal } from './e2e/setup/ambiente';

// `E2E_SENHA` mora em `.env.local` (gitignored). O Next carrega esse arquivo
// para o servidor que ele sobe; o processo do Playwright é outro, e precisa da
// variável para preencher o login. Não sobrescreve o que já vem do ambiente,
// então o secret do job vence no CI.
carregarEnvLocal();

/**
 * Playwright — os 16 cenários do Guia de Testes da R2 (docs/R2/guia-de-testes-r2.md).
 *
 * `BASE_URL` aponta para o Preview do PR no CI (architecture.md §9); sem ela,
 * a suíte sobe o servidor local.
 */
/**
 * Porta propria, e nao a 3000: a suite tem de ser hermetica. Se outro projeto
 * estiver servindo a 3000 — e nesta maquina havia um — reusar o que estiver
 * la faz a suite testar o app errado e falhar com 404 confuso.
 */
const PORTA = 3100;
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${PORTA}`;
const noCI = process.env.CI === 'true' || process.env.CI === '1';

export default defineConfig({
  testDir: './e2e',
  // O produto foi construído e validado em 1280×800 (design-system.md §3.1).
  // Não há layout mobile definido — a pendência #24 continua aberta — então
  // não faz sentido uma matriz de viewports que ninguém desenhou ainda.
  use: {
    baseURL: BASE_URL,
    viewport: { width: 1280, height: 800 },
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  /*
   * A viewport é repetida aqui **depois** do spread de propósito.
   *
   * `devices['Desktop Chrome']` traz `viewport: 1280×720`, e o spread num
   * `use` de projeto vence o `use` global — então os 800 px de altura
   * declarados acima eram silenciosamente descartados, e a suíte rodava em 720.
   * Isso não é detalhe: a responsividade do R2 é toda `clamp()` em `vh`
   * (design-system §1.3), então cada 80 px de altura mudam o corpo de todo
   * título da tela.
   */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],

  /*
   * 15 s, e nao os 5 s padrao.
   *
   * Toda asserção desta suíte espera um round trip que sai de `gru1`, vai a
   * `us-west-2` e volta — e cada Server Action de pacote faz duas idas
   * (`tem_permissao` e a escrita). Com `fullyParallel` e um worker por núcleo,
   * quatro logins simultâneos passam folgadamente dos 5 s, e o sintoma é um
   * botão parado em "Entrando…" quando o login está apenas lento.
   *
   * Aumentar o timeout **não** esconde bug: um seletor errado falha por
   * "element not found" na mesma hora, e não por espera. O que 5 s escondia
   * era latência normal disfarçada de falha.
   */
  expect: { timeout: 15_000 },

  fullyParallel: true,
  // No CI, `test.only` esquecido num commit silenciaria a suíte inteira.
  forbidOnly: noCI,
  retries: noCI ? 1 : 0,
  workers: noCI ? 2 : undefined,
  reporter: noCI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  // Sobe o servidor só quando a suíte roda contra o local.
  ...(process.env.BASE_URL === undefined
    ? {
        webServer: {
          command: `pnpm build && pnpm start --port ${PORTA}`,
          url: BASE_URL,
          // Nunca reusar: um servidor alheio na porta silenciaria a suite.
          reuseExistingServer: false,
          timeout: 240_000,
        },
      }
    : {}),
});
