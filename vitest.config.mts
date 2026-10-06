import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Resolve o alias `@/*` do tsconfig nativamente (dispensa vite-tsconfig-paths).
    tsconfigPaths: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: [
      'apps/*/src/**/*.{test,spec}.{ts,tsx}',
      'packages/*/**/*.{test,spec}.{ts,tsx}',
      'supabase/functions/**/*.test.ts',
    ],
    exclude: ['e2e/**', '**/node_modules/**'],
  },
});
