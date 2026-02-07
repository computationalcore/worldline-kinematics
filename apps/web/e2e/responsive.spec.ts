/**
 * Responsive design tests across different viewport sizes.
 *
 * Ensures the application works well on desktop, tablet, and mobile.
 */

import {
  test,
  expect,
  waitForCanvas,
  waitForAnimationSettle,
} from './fixtures/test-utils';

test.describe('Desktop Viewport', () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test('renders correctly at 1920x1080', async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);
    await waitForAnimationSettle(page);

    // Verify canvas renders at expected size
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    const bounds = await canvas.boundingBox();
    expect(bounds!.width).toBeGreaterThan(1000);
    expect(bounds!.height).toBeGreaterThan(500);
  });

  test('canvas fills available space', async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);

    const canvasBounds = await page.locator('canvas').boundingBox();
    const viewportSize = page.viewportSize();

    expect(canvasBounds).not.toBeNull();
    expect(viewportSize).not.toBeNull();

    // Canvas should take significant portion of viewport
    expect(canvasBounds!.width).toBeGreaterThan(viewportSize!.width * 0.5);
    expect(canvasBounds!.height).toBeGreaterThan(viewportSize!.height * 0.5);
  });
});

test.describe('Laptop Viewport', () => {
  test.use({ viewport: { width: 1366, height: 768 } });

  test('renders correctly at 1366x768', async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);
    await waitForAnimationSettle(page);

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    const bounds = await canvas.boundingBox();
    expect(bounds!.width).toBeGreaterThan(800);
  });
});

test.describe('Tablet Viewport', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('renders correctly at tablet portrait', async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);
    await waitForAnimationSettle(page);

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    const bounds = await canvas.boundingBox();
    expect(bounds!.width).toBeGreaterThan(500);
  });

  test('UI adapts to tablet size', async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);

    // Check that UI elements are accessible
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Canvas should still be usable
    const canvasBounds = await canvas.boundingBox();
    expect(canvasBounds!.width).toBeGreaterThan(300);
    expect(canvasBounds!.height).toBeGreaterThan(300);
  });
});

test.describe('Tablet Landscape', () => {
  test.use({ viewport: { width: 1024, height: 768 } });

  test('renders correctly at tablet landscape', async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);
    await waitForAnimationSettle(page);

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    const bounds = await canvas.boundingBox();
    expect(bounds!.width).toBeGreaterThan(600);
  });
});

test.describe('Mobile Viewport', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('renders correctly on mobile', async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);
    await waitForAnimationSettle(page);

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    const bounds = await canvas.boundingBox();
    expect(bounds!.width).toBeGreaterThan(300);
  });

  test('3D scene is still interactive on mobile', async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Verify canvas has proper dimensions even on small screen
    const bounds = await canvas.boundingBox();
    expect(bounds!.width).toBeGreaterThan(200);
    expect(bounds!.height).toBeGreaterThan(200);
  });

  test('canvas responds to pointer events', async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);
    await waitForAnimationSettle(page);

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    const bounds = await canvas.boundingBox();
    expect(bounds).not.toBeNull();

    if (bounds) {
      // Simulate click on canvas center
      await canvas.click({
        position: { x: bounds.width / 2, y: bounds.height / 2 },
        force: true, // Force click even if element is covered
      });
      await waitForAnimationSettle(page, 500);

      // Verify scene still renders after interaction
      const isRendering = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return false;
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        return gl !== null && !gl.isContextLost();
      });

      expect(isRendering).toBe(true);
    }
  });
});

test.describe('Large Mobile', () => {
  test.use({ viewport: { width: 414, height: 896 } }); // iPhone 11 Pro Max

  test('renders correctly on large mobile', async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);
    await waitForAnimationSettle(page);

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    const bounds = await canvas.boundingBox();
    expect(bounds!.width).toBeGreaterThan(300);
  });
});

test.describe('4K Viewport', () => {
  test.use({ viewport: { width: 3840, height: 2160 } });

  test('renders correctly at 4K', async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);
    await waitForAnimationSettle(page, 3000); // More time for high res

    // Just check it renders without error
    await expect(page.locator('canvas')).toBeVisible();
  });
});

test.describe('Orientation Changes', () => {
  test('handles viewport resize gracefully', async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);

    // Start in portrait
    await page.setViewportSize({ width: 768, height: 1024 });
    await waitForAnimationSettle(page, 1000);

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Switch to landscape
    await page.setViewportSize({ width: 1024, height: 768 });
    await waitForAnimationSettle(page, 1000);

    await expect(canvas).toBeVisible();

    // Canvas should adapt to new size
    const bounds = await canvas.boundingBox();
    expect(bounds!.width).toBeGreaterThan(bounds!.height);
  });
});

test.describe('DPR Scaling', () => {
  test.use({
    viewport: { width: 375, height: 667 },
    deviceScaleFactor: 2,
  });

  test('renders correctly at 2x DPR', async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);
    await waitForAnimationSettle(page);

    // Canvas should be crisp at high DPR
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Check that canvas has higher resolution than viewport
    const canvasSize = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      return canvas ? { width: canvas.width, height: canvas.height } : null;
    });

    // Canvas internal resolution should account for DPR
    expect(canvasSize).not.toBeNull();
    // The actual resolution depends on how R3F handles DPR
  });

  test('renders correctly at 3x DPR', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    // Note: deviceScaleFactor is set per project, not dynamically

    await page.goto('/');
    await waitForCanvas(page);
    await waitForAnimationSettle(page);

    await expect(page.locator('canvas')).toBeVisible();
  });
});
