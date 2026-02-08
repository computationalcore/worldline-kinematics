# Contributing to Worldline Kinematics

Thank you for your interest in contributing to Worldline Kinematics.

## Development Setup

### Prerequisites

- Node.js >= 22.0.0
- pnpm >= 10.0.0

### Getting Started

```bash
# Clone the repository
git clone https://github.com/computationalcore/worldline-kinematics.git
cd worldline-kinematics

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Start development server
pnpm dev
```

### Project Structure

```
apps/
  web/              # Next.js reference application
packages/
  core/             # Physics engine (pure TypeScript, no React)
  astro/            # Ephemeris and visualization data
  scene/            # React Three Fiber 3D components
  ui/               # React UI components
docs/               # Physics and assumptions documentation
```

## Package Boundaries

These boundaries are strictly enforced:

- **core**: Pure TypeScript, no DOM or React dependencies. Must run in Node.js.
- **astro**: Astronomy data and transforms. May depend on astronomy-engine.
- **scene**: React/R3F only. No physics constants (gets data from core/astro).
- **ui**: React components, no WebGL.

## Code Standards

### TypeScript

- Strict mode enabled
- No `any` types
- Prefer discriminated unions for type safety
- All exports must be typed

### Physics Constants

Every physical constant must have:

1. A source citation in the code comment
2. An entry in `docs/ASSUMPTIONS.md`
3. Uncertainty bounds where applicable

```typescript
/**
 * Earth's sidereal rotation period in seconds.
 * Source: NIST (https://tf.nist.gov/general/pdf/1530.pdf)
 * Uncertainty: ~0.0001s
 */
export const SIDEREAL_DAY_SECONDS = 86164.0905;
```

### Testing

- All physics functions require golden value tests
- Use tolerance-based comparisons for floating-point:

```typescript
// Good
expect(spinVelocityKms(0)).toBeCloseTo(0.4651, 3);

// Bad (will fail due to floating-point)
expect(spinVelocityKms(0)).toBe(0.465101);
```

#### Test Commands

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run tests with interactive UI
pnpm test:ui

# Run tests for a specific package
pnpm --filter @worldline-kinematics/core test
pnpm --filter @worldline-kinematics/core test:coverage
```

#### Coverage Requirements

We maintain coverage thresholds per package based on testability characteristics:

| Package | Characteristics                       | Threshold | Target |
| ------- | ------------------------------------- | --------- | ------ |
| core    | Pure functions, deterministic physics | 80%       | 90%    |
| astro   | Data + Astronomy Engine integration   | 70%       | 80%    |
| scene   | R3F/Three.js components               | 50%       | 70%    |
| ui      | React + Radix components              | 60%       | 75%    |

**Justification:**

- **core**: All branches testable. Physics formulas have defined edge cases (poles, equator, date boundaries). Missing 10% covers unreachable defensive code.

- **astro**: Ephemeris provider has complex state. Core transforms (coordinate systems) should be 90%+, but provider initialization paths are integration-level.

- **scene**: WebGL mocking is brittle. Component logic (hooks, state) testable at 90%, but render output is better validated via visual regression or E2E.

- **ui**: Utility functions (formatters): 95%. Hooks: 85%. Radix-wrapped components: lower (Radix already tested).

Coverage is enforced in CI. As we add more tests, thresholds will be incrementally raised toward targets.

Coverage reports are generated in `packages/*/coverage/` directories:

- `coverage/index.html` - Interactive HTML report
- `coverage/lcov.info` - LCOV format for CI tools
- `coverage/coverage-final.json` - JSON format

#### Writing Effective Tests

```typescript
// Test structure
describe('spinVelocityKms', () => {
  // Golden value tests - known correct answers
  it('returns 0 at poles', () => {
    expect(spinVelocityKms(90)).toBeCloseTo(0, 5);
    expect(spinVelocityKms(-90)).toBeCloseTo(0, 5);
  });

  // Boundary conditions
  it('throws for invalid latitude', () => {
    expect(() => spinVelocityKms(100)).toThrow();
  });

  // Property-based tests
  it('velocity decreases from equator to poles', () => {
    const equator = spinVelocityKms(0);
    const midLat = spinVelocityKms(45);
    const pole = spinVelocityKms(90);
    expect(equator).toBeGreaterThan(midLat);
    expect(midLat).toBeGreaterThan(pole);
  });
});
```

### Commit Messages

We use conventional commits:

```
feat: add new feature
fix: fix a bug
docs: documentation changes
test: add or update tests
chore: maintenance tasks
refactor: code refactoring
```

## Pull Request Process

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes
4. Add a changeset: `pnpm changeset`
5. Run tests: `pnpm test`
6. Run typecheck: `pnpm typecheck`
7. Run lint: `pnpm lint`
8. Submit a pull request

### Changesets

For any changes to published packages, add a changeset:

```bash
pnpm changeset
```

Select the packages affected and describe the change. The changeset will be used to generate release notes.

## Questions?

Open an issue on GitHub for questions or discussions.
