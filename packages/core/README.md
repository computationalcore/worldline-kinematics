# @worldline-kinematics/core

Pure TypeScript physics engine for worldline kinematics calculations. Computes observer motion across multiple reference frames.

Zero React dependencies. Fully unit-testable in Node.js.

## Installation

```bash
pnpm add @worldline-kinematics/core
```

## Usage

```typescript
import { computeWorldlineState } from '@worldline-kinematics/core';

const state = computeWorldlineState(
  '1990-05-15', // birth date
  40.7128, // latitude (degrees)
  new Date() // target date
);

console.log(state.frames.spin.velocityKms); // ~0.35 km/s
console.log(state.frames.orbit.velocityKms); // ~29.78 km/s
console.log(state.frames.galaxy.velocityKms); // ~220 km/s
console.log(state.frames.cmb.velocityKms); // ~369.82 km/s
```

## Exports

### Main Function

- `computeWorldlineState(birthDate, latitudeDeg, targetDate)` - Complete worldline state

### Constants

Physical constants with source citations:

- `SIDEREAL_DAY_SECONDS` - Earth's sidereal rotation period
- `WGS84_SEMI_MAJOR_AXIS_M` - WGS84 equatorial radius
- `EARTH_ORBITAL_VELOCITY_KMS` - Mean orbital velocity
- `SOLAR_GALACTIC_VELOCITY_KMS` - Galactic orbital velocity
- `SSB_CMB_VELOCITY_KMS` - CMB rest frame velocity
- `SPEED_OF_LIGHT_KMS` - Speed of light

### Models

- `computeSpinVelocity(latitudeDeg)` - Earth rotation velocity
- `computeOrbitVelocity()` - Heliocentric orbital velocity
- `computeGalaxyVelocity()` - Galactocentric velocity
- `computeCMBVelocity(reference)` - CMB rest frame velocity

### Geo Utilities

- `computeParallelRadius(latitudeDeg)` - WGS84 parallel radius
- `getSeason(date, hemisphere)` - Current season
- `getSeasonDates(year)` - Equinox and solstice dates

### Time Utilities

- `computeDurationSeconds(birth, target)` - Elapsed time
- `parseDateInput(input)` - Parse date string or Date
- `getTimezoneFromCoordinates(lat, lon)` - Timezone lookup

### Unit Conversions

- `kmsToKmh(kms)` - km/s to km/h
- `kmsToMph(kms)` - km/s to mph
- `kmToAu(km)` - km to AU
- `kmToLightYears(km)` - km to light-years

### Types

- `ReferenceFrame` - `'spin' | 'orbit' | 'galaxy' | 'cmb'`
- `WorldlineState` - Complete state at a point in time
- `FrameVelocity` - Discriminated union of frame velocities
- `FrameDistance` - Distance traveled in a frame

## Reference Frames

| Frame  | Relative To              | Typical Speed       |
| ------ | ------------------------ | ------------------- |
| spin   | Earth surface (inertial) | 0.46 km/s (equator) |
| orbit  | Sun (heliocentric)       | 29.78 km/s          |
| galaxy | Milky Way center         | 220 km/s            |
| cmb    | CMB rest frame           | 369.82 km/s         |

## License

MIT
