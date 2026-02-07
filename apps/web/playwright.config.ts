/**
 * Playwright configuration for E2E and visual regression testing.
 *
 * Optimized for WebGL/Three.js canvas testing with proper GPU acceleration
 * and visual comparison tolerances for 3D rendering variance.
 */

import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: isCI,

  // Retry on CI only
  retries: isCI ? 2 : 0,

  // Opt out of parallel tests on CI for consistent snapshots
  workers: isCI ? 1 : undefined,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ...(isCI ? [['github'] as const] : []),
  ],

  // Shared settings for all projects
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure (useful for debugging animations)
    video: 'on-first-retry',
  },

  // Configure projects for major browsers
  // Note: WebGL testing is only reliable in Chromium headless mode
  // Firefox and WebKit have issues with WebGL in headless environments
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // WebGL optimization flags for headless Chrome
        launchOptions: {
          args: [
            '--headless=new',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--use-angle=gl', // Use OpenGL for WebGL (critical for performance)
            '--enable-webgl',
            '--enable-webgl2',
            '--ignore-gpu-blocklist',
            '--enable-gpu-rasterization',
            '--enable-zero-copy',
            '--disable-gpu-sandbox',
          ],
        },
        // Larger viewport for solar system visualization
        viewport: { width: 1280, height: 720 },
      },
    },
    // Firefox and WebKit disabled - WebGL not reliable in headless mode
    // Uncomment to test locally with headed mode:
    // {
    //   name: 'firefox',
    //   use: {
    //     ...devices['Desktop Firefox'],
    //     viewport: { width: 1280, height: 720 },
    //     launchOptions: {
    //       firefoxUserPrefs: {
    //         'webgl.force-enabled': true,
    //         'webgl.disabled': false,
    //       },
    //     },
    //   },
    // },
    // {
    //   name: 'webkit',
    //   use: {
    //     ...devices['Desktop Safari'],
    //     viewport: { width: 1280, height: 720 },
    //   },
    // },
  ],

  // Run local dev server before starting tests
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !isCI,
    timeout: 120 * 1000, // 2 minutes for Next.js compilation
  },

  // Snapshot configuration for visual regression testing
  expect: {
    // Timeout for assertions
    timeout: 10000,

    // Visual comparison settings - tuned for 3D rendering variance
    toHaveScreenshot: {
      // Allow some pixel variance due to antialiasing and GPU differences
      maxDiffPixelRatio: 0.02, // Allow 2% of pixels to differ
      threshold: 0.2, // Per-pixel color threshold (0-1)

      // Animation handling
      animations: 'disabled',

      // Scale for high-DPI displays
      scale: 'device',
    },

    toMatchSnapshot: {
      maxDiffPixelRatio: 0.02,
      threshold: 0.2,
    },
  },

  // Output directories
  outputDir: 'e2e/test-results',
  snapshotDir: 'e2e/snapshots',
  snapshotPathTemplate: '{snapshotDir}/{testFilePath}/{arg}{ext}',
});
