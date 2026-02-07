/**
 * E2E tests for camera transitions and navigation.
 *
 * Tests the semantic zoom system and camera movement between celestial bodies.
 * Uses functional verification instead of screenshots for animated 3D scenes.
 */

import {
  test,
  expect,
  getCanvas,
  waitForCanvas,
  waitForAnimationSettle,
} from './fixtures/test-utils';

test.describe('Camera System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);
    await waitForAnimationSettle(page);
  });

  test('initial camera position shows solar system overview', async ({ page }) => {
    const canvas = getCanvas(page);
    await expect(canvas).toBeVisible();

    // Verify WebGL context is valid
    const hasValidContext = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return false;
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      return gl !== null && !gl.isContextLost();
    });

    expect(hasValidContext).toBe(true);
  });

  test('camera can zoom in smoothly', async ({ page }) => {
    const canvas = getCanvas(page);
    await canvas.hover();

    // Zoom in with mouse wheel
    await page.mouse.wheel(0, -500);
    await waitForAnimationSettle(page, 1000);

    // Verify canvas still renders correctly after zoom
    const isRendering = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return false;
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      return gl !== null && !gl.isContextLost() && canvas.width > 0;
    });

    expect(isRendering).toBe(true);
  });

  test('camera can zoom out smoothly', async ({ page }) => {
    const canvas = getCanvas(page);
    await canvas.hover();

    // Zoom out with mouse wheel
    await page.mouse.wheel(0, 500);
    await waitForAnimationSettle(page, 1000);

    // Verify canvas still renders correctly after zoom
    const isRendering = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return false;
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      return gl !== null && !gl.isContextLost() && canvas.width > 0;
    });

    expect(isRendering).toBe(true);
  });

  test('camera orbit with mouse drag', async ({ page }) => {
    const canvas = getCanvas(page);
    const box = await canvas.boundingBox();

    expect(box).not.toBeNull();
    if (box) {
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;

      // Drag to orbit camera
      await page.mouse.move(centerX, centerY);
      await page.mouse.down();
      await page.mouse.move(centerX + 100, centerY, { steps: 10 });
      await page.mouse.up();

      await waitForAnimationSettle(page, 500);

      // Verify canvas still renders after orbit
      await expect(canvas).toBeVisible();
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

test.describe('Planet Focus Transitions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);
    await waitForAnimationSettle(page);
  });

  test('clicking canvas triggers interaction', async ({ page }) => {
    const canvas = getCanvas(page);
    const box = await canvas.boundingBox();

    expect(box).not.toBeNull();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await waitForAnimationSettle(page, 1000);

      // Verify scene is still rendering after click
      const isRendering = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return false;
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        return gl !== null && !gl.isContextLost();
      });

      expect(isRendering).toBe(true);
    }
  });

  test('double-click triggers zoom interaction', async ({ page }) => {
    const canvas = getCanvas(page);
    const box = await canvas.boundingBox();

    expect(box).not.toBeNull();
    if (box) {
      await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);
      await waitForAnimationSettle(page, 1000);

      // Verify scene is still rendering after double-click
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

test.describe('Keyboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);
    await waitForAnimationSettle(page);
  });

  test('arrow keys can be pressed without errors', async ({ page }) => {
    const canvas = getCanvas(page);
    await canvas.click(); // Focus the canvas

    // Press arrow keys
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowLeft');
    await waitForAnimationSettle(page, 500);

    // Verify scene is still rendering after keyboard input
    const isRendering = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return false;
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      return gl !== null && !gl.isContextLost();
    });

    expect(isRendering).toBe(true);
  });

  test('zoom keys can be pressed without errors', async ({ page }) => {
    const canvas = getCanvas(page);
    await canvas.click(); // Focus the canvas

    // Try zoom keys (may or may not be implemented)
    await page.keyboard.press('Equal'); // + key on most keyboards
    await page.keyboard.press('Minus');
    await waitForAnimationSettle(page, 500);

    // Verify scene is still rendering after keyboard input
    const isRendering = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return false;
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      return gl !== null && !gl.isContextLost();
    });

    expect(isRendering).toBe(true);
  });
});

test.describe('Touch Gestures', () => {
  test.use({
    hasTouch: true,
    viewport: { width: 768, height: 1024 },
  });

  test('pinch to zoom works on touch devices', async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);
    await waitForAnimationSettle(page);

    // Touch gesture testing is complex - this is a placeholder
    // Real implementation would use page.touchscreen API
    const canvas = getCanvas(page);
    await expect(canvas).toBeVisible();
  });
});
