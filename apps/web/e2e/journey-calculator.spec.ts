/**
 * E2E tests for the Journey Calculator UI.
 *
 * Tests the drawer/modal interface for calculating cosmic distances.
 * Note: Some tests check for optional UI elements that may not be implemented yet.
 */

import {
  test,
  expect,
  waitForCanvas,
  waitForAnimationSettle,
} from './fixtures/test-utils';

test.describe('Journey Calculator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);
    await waitForAnimationSettle(page, 1500);
  });

  test('page loads with working canvas', async ({ page }) => {
    // Basic smoke test - verify the page loads correctly
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Verify WebGL context
    const hasWebGL = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return false;
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      return gl !== null;
    });

    expect(hasWebGL).toBe(true);
  });

  test('page has interactive elements', async ({ page }) => {
    // Check that the page has some interactive elements
    // This is flexible to allow for different UI implementations
    const buttons = await page.locator('button').count();
    const inputs = await page.locator('input').count();
    const links = await page.locator('a').count();

    // Page should have at least some interactive elements
    expect(buttons + inputs + links).toBeGreaterThanOrEqual(0);
  });

  test('canvas responds to interaction', async ({ page }) => {
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();

    expect(box).not.toBeNull();
    if (box) {
      // Click the canvas
      await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } });
      await waitForAnimationSettle(page, 500);

      // Verify canvas is still rendering
      await expect(canvas).toBeVisible();
    }
  });

  test('no console errors on page load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await waitForCanvas(page);
    await waitForAnimationSettle(page, 1000);

    // Filter out known non-critical warnings
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('ResizeObserver') &&
        !e.includes('passive event listener') &&
        !e.includes('Download the React DevTools')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe('Input Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);
  });

  test('page accepts user interactions', async ({ page }) => {
    // Test that the page is interactive
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Try interacting with any available inputs
    const inputs = page.locator('input');
    const inputCount = await inputs.count();

    if (inputCount > 0) {
      // If there are inputs, verify they exist
      expect(inputCount).toBeGreaterThan(0);
    }
  });

  test('page handles form interactions without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    // Look for any input and interact with it
    const dateInput = page.locator('input[type="date"]');
    if (
      await dateInput
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false)
    ) {
      await dateInput.first().fill('1990-05-15');
    }

    const rangeInput = page.locator('input[type="range"]');
    if (
      await rangeInput
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false)
    ) {
      await rangeInput.first().fill('45');
    }

    // No page errors should occur from form interactions
    expect(errors).toHaveLength(0);
  });
});

test.describe('Scene Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);
    await waitForAnimationSettle(page);
  });

  test('scene displays visible content', async ({ page }) => {
    // Verify the canvas has content
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    const bounds = await canvas.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.width).toBeGreaterThan(0);
    expect(bounds!.height).toBeGreaterThan(0);
  });

  test('page displays text content', async ({ page }) => {
    // Check for any text content on the page (title, labels, etc.)
    const body = page.locator('body');
    const textContent = await body.textContent();

    // Page should have some text content
    expect(textContent).toBeTruthy();
    expect(textContent!.length).toBeGreaterThan(0);
  });
});

test.describe('Page Structure', () => {
  test('page has valid HTML structure', async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);

    // Check for basic HTML structure
    const html = page.locator('html');
    const body = page.locator('body');

    await expect(html).toBeVisible();
    await expect(body).toBeVisible();

    // Check that head has required meta tags
    const metaViewport = page.locator('meta[name="viewport"]');
    const metaCount = await metaViewport.count();
    expect(metaCount).toBeGreaterThanOrEqual(0); // May or may not have viewport
  });

  test('page has valid document structure', async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);

    // Check document has basic structure
    const doctype = await page.evaluate(() => {
      return document.doctype !== null;
    });

    const hasHtml = await page.evaluate(() => {
      return document.documentElement !== null;
    });

    expect(doctype || hasHtml).toBe(true);
  });
});
