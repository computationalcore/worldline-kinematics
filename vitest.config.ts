/**
 * Base vitest configuration for worldline-kinematics.
 *
 * This config is extended by vitest.workspace.ts for package-specific settings.
 * Coverage uses v8 provider for native Node.js coverage support.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use globals for cleaner test syntax (describe, it, expect)
    globals: true,

    // Default environment (overridden per package in workspace)
    environment: 'node',

    // Reporter configuration
    reporters: ['default'],

    // Fail fast on first error in CI
    bail: process.env.CI ? 1 : 0,

    // Coverage configuration
    coverage: {
      // Use v8 for native coverage (faster than istanbul)
      provider: 'v8',

      // Output formats:
      // - text: console summary
      // - json: machine-readable for CI tools
      // - html: detailed interactive report
      // - lcov: for codecov/coveralls integration
      reporter: ['text', 'json', 'html', 'lcov'],

      // Output directory
      reportsDirectory: './coverage',

      // Fail if coverage drops below thresholds
      thresholds: {
        // Global defaults (packages override these)
        statements: 50,
        branches: 50,
        functions: 50,
        lines: 50,
      },

      // Files to include in coverage
      include: ['src/**/*.ts', 'src/**/*.tsx'],

      // Files to exclude from coverage
      exclude: [
        // Test files
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        '**/*.spec.tsx',

        // Type definitions
        '**/types.ts',
        '**/types/*.ts',
        '**/*.d.ts',

        // Index/barrel files (just re-exports)
        '**/index.ts',

        // Entry points
        '**/*-entry.ts',

        // Config files
        '**/*.config.ts',
        '**/*.config.js',
      ],

      // Show uncovered lines in console output
      all: true,

      // Clean coverage directory before running
      clean: true,

      // Skip files with 100% coverage from reports (reduces noise)
      skipFull: false,
    },

    // Timeout for individual tests
    testTimeout: 10000,

    // Timeout for hooks (beforeAll, afterAll, etc.)
    hookTimeout: 10000,
  },
});
