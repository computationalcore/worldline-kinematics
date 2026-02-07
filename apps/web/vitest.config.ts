/**
 * Vitest configuration for web app.
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'i18n/**/*.test.ts',
      'hooks/**/*.test.ts',
      'utils/**/*.test.ts',
      'contexts/**/*.test.tsx',
    ],
    exclude: ['node_modules/**', 'e2e/**', '.next/**', '**/*.spec.ts'],
    environment: 'jsdom',
  },
});
