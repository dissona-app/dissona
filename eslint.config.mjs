import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    // Monorepo: o plugin do Next procura `pages`/`app` em cada app.
    settings: { next: { rootDir: ['apps/*/'] } },
    rules: {
      // architecture.md §8: TypeScript strict, sem `any`.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Scripts de linha de comando: a saída no console É a interface deles.
    files: ['scripts/**/*.mjs'],
    rules: { 'no-console': 'off' },
  },
  globalIgnores([
    '**/.next/**',
    '**/out/**',
    '**/build/**',
    '**/next-env.d.ts',
    '**/lib/supabase/tipos-bd.ts',
    'docs/**',
    // Entrypoint de Edge Function: runtime Deno, com `Deno.serve` e import por
    // URL. O `userinfo.ts` ao lado continua sob o lint — é código nosso, puro.
    'supabase/functions/**/index.ts',
  ]),
]);

export default eslintConfig;
