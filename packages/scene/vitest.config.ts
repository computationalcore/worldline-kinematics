/**
 * Vitest configuration for @worldline-kinematics/scene.
 *
 * Uses jsdom environment for React Three Fiber component testing.
 * Uses @react-three/test-renderer for testing 3D components without WebGL.
 *
 * Testing Strategy:
 * - Unit tests: Pure functions, helpers, type guards (high coverage expected)
 * - Component tests: React Three Test Renderer for scene graph assertions
 * - Visual tests: Playwright E2E for actual rendering (separate workflow)
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: [
      '__tests__/**/*.test.ts',
      '__tests__/**/*.test.tsx',
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
    ],
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/**/index.ts', // Barrel exports
        'src/**/index.tsx',
      ],
      // Coverage thresholds for testable code
      // Note: Visual shader code in R3F components is tested via E2E, not unit tests
      thresholds: {
        statements: 40,
        branches: 30,
        functions: 30,
        lines: 40,
      },
    },
  },
});
