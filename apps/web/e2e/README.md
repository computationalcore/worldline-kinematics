# E2E Tests

End-to-end and visual regression tests using Playwright.

## Directory Structure

```
e2e/
├── fixtures/           # Shared test utilities and data
│   └── test-utils.ts   # Common helpers, constants, custom fixtures
├── snapshots/          # Baseline screenshots (committed to git)
├── test-results/       # Test artifacts (gitignored)
├── solar-system.spec.ts      # 3D scene visual tests
├── camera-transitions.spec.ts # Camera and navigation tests
├── journey-calculator.spec.ts # UI component tests
├── performance.spec.ts        # Performance and accessibility
└── responsive.spec.ts         # Viewport/responsive tests
```

## Running Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run with UI (interactive mode)
pnpm test:e2e:ui

# Run in headed mode (see browser)
pnpm test:e2e:headed

# Debug a specific test
pnpm test:e2e:debug

# Run only Chromium tests
pnpm test:e2e:chromium

# View test report
pnpm test:e2e:report
```

## Updating Snapshots

When visual changes are intentional, update the baseline snapshots:

```bash
# Update all snapshots
pnpm test:e2e:update

# Update snapshots for specific test file
pnpm test:e2e -- --update-snapshots solar-system.spec.ts
```

## CI Consistency

Snapshots should be generated in Linux (matching CI) for consistency.

### Using Docker

```bash
# Build the Playwright Docker image
docker build -f Dockerfile.playwright -t worldline-playwright .

# Run tests in Docker
docker run --rm -v $(pwd):/app worldline-playwright

# Update snapshots in Docker (for CI consistency)
docker run --rm -v $(pwd):/app worldline-playwright pnpm test:e2e:update
```

### Local Development

On macOS/Windows, you may see snapshot differences due to:

- Font rendering differences
- GPU/WebGL implementation variations
- Antialiasing differences

For local development, focus on test logic rather than pixel-perfect matching.
Run snapshot updates in Docker before committing.

## WebGL Testing Notes

### Performance Flags

The Playwright config includes optimized Chrome flags for WebGL:

- `--use-angle=gl` - Use OpenGL for WebGL (critical for performance)
- `--enable-webgl` - Enable WebGL
- `--ignore-gpu-blocklist` - Allow GPU acceleration

### Visual Comparison Tolerance

3D rendering has inherent variance. Tests use relaxed comparison:

- `maxDiffPixelRatio: 0.02` - Allow 2% pixel difference
- `threshold: 0.2` - Per-pixel color tolerance

For stricter UI tests, use `UI_SCREENSHOT_OPTIONS` from test-utils.

## Writing Tests

### Wait for Scene Ready

Always wait for the WebGL scene to stabilize:

```typescript
import { waitForCanvas, waitForAnimationSettle } from './fixtures/test-utils';

test('example', async ({ page }) => {
  await page.goto('/');
  await waitForCanvas(page);
  await waitForAnimationSettle(page, 2000);

  // Now safe to take screenshots or interact
});
```

### Screenshot Best Practices

```typescript
import { SCENE_SCREENSHOT_OPTIONS, UI_SCREENSHOT_OPTIONS } from './fixtures/test-utils';

// For 3D canvas (higher tolerance)
await expect(canvas).toHaveScreenshot('scene.png', SCENE_SCREENSHOT_OPTIONS);

// For UI elements (lower tolerance)
await expect(button).toHaveScreenshot('button.png', UI_SCREENSHOT_OPTIONS);
```

## Debugging Failed Tests

1. **View the HTML report**:

   ```bash
   pnpm test:e2e:report
   ```

2. **Check artifacts**: Failed tests save screenshots, traces, and videos in `e2e/test-results/`

3. **Run in debug mode**:

   ```bash
   pnpm test:e2e:debug -- -g "test name"
   ```

4. **Use Playwright Inspector**:
   ```bash
   PWDEBUG=1 pnpm test:e2e
   ```
