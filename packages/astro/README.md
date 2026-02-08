# @worldline-kinematics/astro

Ephemerides, physical data, and coordinate transforms for solar system visualization.

Zero React dependencies. Uses Astronomy Engine for ephemeris calculations.

## Installation

```bash
pnpm add @worldline-kinematics/astro
```

## Usage

```typescript
import {
  AstronomyEngineProvider,
  BODY_PHYSICAL_PROPS,
  getTruePhysicalMapping,
} from '@worldline-kinematics/astro';

const provider = new AstronomyEngineProvider();
const epoch = new Date();

// Get heliocentric state
const earthState = provider.getHeliocentricState('Earth', epoch, 'ECLIPJ2000');
console.log(earthState.position); // { x, y, z } in AU

// Get physical properties
const earthProps = BODY_PHYSICAL_PROPS.Earth;
console.log(earthProps.radiusMeanKm); // 6371.0

// Get render mapping
const mapping = getTruePhysicalMapping();
```

## Exports

### Types

- `BodyId` - `'Sun' | 'Mercury' | ... | 'Neptune' | 'Moon'`
- `PlanetId` - Eight major planets
- `Frame` - `'EQJ' | 'ECLIPJ2000'`
- `StateVectorPhysical` - Position/velocity with frame metadata
- `BodyPhysicalProps` - Mass, radius, rotation period
- `RenderMapping` - Distance and size scale configuration
- `CameraSemanticState` - Camera state in semantic units

### Physical Data

- `BODY_PHYSICAL_PROPS` - JPL physical parameters for all bodies
- `RING_SYSTEMS` - PDS ring data for Saturn, Jupiter, Uranus, Neptune
- `BELT_DEFINITIONS` - Main belt and Kuiper belt boundaries

### Ephemeris Provider

- `AstronomyEngineProvider` - Astronomy Engine wrapper
  - `getHeliocentricState(body, epoch, frame)`
  - `getGeocentricState(body, epoch, frame)`
  - `getAxisOrientation(body, epoch)`

### Scale Mappings

- `getTruePhysicalMapping()` - Geometrically accurate (sizes from distances)
- `getSchoolModelMapping()` - Compressed for overview
- `getTrueSizesMapping()` - Real planet ratios, log distances

### Frame Transforms

- `eqjToEcliptic(vec)` - J2000 equatorial to ecliptic
- `eclipticToThreeJs(vec)` - Ecliptic to Three.js coordinates

## Data Sources

- Physical parameters: [JPL SSD](https://ssd.jpl.nasa.gov/planets/phys_par.html)
- Ring data: [PDS Ring-Moon Systems Node](https://pds-rings.seti.org/)
- Ephemerides: [Astronomy Engine](https://github.com/cosinekitty/astronomy) (VSOP87)

## License

MIT
