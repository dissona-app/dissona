import { defineCloudflareConfig } from '@opennextjs/cloudflare';

/**
 * `buildCommand` explícito porque o script `build` deste app **é** o build do
 * OpenNext (`opennextjs-cloudflare build`): sem isto o OpenNext chamaria
 * `pnpm build` de novo, em laço. Assim os comandos padrão do Workers Builds
 * (`pnpm run build` + `npx wrangler deploy`) funcionam sem ajuste no painel.
 */
export default {
  ...defineCloudflareConfig({}),
  buildCommand: 'pnpm exec next build',
};
