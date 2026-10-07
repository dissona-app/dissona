import type { NextConfig } from 'next';

/**
 * O painel administrativo — app próprio, deploy próprio (painel.dissona.com.br).
 *
 * O limite de corpo das Server Actions é o mesmo do app principal, e pela mesma
 * razão: a foto do membro (27.1) sobe direto ao Storage, e o que sobra no corpo
 * é o caminho sem JavaScript. Ver o comentário em `apps/web/next.config.ts`.
 */
const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '8mb',
    },
    proxyClientMaxBodySize: '8mb',
  },
};

export default nextConfig;
