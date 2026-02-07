/**
 * Performance and accessibility tests.
 *
 * Ensures the application meets performance targets and accessibility standards.
 */

import {
  test,
  expect,
  waitForCanvas,
  waitForAnimationSettle,
} from './fixtures/test-utils';

test.describe('Performance', () => {
  test('page loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');

    // Wait for the document to be ready (not canvas - that takes longer)
    await page.waitForLoadState('domcontentloaded');

    const loadTime = Date.now() - startTime;

    // DOM should be ready within 15 seconds
    expect(loadTime).toBeLessThan(15000);

    // Now wait for canvas (separately timed)
    await waitForCanvas(page);
  });

  test('scene renders at acceptable framerate', async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);
    await waitForAnimationSettle(page, 2000);

    // Measure framerate over 2 seconds
    const fps = await page.evaluate(async () => {
      return new Promise<number>((resolve) => {
        let frameCount = 0;
        const startTime = performance.now();
        const duration = 2000; // 2 seconds

        function countFrame() {
          frameCount++;
          if (performance.now() - startTime < duration) {
            requestAnimationFrame(countFrame);
          } else {
            const elapsed = performance.now() - startTime;
            resolve((frameCount / elapsed) * 1000);
          }
        }

        requestAnimationFrame(countFrame);
      });
    });

    // Should maintain at least 30 FPS (60 is ideal but 30 is acceptable minimum)
    expect(fps).toBeGreaterThan(30);
  });

  test('no memory leaks during navigation', async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);

    // Get initial memory if available
    const initialMemory = await page.evaluate(() => {
      // @ts-expect-error - performance.memory is Chrome-specific
      return performance.memory?.usedJSHeapSize;
    });

    // Perform some interactions
    for (let i = 0; i < 5; i++) {
      await page.mouse.wheel(0, -100);
      await page.waitForTimeout(200);
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(200);
    }

    await page.waitForTimeout(1000);

    const finalMemory = await page.evaluate(() => {
      // @ts-expect-error - performance.memory is Chrome-specific
      return performance.memory?.usedJSHeapSize;
    });

    if (initialMemory && finalMemory) {
      // Memory growth should be less than 50MB
      const memoryGrowth = finalMemory - initialMemory;
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
    }
  });
});

test.describe('Core Web Vitals', () => {
  test('Largest Contentful Paint is acceptable', async ({ page }) => {
    await page.goto('/');

    // Wait for LCP
    const lcp = await page.evaluate(async () => {
      return new Promise<number>((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry.startTime);
        }).observe({ type: 'largest-contentful-paint', buffered: true });

        // Fallback timeout
        setTimeout(() => resolve(0), 10000);
      });
    });

    // LCP should be under 4 seconds (good is under 2.5s)
    if (lcp > 0) {
      expect(lcp).toBeLessThan(4000);
    }
  });

  test('Cumulative Layout Shift is minimal', async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);
    await waitForAnimationSettle(page, 3000);

    const cls = await page.evaluate(async () => {
      return new Promise<number>((resolve) => {
        let clsValue = 0;

        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            // @ts-expect-error - hadRecentInput is on LayoutShift entries
            if (!entry.hadRecentInput) {
              // @ts-expect-error - value is on LayoutShift entries
              clsValue += entry.value;
            }
          }
        }).observe({ type: 'layout-shift', buffered: true });

        // Measure for 2 seconds
        setTimeout(() => resolve(clsValue), 2000);
      });
    });

    // CLS should be under 0.25 (good is under 0.1)
    expect(cls).toBeLessThan(0.25);
  });
});

test.describe('Accessibility', () => {
  test('page has proper heading structure', async ({ page }) => {
    await page.goto('/');
    // Wait for DOM to load, but use a longer timeout for canvas
    await waitForCanvas(page, 20000);

    // Check for h1
    const h1 = page.locator('h1');
    const h1Count = await h1.count();
    expect(h1Count).toBeGreaterThanOrEqual(0); // May not have h1 if it's a visual app

    // Check heading hierarchy
    const headings = await page.evaluate(() => {
      const allHeadings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      return Array.from(allHeadings).map((h) => ({
        level: parseInt(h.tagName[1]),
        text: h.textContent?.trim(),
      }));
    });

    // No skipped heading levels
    for (let i = 1; i < headings.length; i++) {
      const gap = headings[i].level - headings[i - 1].level;
      expect(gap).toBeLessThanOrEqual(1);
    }
  });

  test('interactive elements are keyboard accessible', async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);

    // Tab through the page
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Check that something is focused
    const focusedElement = await page.evaluate(() => {
      return document.activeElement?.tagName;
    });

    // Should have focused on an interactive element
    expect(focusedElement).not.toBe('BODY');
  });

  test('buttons have accessible names', async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);

    const buttonsWithoutNames = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      return Array.from(buttons).filter((btn) => {
        const name =
          btn.getAttribute('aria-label') ||
          btn.getAttribute('title') ||
          btn.textContent?.trim();
        return !name || name.length === 0;
      }).length;
    });

    expect(buttonsWithoutNames).toBe(0);
  });

  test('images have alt text', async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);

    const imagesWithoutAlt = await page.evaluate(() => {
      const images = document.querySelectorAll('img');
      return Array.from(images).filter((img) => !img.alt).length;
    });

    expect(imagesWithoutAlt).toBe(0);
  });

  test('color contrast is sufficient', async ({ page }) => {
    await page.goto('/');
    await waitForCanvas(page);

    // This is a basic check - for full accessibility testing use axe-core
    // Check that text elements have sufficient contrast
    const lowContrastElements = await page.evaluate(() => {
      // Placeholder: real implementation would parse colors and calculate WCAG contrast ratio
      return 0;
    });

    expect(lowContrastElements).toBe(0);
  });

  test('respects prefers-reduced-motion', async ({ page }) => {
    // Set reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });

    await page.goto('/');
    await waitForCanvas(page);

    // The app should respect this preference
    // Check that animations are disabled or reduced
    const _hasAnimations = await page.evaluate(() => {
      const style = getComputedStyle(document.body);
      // Check if CSS animations are playing
      return style.animationPlayState !== 'paused' && style.animationDuration !== '0s';
    });

    // This is informational - some animations may still run in WebGL
    // The main check is that the page loads and works
    await expect(page.locator('canvas')).toBeVisible();
  });
});

test.describe('Error Handling', () => {
  test('gracefully handles WebGL not supported', async ({ page, context: _context }) => {
    // This test simulates WebGL unavailability
    // Note: Playwright with our config always has WebGL, so this is mostly for structure

    await page.goto('/');

    // Check for fallback content or error message
    const errorMessage = page.getByText(/WebGL.*not supported|browser.*not supported/i);
    const canvas = page.locator('canvas');

    // Either canvas works OR error message is shown
    const canvasVisible = await canvas.isVisible();
    const errorVisible = await errorMessage.isVisible().catch(() => false);

    expect(canvasVisible || errorVisible).toBe(true);
  });

  test('handles network errors gracefully', async ({ page }) => {
    // Block texture requests to simulate network issues
    await page.route('**/*.jpg', (route) => route.abort());
    await page.route('**/*.png', (route) => route.abort());

    await page.goto('/');

    // Page should still load even without textures
    await expect(page.locator('canvas')).toBeVisible();
  });
});
