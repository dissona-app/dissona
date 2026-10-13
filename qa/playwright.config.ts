import { defineConfig, devices } from '@playwright/test';

import { carregarEnvLocal } from '../e2e/setup/ambiente';

carregarEnvLocal();

/**
 * QA de aceite em produção — jornadas de ponta a ponta, em série, com uma
 * captura de tela por etapa (`qa/resultado/`, gitignored).
 *
 *   pnpm qa                                  # dissona.com.br + painel.dissona.com.br
 *   BASE_URL=… BASE_URL_ADMIN=… pnpm qa      # outro ambiente
 *
 * Diferente da suíte E2E: aqui não há cenário isolado por requisito, e sim a
 * história de uso inteira — o artista compra e envia, o curador avalia, o
 * admin publica o pacote que o artista compra. As contas `qa_*` **ficam** no
 * banco ao fim, para a demonstração.
 */
process.env.BASE_URL ??= 'https://dissona.com.br';
process.env.BASE_URL_ADMIN ??= 'https://painel.dissona.com.br';

export default defineConfig({
  testDir: '.',
  testMatch: /.*\.qa\.ts$/,
  outputDir: './resultado/artefatos',
  timeout: 600_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: './resultado/resultado.json' }]],
  use: {
    baseURL: process.env.BASE_URL,
    viewport: { width: 1280, height: 800 },
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    navigationTimeout: 60_000,
    actionTimeout: 30_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
});
