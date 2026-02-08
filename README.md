# Worldline Kinematics

TypeScript library for computing kinematic quantities in explicitly defined reference frames.

The library models each motion component as a velocity in a named reference frame (Earth rotation, heliocentric orbit, galactocentric orbit, CMB rest frame), computes path length by integrating speed over a time interval, and propagates uncertainty where applicable. All physical constants include source citations.

## Terminology: Worldline

A worldline is a curve in spacetime: `x^μ(τ) = (ct(τ), x(τ), y(τ), z(τ))`. Choosing a reference frame projects this 4D curve into a 3D position `r(t)` and velocity `v(t) = dr/dt`.

This library computes frame-relative 3-velocities and integrates speed over time:

```
ℓ_F = ∫ |v_F(t)| dt
```

This is the spatial path length in frame F, not proper time `dτ = dt√(1 - v²/c²)` or an invariant interval. At v << c, classical kinematics applies. Each velocity is labeled by its frame to prevent invalid scalar addition across frames.

## Installation

```bash
npm install @worldline-kinematics/core
# or
pnpm add @worldline-kinematics/core
```

## Usage

```typescript
import { computeWorldlineState } from '@worldline-kinematics/core';

const state = computeWorldlineState('1990-05-15', 45.0); // birthDate, latitude

console.log(state.frames.orbit.velocityKms); // 29.78
console.log(state.distances.orbit.pathLengthKm); // path length in km
console.log(state.frames.galaxy.uncertaintyKms); // 15 (measurement uncertainty)
```

## Packages

| Package                       | Description                                                                 |
| ----------------------------- | --------------------------------------------------------------------------- |
| `@worldline-kinematics/core`  | Frame-relative velocity and distance computations (pure TypeScript, no DOM) |
| `@worldline-kinematics/astro` | Ephemeris provider, coordinate transforms, scale mappings                   |
| `@worldline-kinematics/scene` | React Three Fiber components for 3D visualization                           |
| `@worldline-kinematics/ui`    | React UI components (inputs, modals, displays)                              |

## API

### `computeWorldlineState(birthDate, latitudeDeg, targetDate?): WorldlineState`

Main entry point. Returns velocities and path lengths for all four reference frames.

```typescript
interface WorldlineState {
  timestamp: Date;
  birthDate: Date;
  latitudeDeg: number;
  durationSeconds: number;
  frames: {
    spin: SpinFrameVelocity; // velocityKms, metadata.parallelRadiusKm
    orbit: OrbitFrameVelocity; // velocityKms, metadata.eccentricity
    galaxy: GalaxyFrameVelocity; // velocityKms, uncertaintyKms
    cmb: CMBFrameVelocity; // velocityKms, uncertaintyKms
  };
  distances: {
    spin: FrameDistance; // pathLengthKm, durationSeconds
    orbit: FrameDistance;
    galaxy: FrameDistance;
    cmb: FrameDistance;
  };
}
```

### Reference Frames

| Frame    | Description                                                  | Velocity    | Uncertainty   |
| -------- | ------------------------------------------------------------ | ----------- | ------------- |
| `spin`   | Tangential velocity from Earth rotation at observer latitude | 0-0.46 km/s | Negligible    |
| `orbit`  | Earth orbital velocity relative to Sun (heliocentric)        | 29.78 km/s  | < 0.01 km/s   |
| `galaxy` | Solar System velocity around galactic center                 | 220 km/s    | +/- 15 km/s   |
| `cmb`    | Solar System barycenter velocity relative to CMB rest frame  | 369.82 km/s | +/- 0.11 km/s |

### Individual Model Functions

```typescript
import {
  computeSpinVelocity,
  computeOrbitVelocity,
  computeGalaxyVelocity,
  computeCMBVelocity,
  spinDistanceKm,
  orbitDistanceKm,
  galaxyDistanceKm,
  cmbDistanceKm,
} from '@worldline-kinematics/core';
```

## Architecture

```
worldline-kinematics/
├── apps/
│   └── web/              # Next.js 15 reference application
├── packages/
│   ├── core/             # Physics engine (no React, no DOM)
│   ├── astro/            # Ephemeris, transforms, scale mappings
│   ├── scene/            # R3F 3D components
│   └── ui/               # React UI components
└── docs/
    ├── PHYSICS.md        # Model equations and derivations
    ├── ASSUMPTIONS.md    # Constants with sources and uncertainties
    └── ARCHITECTURE.md   # Package boundaries and data flow
```

Package dependency graph:

```
core (pure TS) <── astro <── scene
                      ↑        ↑
                      └── ui ──┘
                           ↑
                         web
```

## Development

### Prerequisites

- Node.js >= 22.0.0
- pnpm >= 10.0.0

### Setup

```bash
git clone https://github.com/computationalcore/worldline-kinematics.git
cd worldline-kinematics
pnpm install
pnpm build
```

### Commands

| Command          | Description                                           |
| ---------------- | ----------------------------------------------------- |
| `pnpm dev`       | Start development server (all packages in watch mode) |
| `pnpm build`     | Build all packages                                    |
| `pnpm test`      | Run tests                                             |
| `pnpm typecheck` | Type-check all packages                               |
| `pnpm lint`      | Run ESLint                                            |
| `pnpm changeset` | Create a changeset for versioning                     |
| `pnpm release`   | Build and publish packages                            |

### Testing

```bash
pnpm test        # Run all tests
pnpm test:watch  # Watch mode
```

| Package | Tests | Coverage                                |
| ------- | ----- | --------------------------------------- |
| core    | 80    | Golden value tests for all models       |
| astro   | 27    | Scale invariants, coordinate transforms |

## Constants and Sources

All physical constants are cited. See [ASSUMPTIONS.md](docs/ASSUMPTIONS.md) for the complete list.

| Constant                | Value                | Source   |
| ----------------------- | -------------------- | -------- |
| Sidereal day            | 86164.0905 s         | NIST     |
| Earth orbital velocity  | 29.78 km/s           | NASA     |
| Solar galactic velocity | 220 +/- 15 km/s      | JPL      |
| SSB-CMB velocity        | 369.82 +/- 0.11 km/s | PDG 2025 |

## Citation

```bibtex
@software{busquet2026worldline,
  author       = {Busquet, Vin},
  title        = {Worldline Kinematics},
  year         = {2026},
  url          = {https://github.com/computationalcore/worldline-kinematics},
  license      = {MIT}
}
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

MIT
