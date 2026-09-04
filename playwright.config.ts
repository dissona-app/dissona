import { defineConfig, devices } from '@playwright/test';

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
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

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
