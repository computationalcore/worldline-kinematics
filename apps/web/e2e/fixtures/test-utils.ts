/**
 * Shared test utilities for E2E tests.
 */

import { test as base, expect, Page } from '@playwright/test';

/**
 * Dismiss the onboarding modal if it appears.
 * The onboarding asks for birth date but has a Skip button.
 */
export async function dismissOnboarding(page: Page, timeout = 5000): Promise<void> {
  try {
    // Look for the skip button in the onboarding modal
    // The button text varies by locale, but it's the first button in the action area
    const skipButton = page
      .locator('button')
      .filter({ hasText: /skip|explore|pular/i })
      .first();

    // Wait a bit for modal to appear
    await page.waitForTimeout(500);

    if (await skipButton.isVisible({ timeout })) {
      await skipButton.click();
      // Wait for modal to disappear
      await page.waitForTimeout(500);
    }
  } catch {
    // Onboarding not shown or already dismissed
  }
}

/**
 * Wait for the Three.js canvas to be ready and rendered.
 * This waits for the canvas element and gives time for initial scene setup.
 */
export async function waitForCanvas(page: Page, timeout = 10000): Promise<void> {
  // Wait for canvas element to exist
  await page.waitForSelector('canvas', { timeout });

  // Dismiss onboarding modal if it appears
  await dismissOnboarding(page);

  // Wait for WebGL context to be ready (canvas should have dimensions)
  await page.waitForFunction(
    () => {
      const canvas = document.querySelector('canvas');
      return canvas && canvas.width > 0 && canvas.height > 0;
    },
    { timeout }
  );

  // Additional wait for scene initialization
  await page.waitForTimeout(1000);
}

/**
 * Wait for scene animations to settle.
 * Use after camera transitions or mode changes.
 */
export async function waitForAnimationSettle(page: Page, ms = 2000): Promise<void> {
  await page.waitForTimeout(ms);
}

/**
 * Get the canvas element locator.
 */
export function getCanvas(page: Page) {
  return page.locator('canvas').first();
}

/**
 * Screenshot options tuned for 3D scene comparison.
 * Uses higher tolerance due to rendering variance.
 *
 * Note: For animated 3D scenes, we use a longer timeout and
 * allow more pixel variance since the scene is continuously rendering.
 */
export const SCENE_SCREENSHOT_OPTIONS = {
  maxDiffPixelRatio: 0.05, // 5% pixel tolerance for animated 3D scenes
  threshold: 0.3, // Higher color threshold for lighting variance
  animations: 'disabled' as const,
  timeout: 30000, // 30s timeout for stability
};

/**
 * Screenshot options for UI elements (lower tolerance).
 */
export const UI_SCREENSHOT_OPTIONS = {
  maxDiffPixelRatio: 0.01,
  threshold: 0.1,
  animations: 'disabled' as const,
};

/**
 * Default test locations for consistent testing.
 */
export const TEST_LOCATIONS = {
  equator: { latitude: 0, longitude: 0 },
  sanFrancisco: { latitude: 37.7749, longitude: -122.4194 },
  tokyo: { latitude: 35.6762, longitude: 139.6503 },
  london: { latitude: 51.5074, longitude: -0.1278 },
  sydney: { latitude: -33.8688, longitude: 151.2093 },
  northPole: { latitude: 90, longitude: 0 },
  southPole: { latitude: -90, longitude: 0 },
};

/**
 * Default test dates for consistent testing.
 */
export const TEST_DATES = {
  // Vernal equinox 2024
  vernalEquinox: new Date('2024-03-20T03:06:00Z'),
  // Summer solstice 2024
  summerSolstice: new Date('2024-06-20T20:51:00Z'),
  // A fixed reference date for consistent tests
  reference: new Date('2024-01-15T12:00:00Z'),
};

/**
 * Extended test fixture with custom helpers.
 */
export const test = base.extend<{
  waitForSceneReady: () => Promise<void>;
}>({
  waitForSceneReady: async ({ page }, use) => {
    const waitFn = async () => {
      await waitForCanvas(page);
      await waitForAnimationSettle(page, 1500);
    };
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright fixture API, not a React hook
    await use(waitFn);
  },
});

export { expect };
